const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { addChannelConfig } = require('../utils/dataStore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Set up claim monitoring for a channel')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to monitor for URL patterns')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('url_pattern')
                .setDescription('URL pattern to match (e.g., https://assets.chromastudio.ai/)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('claim_message')
                .setDescription('Message to send in DM when pattern is matched')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if user is the admin
        const adminUserId = process.env.ADMIN_USER_ID;
        if (adminUserId && interaction.user.id !== adminUserId) {
            return interaction.reply({
                content: '❌ You are not authorized to use this command.',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        const urlPattern = interaction.options.getString('url_pattern');
        const claimMessage = interaction.options.getString('claim_message');

        try {
            // Save the configuration
            await interaction.deferReply({ ephemeral: true });
            await addChannelConfig(channel.id, urlPattern, claimMessage);

            await interaction.editReply({
                content: `✅ **Claim monitoring configured!**\n\n` +
                    `📍 **Channel:** <#${channel.id}>\n` +
                    `🔗 **URL Pattern:** \`${urlPattern}\`\n` +
                    `💬 **Claim Message:** ${claimMessage}\n\n` +
                    `Users who post messages containing the URL pattern will receive a DM (once per user).`
            });
        } catch (error) {
            console.error('Error setting up claim monitoring:', error.message);
            console.error('Full error:', error);
            const errorReply = {
                content: '❌ Failed to set up claim monitoring. Please try again.',
                ephemeral: true
            };
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorReply);
            } else {
                await interaction.reply(errorReply);
            }
        }
    }
};
