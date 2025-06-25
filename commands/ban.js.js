const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { MongoClient } = require('mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from using BloxRoll')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The Roblox username to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();
        let client;

        try {
            // Connect to MongoDB
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });
            const db = client.db('test');

            const username = interaction.options.getString('username');
            const reason = interaction.options.getString('reason');

            // Find user
            const user = await db.collection('users').findOne({
                username: { $regex: new RegExp(`^${username}$`, 'i') }
            });

            if (!user) {
                return await interaction.editReply({
                    content: `❌ User ${username} not found in BloxyCoins database.`
                }).catch(console.error);
            }

            // Add ban record
            await db.collection('bans').insertOne({
                userId: user.robloxId,
                username: user.username,
                reason: reason,
                bannedBy: interaction.user.id,
                bannedAt: new Date(),
                active: true
            });

            // Update user record
            await db.collection('users').updateOne(
                { _id: user._id },
                { 
                    $set: { 
                        banned: true,
                        banReason: reason,
                        banDate: new Date()
                    }
                }
            );

            const embed = new EmbedBuilder()
                .setTitle('User Banned')
                .setDescription(`Successfully banned ${user.username} from BloxyCoins`)
                .addFields(
                    { name: 'Username', value: user.username, inline: true },
                    { name: 'Roblox ID', value: user.robloxId, inline: true },
                    { name: 'Reason', value: reason },
                    { name: 'Banned By', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setColor('#ff0000')
                .setTimestamp();

            return await interaction.editReply({ embeds: [embed] }).catch(console.error);
        } catch (error) {
            console.error('Error executing ban command:', error);
            return await interaction.editReply('❌ An error occurred while banning the user.').catch(console.error);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (error) {
                    console.error('Error closing MongoDB connection:', error);
                }
            }
        }
    },
}; 