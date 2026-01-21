const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { removeChannelConfig, resetClaimedUsers, getChannelConfig } = require('../utils/dataStore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claimremove')
        .setDescription('Remove claim monitoring from a channel')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to remove monitoring from')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName('reset_claims')
                .setDescription('Also reset the list of users who have already claimed (default: false)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if user is the admin
        const adminUserIds = process.env.ADMIN_USER_ID ? process.env.ADMIN_USER_ID.split(',').map(id => id.trim()) : [];
        if (adminUserIds.length > 0 && !adminUserIds.includes(interaction.user.id)) {
            return interaction.reply({
                content: '❌ You are not authorized to use this command.',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        const resetClaims = interaction.options.getBoolean('reset_claims') || false;

        try {
            await interaction.deferReply({ ephemeral: true });
            const config = await getChannelConfig(channel.id);

            if (!config) {
                await interaction.editReply({
                    content: `❌ No claim monitoring is configured for <#${channel.id}>.`
                });
                return;
            }

            await removeChannelConfig(channel.id);

            let response = `✅ Claim monitoring removed from <#${channel.id}>.`;

            if (resetClaims) {
                await resetClaimedUsers(channel.id);
                response += '\n🔄 Claimed users list has been reset.';
            }

            await interaction.editReply({
                content: response
            });
        } catch (error) {
            console.error('Error removing claim monitoring:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ Failed to remove claim monitoring. Please try again.'
                });
            } else {
                await interaction.reply({
                    content: '❌ Failed to remove claim monitoring. Please try again.',
                    ephemeral: true
                });
            }
        }
    }
};
