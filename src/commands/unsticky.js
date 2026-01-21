const { SlashCommandBuilder } = require('discord.js');
const { stickyMessages } = require('./sticky');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unsticky')
        .setDescription('Remove the sticky message from the current channel'),

    async execute(interaction) {
        // Check if user is the admin
        const adminUserId = process.env.ADMIN_USER_ID;
        if (adminUserId && interaction.user.id !== adminUserId) {
            return interaction.reply({
                content: '❌ You are not authorized to use this command.',
                ephemeral: true
            });
        }

        const channelId = interaction.channel.id;
        const sticky = stickyMessages.get(channelId);

        if (!sticky) {
            return interaction.reply({
                content: '❌ No sticky message is set for this channel.',
                ephemeral: true
            });
        }

        // Try to delete the current sticky message
        try {
            if (sticky.messageId) {
                const message = await interaction.channel.messages.fetch(sticky.messageId);
                await message.delete();
            }
        } catch (e) {
            // Message might already be deleted
        }

        // Remove from map
        stickyMessages.delete(channelId);

        await interaction.reply({
            content: `✅ Sticky message removed from <#${channelId}>`,
            ephemeral: true
        });

        console.log(`🗑️ Sticky removed from #${interaction.channel.name}`);
    }
};
