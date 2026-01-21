const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getAllChannelConfigs, getClaimedCount } = require('../utils/dataStore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claimstatus')
        .setDescription('View all active claim monitoring configurations')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const configs = await getAllChannelConfigs();
            const channelIds = Object.keys(configs);

            if (channelIds.length === 0) {
                await interaction.editReply({
                    content: '📭 No claim monitoring configurations set up yet.\n\nUse `/claim` to configure a channel.'
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Claim Monitoring Status')
                .setColor(0x5865F2)
                .setTimestamp();

            for (const channelId of channelIds) {
                const config = configs[channelId];
                const claimedCount = await getClaimedCount(channelId);

                embed.addFields({
                    name: `<#${channelId}>`,
                    value: `🔗 **Pattern:** \`${config.urlPattern}\`\n` +
                        `💬 **Message:** ${config.claimMessage.substring(0, 100)}${config.claimMessage.length > 100 ? '...' : ''}\n` +
                        `👥 **Claims Sent:** ${claimedCount}`,
                    inline: false
                });
            }

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error getting claim status:', error);
            await interaction.editReply({
                content: '❌ Failed to get claim status. Please try again.'
            });
        }
    }
};
