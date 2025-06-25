require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, Events, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { calculateTax, formatTaxMessage } = require('./src/utils/tax');

// Bot configuration
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const TAX_CHANNEL_ID = process.env.DISCORD_TAX_CHANNEL_ID;

if (!BOT_TOKEN) {
  console.error('Missing DISCORD_BOT_TOKEN in environment variables');
  process.exit(1);
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel]
});

// Create commands collection
client.commands = new Collection();
const commands = [];

// Set up command handler
const commandsPath = path.join(__dirname, 'commands');
try {
  // Create commands directory if it doesn't exist
  if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
    
    // Create a sample ping command
    const pingCommand = 
`const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async execute(interaction) {
    await interaction.reply('Pong!');
  },
};`;

    fs.writeFileSync(path.join(commandsPath, 'ping.js'), pingCommand);
    
    // Create a status command
    const statusCommand = 
`const { SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { formatValue } = require('../src/utils/formatters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check the current status of BloxRoll games'),
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get stats from database
      const db = mongoose.connection.db;
      
      // Get active games count
      const activeGamesCount = await db.collection('coinflips').countDocuments({ state: 'active' });
      
      // Get total wagered value
      const allGames = await db.collection('coinflips').find({}).toArray();
      const totalWagered = allGames.reduce((sum, game) => sum + (game.value || 0), 0);
      
      // Get biggest win in the last 24 hours
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentGames = await db.collection('coinflips').find({ 
        state: 'completed',
        endedAt: { $gte: last24Hours }
      }).sort({ value: -1 }).limit(1).toArray();
      
      const biggestWin = recentGames.length > 0 ? recentGames[0].value : 0;
      
      // Format the status message
      const statusEmbed = {
        color: 0xFFB800,
        title: '🎲 BloxRoll Status',
        fields: [
          {
            name: 'Active Games',
            value: activeGamesCount.toString(),
            inline: true
          },
          {
            name: 'Total Wagered',
            value: formatValue(totalWagered),
            inline: true
          },
          {
            name: 'Biggest Win (24h)',
            value: formatValue(biggestWin),
            inline: true
          }
        ],
        timestamp: new Date(),
        footer: {
          text: 'BloxRoll Bot'
        }
      };
      
      await interaction.editReply({ embeds: [statusEmbed] });
    } catch (error) {
      console.error('Error fetching status:', error);
      await interaction.editReply('There was an error fetching the status.');
    }
  },
};`;

    fs.writeFileSync(path.join(commandsPath, 'status.js'), statusCommand);
  }

  // Register commands
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
      console.log(`Registered command: ${command.data.name}`);
    } else {
      console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
} catch (error) {
  console.error('Error setting up commands:', error);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch(err => {
  console.error('Failed to connect to MongoDB', err);
});

// Register commands with Discord
const rest = new REST().setToken(BOT_TOKEN);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    if (GUILD_ID) {
      // Guild commands
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands },
      );
      console.log(`Successfully registered guild commands for guild: ${GUILD_ID}`);
    } else {
      // Global commands
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands },
      );
      console.log('Successfully registered global application commands.');
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();

// Event handlers
client.once(Events.ClientReady, () => {
  console.log(`Discord bot is ready! Logged in as ${client.user.tag}`);
  client.user.setActivity('Coinflip Games', { type: 'WATCHING' });
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const reply = { content: 'There was an error executing this command!', ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(BOT_TOKEN).catch(console.error);

// Function to format currency value with appropriate suffix
const formatValue = (value) => {
  if (value >= 1000000000) {
    return `R$${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `R$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `R$${(value / 1000).toFixed(2)}K`;
  }
  return `R$${value.toFixed(2)}`;
};

// Add tax notification function
const sendTaxNotification = async (game) => {
  try {
    const taxChannel = await client.channels.fetch(TAX_CHANNEL_ID);
    if (!taxChannel) {
      console.error('Tax channel not found');
      return;
    }

    // Get user data from stored game data
    const creatorName = game.creatorData ? game.creatorData.displayName : game.creator;
    const joinerName = game.joinerData ? game.joinerData.displayName : game.joiner;
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle('🎲 Coinflip Game Completed')
      .setDescription(`${joinerName} vs ${creatorName}\nTotal Pot: ${formatValue(game.totalValue)}`)
      .addFields(
        { name: 'Winner', value: game.winner === game.creator ? creatorName : joinerName },
        { name: 'Winning Side', value: game.winnerSide.charAt(0).toUpperCase() + game.winnerSide.slice(1) }
      );

    // Add tax information if available
    if (game.taxedItems && game.taxedItems.length > 0) {
      // Format tax items with proper spacing and alignment
      const taxItemsList = game.taxedItems.map(item => 
        `• ${item.name} - ${formatValue(item.value)}`
      ).join('\n');

      // Calculate total tax percentage
      const taxPercentage = ((game.totalTaxValue / game.totalValue) * 100).toFixed(2);

      embed.addFields(
        { name: 'Tax Collected:', value: taxItemsList },
        { name: 'Total Tax:', value: `${formatValue(game.totalTaxValue)} (${taxPercentage}%)` }
      );
    }

    // Set thumbnail to winner's avatar if available
    const winnerAvatar = game.winner === game.creator ? game.creatorAvatar : game.joinerAvatar;
    if (winnerAvatar) {
      embed.setThumbnail(winnerAvatar);
    }

    await taxChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending tax notification:', error);
  }
};

// Export for use in routes
module.exports = {
  sendTaxNotification
}; 