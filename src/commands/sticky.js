const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

// In-memory storage for sticky messages (channelId -> { content, messageId, lastSent, messageCount })
const stickyMessages = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sticky')
        .setDescription('Create a sticky message in the current channel'),

    async execute(interaction) {
        // Check if user is the admin
        const adminUserId = process.env.ADMIN_USER_ID;
        if (adminUserId && interaction.user.id !== adminUserId) {
            return interaction.reply({
                content: '❌ You are not authorized to use this command.',
                ephemeral: true
            });
        }

        // Create modal for sticky message input
        const modal = new ModalBuilder()
            .setCustomId('sticky_modal')
            .setTitle('Create Sticky Message');

        // Title input
        const titleInput = new TextInputBuilder()
            .setCustomId('sticky_title')
            .setLabel('Embed Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter the title for the sticky embed')
            .setRequired(true)
            .setMaxLength(256);

        // Message content input
        const contentInput = new TextInputBuilder()
            .setCustomId('sticky_content')
            .setLabel('Message Content')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter the message content (supports basic markdown)')
            .setRequired(true)
            .setMaxLength(4000);

        // Color input (optional)
        const colorInput = new TextInputBuilder()
            .setCustomId('sticky_color')
            .setLabel('Embed Color (hex, e.g. #FF5733)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#5865F2')
            .setRequired(false)
            .setMaxLength(7);

        // Add inputs to modal
        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(contentInput),
            new ActionRowBuilder().addComponents(colorInput)
        );

        await interaction.showModal(modal);
    },

    // Export sticky messages map for use in index.js
    stickyMessages,

    // Helper to create and send sticky embed
    async sendStickyEmbed(channel, title, content, color) {
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(content)
            .setColor(color || '#5865F2')
            .setFooter({ text: '📌 Sticky Message' })
            .setTimestamp();

        return await channel.send({ embeds: [embed] });
    },

    // Check if sticky needs to be resent
    async checkAndResendSticky(channel) {
        const sticky = stickyMessages.get(channel.id);
        if (!sticky) return;

        const now = Date.now();
        const timeSinceLastSend = now - sticky.lastSent;

        // Resend if 5 messages OR 15 seconds have passed
        if (sticky.messageCount >= 5 || timeSinceLastSend >= 15000) {
            try {
                // Delete old sticky message
                if (sticky.messageId) {
                    try {
                        const oldMessage = await channel.messages.fetch(sticky.messageId);
                        await oldMessage.delete();
                    } catch (e) {
                        // Message might already be deleted
                    }
                }

                // Send new sticky
                const newMessage = await this.sendStickyEmbed(
                    channel,
                    sticky.title,
                    sticky.content,
                    sticky.color
                );

                // Update sticky info
                sticky.messageId = newMessage.id;
                sticky.lastSent = now;
                sticky.messageCount = 0;
            } catch (error) {
                console.error('Error resending sticky:', error);
            }
        }
    }
};
