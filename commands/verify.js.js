const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const mongoose = require('mongoose');

// Roblox API endpoints
const ROBLOX_API = {
    USERS_ENDPOINT: 'https://users.roblox.com/v1/usernames/users',
    USER_DETAILS_ENDPOINT: 'https://users.roblox.com/v1/users/',
    THUMBNAILS_ENDPOINT: 'https://thumbnails.roblox.com/v1/users/avatar-headshot'
};

// Store pending verifications
const pendingVerifications = new Map();

async function getUserInfo(username) {
    try {
        const userResponse = await axios.post(ROBLOX_API.USERS_ENDPOINT, {
            usernames: [username],
            excludeBannedUsers: false
        }, {
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!userResponse.data.data.length) {
            return null;
        }

        const userId = userResponse.data.data[0].id;

        const [detailsResponse, thumbnailResponse] = await Promise.all([
            axios.get(`${ROBLOX_API.USER_DETAILS_ENDPOINT}${userId}`),
            axios.get(`${ROBLOX_API.THUMBNAILS_ENDPOINT}?userIds=${userId}&size=150x150&format=png`)
        ]);

        return {
            id: userId,
            name: detailsResponse.data.name,
            displayName: detailsResponse.data.displayName,
            description: detailsResponse.data.description,
            created: detailsResponse.data.created,
            isBanned: detailsResponse.data.isBanned,
            avatar: thumbnailResponse.data.data[0].imageUrl
        };
    } catch (error) {
        console.error('Error fetching user info:', error);
        throw new Error('Failed to fetch user information');
    }
}

async function genPhrase() {
    try {
        const response = await axios.get("https://random-word-api.herokuapp.com/word?number=5", {
            timeout: 5000
        });
        const words = response.data;
        return `BLOXYCOINS-${words.join('-').toUpperCase()}`;
    } catch (error) {
        console.error('Error generating phrase:', error);
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(7).toUpperCase();
        return `BLOXYCOINS-${timestamp}-${random}`;
    }
}

async function verifyUserCode(userId, verificationCode) {
    try {
        const response = await axios.get(`${ROBLOX_API.USER_DETAILS_ENDPOINT}${userId}`);
        const description = response.data.description || '';
        return description.includes(verificationCode);
    } catch (error) {
        console.error('Error verifying user code:', error);
        throw new Error('Failed to verify user code');
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Link your Roblox account')
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription('Your Roblox username')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const username = interaction.options.getString('username');
            const userInfo = await getUserInfo(username);

            if (!userInfo) {
                await interaction.reply({
                    content: '❌ Roblox user not found',
                    ephemeral: true
                });
                return;
            }

            const verificationPhrase = await genPhrase();
            
            // Store verification data
            pendingVerifications.set(interaction.user.id, {
                userInfo,
                verificationPhrase,
                timestamp: Date.now()
            });

            const embed = new EmbedBuilder()
                .setTitle('🔗 Account Verification')
                .setColor(0x2B2D31)
                .setDescription(`Please follow these steps to verify your Roblox account:
                    
1. Go to your Roblox Profile
2. Click the "Edit Description" button
3. Add this code to your description:
\`\`\`
${verificationPhrase}
\`\`\`
4. Save your profile
5. Click the "Check Verification" button below

The code will expire in 15 minutes.`)
                .addFields(
                    { name: 'Roblox Username', value: userInfo.name, inline: true },
                    { name: 'Display Name', value: userInfo.displayName, inline: true },
                    { name: 'User ID', value: userInfo.id.toString(), inline: true }
                )
                .setThumbnail(userInfo.avatar)
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('verify_check')
                        .setLabel('Check Verification')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✅')
                );

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error starting verification:', error);
            await interaction.reply({
                content: '❌ An error occurred while starting verification',
                ephemeral: true
            });
        }
    },

    async handleButton(interaction) {
        if (interaction.customId !== 'verify_check') return;

        try {
            const pendingVerification = pendingVerifications.get(interaction.user.id);

            if (!pendingVerification) {
                await interaction.update({
                    content: '❌ No pending verification found. Please start the verification process with `/verify`',
                    embeds: [],
                    components: [],
                    ephemeral: true
                });
                return;
            }

            // Check if verification has expired (15 minutes)
            if (Date.now() - pendingVerification.timestamp > 15 * 60 * 1000) {
                pendingVerifications.delete(interaction.user.id);
                await interaction.update({
                    content: '❌ Verification code has expired. Please start over with `/verify`',
                    embeds: [],
                    components: [],
                    ephemeral: true
                });
                return;
            }

            // Check if code is in profile
            const isVerified = await verifyUserCode(
                pendingVerification.userInfo.id,
                pendingVerification.verificationPhrase
            );

            if (!isVerified) {
                await interaction.update({
                    content: '❌ Verification code not found in your profile. Please make sure you added it correctly.',
                    components: [interaction.message.components[0]], // Keep the button
                    ephemeral: true
                });
                return;
            }

            // Connect to MongoDB
            const db = mongoose.connection.db;
            const usersCollection = db.collection('users');
            const usedCodesCollection = db.collection('usedCodes');

            // Check if code has been used
            const existingCode = await usedCodesCollection.findOne({
                code: pendingVerification.verificationPhrase
            });

            if (existingCode) {
                await interaction.update({
                    content: '❌ This verification code has already been used',
                    embeds: [],
                    components: [],
                    ephemeral: true
                });
                return;
            }

            // Update or create user document
            const userInfo = pendingVerification.userInfo;
            await usersCollection.updateOne(
                { robloxId: userInfo.id.toString() },
                {
                    $set: {
                        robloxId: userInfo.id.toString(),
                        username: userInfo.name,
                        displayName: userInfo.displayName,
                        avatar: userInfo.avatar,
                        discordId: interaction.user.id,
                        discordTag: interaction.user.tag,
                        lastLogin: new Date()
                    },
                    $setOnInsert: {
                        createdAt: new Date()
                    }
                },
                { upsert: true }
            );

            // Mark verification code as used
            await usedCodesCollection.insertOne({
                code: pendingVerification.verificationPhrase,
                userId: userInfo.id.toString(),
                discordId: interaction.user.id,
                usedAt: new Date()
            });

            // Create inventory if it doesn't exist
            const inventoriesCollection = db.collection('inventories');
            await inventoriesCollection.updateOne(
                { robloxId: userInfo.id.toString() },
                {
                    $setOnInsert: {
                        username: userInfo.name,
                        displayName: userInfo.displayName,
                        avatar: userInfo.avatar,
                        mm2Items: [],
                        ps99Items: [],
                        stats: {
                            mm2: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
                            ps99: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
                            overall: { totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 }
                        }
                    }
                },
                { upsert: true }
            );

            // Clear pending verification
            pendingVerifications.delete(interaction.user.id);

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Account Verified!')
                .setColor(0x2B2D31)
                .setDescription(`Successfully linked your Discord account to Roblox account: **${userInfo.name}**`)
                .setThumbnail(userInfo.avatar)
                .addFields(
                    { name: 'Roblox Username', value: userInfo.name, inline: true },
                    { name: 'Display Name', value: userInfo.displayName, inline: true },
                    { name: 'Discord Tag', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            // Update the message with success embed
            await interaction.update({
                content: '✅ Verification successful!',
                embeds: [successEmbed],
                components: [],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error checking verification:', error);
            await interaction.update({
                content: '❌ An error occurred while checking verification',
                components: [interaction.message.components[0]], // Keep the button for retry
                ephemeral: true
            });
        }
    }
}; 