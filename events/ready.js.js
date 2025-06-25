const { Events, PermissionsBitField } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    
    try {
      // Wait a bit for guild cache
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get all guilds
      const guilds = Array.from(client.guilds.cache.values());
      console.log(`Found ${guilds.length} guilds`);
      
      if (guilds.length === 0) {
        console.error('❌ Bot is not in any guilds');
        return;
      }

      // Use the first guild
      const guild = guilds[0];
      console.log(`Selected guild: ${guild.name}`);

      // Check bot permissions
      const botMember = guild.members.cache.get(client.user.id);
      if (!botMember.permissions.has(PermissionsBitField.Flags.CreateInstantInvite)) {
        console.error('❌ Bot does not have permission to create invites');
        return;
      }

      // Find a suitable channel
      const channel = guild.channels.cache.find(ch => 
        ch.type === 0 && // Text channel
        ch.permissionsFor(client.user).has(PermissionsBitField.Flags.CreateInstantInvite)
      );

      if (!channel) {
        console.error('❌ No suitable channel found with proper permissions');
        return;
      }

      console.log(`Creating invite in channel: ${channel.name}`);

      // Create the invite
      const invite = await channel.createInvite({
        maxAge: 0,
        maxUses: 0,
        unique: true,
        reason: 'Website permanent invite'
      });

      // Store globally
      global.discordInviteUrl = invite.url;
      
      console.log('✅ Successfully created invite:', invite.url);
      console.log(`Channel: ${channel.name}`);
      console.log(`Guild: ${guild.name}`);
      
    } catch (error) {
      console.error('❌ Error in ready event:', error);
    }
  },
}; 