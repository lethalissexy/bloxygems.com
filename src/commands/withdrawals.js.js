const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Withdraw = require('../models/Withdraw');

let trackingMessage = null;
let trackingInterval = null;

async function createWithdrawalsEmbed() {
    // Fetch all pending withdrawals
    const pendingWithdrawals = await Withdraw.find({ status: 'pending' }).sort({ createdAt: -1 });
    
    const embed = new EmbedBuilder()
        .setTitle('🔄 Pending Withdrawals')
        .setColor('#FFD700')
        .setTimestamp();

    if (pendingWithdrawals.length === 0) {
        embed.setDescription('No pending withdrawals');
        return { embed, withdrawals: [] };
    }

    let description = '';
    for (const withdrawal of pendingWithdrawals) {
        const itemsList = withdrawal.items.map(item => `${item.name} (💎 ${formatValue(item.value)})`).join('\n');
        
        description += `**User:** ${withdrawal.username}\n`;
        description += `**Total Value:** 💎 ${formatValue(withdrawal.totalValue)}\n`;
        description += `**Items:**\n${itemsList}\n`;
        description += `**Created:** <t:${Math.floor(new Date(withdrawal.createdAt).getTime() / 1000)}:R>\n`;
        description += `**ID:** \`${withdrawal._id}\`\n\n`;
    }

    embed.setDescription(description);
    return { embed, withdrawals: pendingWithdrawals };
}

function formatValue(value) {
    if (value >= 1000000000) {
        return (value / 1000000000).toFixed(1) + 'B';
    } else if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
}

async function updateTrackingMessage(interaction, initialMessage = false) {
    try {
        const { embed, withdrawals } = await createWithdrawalsEmbed();

        // Create buttons for each withdrawal
        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;

        for (const withdrawal of withdrawals) {
            if (buttonCount === 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonCount = 0;
            }

            currentRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`paid_${withdrawal._id}`)
                    .setLabel(`Mark Paid #${buttonCount + 1}`)
                    .setStyle(ButtonStyle.Success)
            );

            buttonCount++;
        }

        if (buttonCount > 0) {
            rows.push(currentRow);
        }

        const messageOptions = {
            embeds: [embed],
            components: rows
        };

        if (initialMessage || !trackingMessage) {
            trackingMessage = await interaction.channel.send(messageOptions);
        } else {
            try {
                await trackingMessage.edit(messageOptions);
            } catch (error) {
                if (error.code === 10008) { // Unknown Message error
                    trackingMessage = await interaction.channel.send(messageOptions);
                } else {
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error('Error updating tracking message:', error);
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
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ 
                content: 'You need administrator permissions to use this command.',
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'track') {
            // Clear any existing tracking
            if (trackingInterval) {
                clearInterval(trackingInterval);
            }
            if (trackingMessage) {
                try {
                    await trackingMessage.delete();
                } catch (error) {
                    // Ignore if message was already deleted
                }
            }

            // Start new tracking
            await interaction.deferReply({ ephemeral: true });
            await updateTrackingMessage(interaction, true);
            
            trackingInterval = setInterval(() => {
                updateTrackingMessage(interaction);
            }, 60000); // Update every minute

            await interaction.editReply('Started tracking withdrawals in this channel.');
        } else if (subcommand === 'stop') {
            if (trackingInterval) {
                clearInterval(trackingInterval);
                trackingInterval = null;
            }
            if (trackingMessage) {
                try {
                    await trackingMessage.delete();
                } catch (error) {
                    // Ignore if message was already deleted
                }
                trackingMessage = null;
            }
            await interaction.reply({ 
                content: 'Stopped tracking withdrawals.',
                ephemeral: true 
            });
        }
    },

    async handleButton(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ 
                content: 'You need administrator permissions to use this button.',
                ephemeral: true 
            });
        }

        const [action, withdrawalId] = interaction.customId.split('_');
        
        if (action === 'paid') {
            try {
                const withdrawal = await Withdraw.findById(withdrawalId);
                if (!withdrawal) {
                    return interaction.reply({
                        content: 'Withdrawal not found. It may have been already processed.',
                        ephemeral: true
                    });
                }

                if (withdrawal.status === 'paid') {
                    return interaction.reply({
                        content: 'This withdrawal has already been marked as paid.',
                        ephemeral: true
                    });
                }

                // Update the withdrawal status
                withdrawal.status = 'paid';
                withdrawal.paidAt = new Date();
                await withdrawal.save();

                // Update the tracking message
                await updateTrackingMessage(interaction);

                await interaction.reply({
                    content: `Marked withdrawal ${withdrawalId} as paid!`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error marking withdrawal as paid:', error);
                await interaction.reply({
                    content: 'An error occurred while marking the withdrawal as paid.',
                    ephemeral: true
                });
            }
        }
    }
}; 