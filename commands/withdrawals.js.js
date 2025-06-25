const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mongoose = require('mongoose');
const { formatValue } = require('../src/utils/formatters');

let trackingMessages = new Map();

function formatItems(items) {
    // Group items by name and value
    const grouped = new Map();
    for (const item of items) {
        const key = `${item.name}-${item.value}`;
        if (!grouped.has(key)) {
            grouped.set(key, { ...item, count: 1 });
        } else {
            grouped.get(key).count++;
        }
    }

    // Sort items by value (highest first)
    const sortedItems = Array.from(grouped.values())
        .sort((a, b) => b.value - a.value);

    // Format items into strings with counts
    return sortedItems.map(item => {
        const countText = item.count > 1 ? ` x${item.count}` : '';
        return `• ${item.name}${countText} - ${formatValue(item.value)}`;
    }).join('\n');
}

async function createWithdrawalEmbed(withdrawal) {
    const embed = new EmbedBuilder()
        .setTitle(`🔄 Withdrawal Request | ${withdrawal.username}`)
        .setColor(0x2B2D31)
        .setDescription(formatItems(withdrawal.items))
        .addFields(
            { 
                name: 'Total Value', 
                value: formatValue(withdrawal.totalValue), 
                inline: true 
            },
            { 
                name: 'Created', 
                value: `<t:${Math.floor(new Date(withdrawal.createdAt).getTime() / 1000)}:R>`, 
                inline: true 
            },
            {
                name: 'ID',
                value: `\`${withdrawal._id}\``,
                inline: true
            }
        )
        .setTimestamp();

    return embed;
}

async function updateTrackingMessages(interaction, initialMessage = false) {
    try {
        // Delete all existing messages first
        for (const [_, messageId] of trackingMessages) {
            try {
                const message = await interaction.channel.messages.fetch(messageId);
                await message.delete();
            } catch (error) {
                // Ignore if message was already deleted
            }
        }
        trackingMessages.clear();

        // Fetch all pending withdrawals
        const withdrawals = await mongoose.connection.db.collection('withdraws')
            .find({ status: 'pending' })
            .sort({ totalValue: -1 }) // Sort by total value, highest first
            .toArray();

        if (withdrawals.length === 0) {
            if (initialMessage) {
                await interaction.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('🔄 Pending Withdrawals')
                            .setColor(0x2B2D31)
                            .setDescription('No pending withdrawals')
                            .setTimestamp()
                    ]
                });
            }
            return;
        }

        // Create new messages for each withdrawal
        for (const withdrawal of withdrawals) {
            try {
                const embed = await createWithdrawalEmbed(withdrawal);
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`paid_${withdrawal._id}`)
                            .setLabel('✅ Mark as Paid')
                            .setStyle(ButtonStyle.Success)
                    );

                const message = await interaction.channel.send({
                    embeds: [embed],
                    components: [row]
                });
                trackingMessages.set(withdrawal._id.toString(), message.id);
            } catch (error) {
                console.error(`Error handling withdrawal ${withdrawal._id}:`, error);
            }
        }
    } catch (error) {
        console.error('Error updating tracking messages:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdrawals')
        .setDescription('Track pending withdrawals')
        .addSubcommand(subcommand =>
            subcommand
                .setName('track')
                .setDescription('Start tracking withdrawals in this channel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop tracking withdrawals')),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            await interaction.reply({ 
                content: 'You need administrator permissions to use this command.',
                ephemeral: true 
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'track') {
            await interaction.deferReply({ ephemeral: true });

            // Start new tracking
            await updateTrackingMessages(interaction, true);
            
            if (global.withdrawalInterval) {
                clearInterval(global.withdrawalInterval);
            }
            
            global.withdrawalInterval = setInterval(() => {
                updateTrackingMessages(interaction);
            }, 60000); // Update every minute

            await interaction.editReply('Started tracking withdrawals in this channel.');
        } else if (subcommand === 'stop') {
            // Clear interval
            if (global.withdrawalInterval) {
                clearInterval(global.withdrawalInterval);
                global.withdrawalInterval = null;
            }

            // Delete all tracking messages
            for (const [_, messageId] of trackingMessages) {
                try {
                    const message = await interaction.channel.messages.fetch(messageId);
                    await message.delete();
                } catch (error) {
                    // Ignore if message was already deleted
                }
            }
            trackingMessages.clear();

            await interaction.reply({ 
                content: 'Stopped tracking withdrawals.',
                ephemeral: true 
            });
        }
    },

    async handleButton(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            await interaction.reply({ 
                content: 'You need administrator permissions to use this button.',
                ephemeral: true 
            });
            return;
        }

        const [action, withdrawalId] = interaction.customId.split('_');
        
        if (action === 'paid') {
            try {
                // Delete from MongoDB using direct collection access
                await mongoose.connection.db.collection('withdraws').deleteOne(
                    { _id: new mongoose.Types.ObjectId(withdrawalId) }
                );

                // Delete the message from Discord
                const messageId = trackingMessages.get(withdrawalId);
                if (messageId) {
                    const message = await interaction.channel.messages.fetch(messageId);
                    await message.delete();
                    trackingMessages.delete(withdrawalId);
                }

                await interaction.reply({ content: '✅ Withdrawal deleted!', ephemeral: true });
            } catch (error) {
                console.error('Error:', error);
                await interaction.reply({ content: '❌ Failed to delete withdrawal', ephemeral: true });
            }
        }
    }
}; 