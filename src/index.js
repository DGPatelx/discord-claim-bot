require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getChannelConfig, hasUserClaimed, markUserClaimed } = require('./utils/dataStore');

// Load environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ Missing BOT_TOKEN environment variable');
    console.log('Set it in Railway or in a .env file');
    process.exit(1);
}

// Create Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel] // Required for DM support
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`📝 Loaded command: ${command.data.name}`);
    }
}

// Bot ready event
client.once('ready', () => {
    console.log(`\n✅ Bot is online as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
    console.log('🔍 Monitoring channels for claim patterns...\n');
});

// Handle slash commands and modals
client.on('interactionCreate', async (interaction) => {
    // Handle modal submissions
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'sticky_modal') {
            try {
                const stickyCommand = client.commands.get('sticky');
                if (!stickyCommand) return;

                const title = interaction.fields.getTextInputValue('sticky_title');
                const content = interaction.fields.getTextInputValue('sticky_content');
                let color = interaction.fields.getTextInputValue('sticky_color') || '#5865F2';

                // Validate color format
                if (!color.startsWith('#')) color = '#' + color;
                if (!/^#[0-9A-Fa-f]{6}$/.test(color)) color = '#5865F2';

                // Create embed
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(content)
                    .setColor(color)
                    .setFooter({ text: '📌 Sticky Message' })
                    .setTimestamp();

                // Send initial sticky message
                const stickyMsg = await interaction.channel.send({ embeds: [embed] });

                // Store sticky info
                stickyCommand.stickyMessages.set(interaction.channel.id, {
                    title,
                    content,
                    color,
                    messageId: stickyMsg.id,
                    lastSent: Date.now(),
                    messageCount: 0
                });

                await interaction.reply({
                    content: `✅ Sticky message created in <#${interaction.channel.id}>!\n\n📌 It will be re-sent every **5 messages** or **15 seconds**.`,
                    ephemeral: true
                });

                console.log(`📌 Sticky created in #${interaction.channel.name}`);
            } catch (error) {
                console.error('Error creating sticky:', error);
                await interaction.reply({
                    content: '❌ Failed to create sticky message.',
                    ephemeral: true
                });
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        const reply = {
            content: '❌ An error occurred while executing this command.',
            ephemeral: true
        };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

// Handle messages for claim monitoring and sticky messages
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

    // === STICKY MESSAGE HANDLING ===
    const stickyCommand = client.commands.get('sticky');
    if (stickyCommand) {
        const sticky = stickyCommand.stickyMessages.get(message.channel.id);
        if (sticky) {
            sticky.messageCount++;
            const now = Date.now();
            const timeSinceLastSend = now - sticky.lastSent;

            // Resend if 5 messages OR 15 seconds have passed
            if (sticky.messageCount >= 5 || timeSinceLastSend >= 15000) {
                try {
                    // Delete old sticky message
                    if (sticky.messageId) {
                        try {
                            const oldMessage = await message.channel.messages.fetch(sticky.messageId);
                            await oldMessage.delete();
                        } catch (e) {
                            // Message might already be deleted
                        }
                    }

                    // Create new embed
                    const embed = new EmbedBuilder()
                        .setTitle(sticky.title)
                        .setDescription(sticky.content)
                        .setColor(sticky.color)
                        .setFooter({ text: '📌 Sticky Message' })
                        .setTimestamp();

                    // Send new sticky
                    const newMessage = await message.channel.send({ embeds: [embed] });

                    // Update sticky info
                    sticky.messageId = newMessage.id;
                    sticky.lastSent = now;
                    sticky.messageCount = 0;
                } catch (error) {
                    console.error('Error resending sticky:', error);
                }
            }
        }
    }

    // === CLAIM MONITORING ===
    // Check if this channel has claim monitoring configured
    const config = await getChannelConfig(message.channel.id);
    if (!config) return;

    // Check if message contains the URL pattern (case-insensitive, anywhere in message)
    const messageContent = message.content.toLowerCase();
    const urlPattern = config.urlPattern.toLowerCase();

    if (!messageContent.includes(urlPattern)) return;

    // Check if user has already claimed in this channel
    if (await hasUserClaimed(message.channel.id, message.author.id)) {
        console.log(`⏭️ User ${message.author.tag} already claimed in #${message.channel.name}`);
        return;
    }

    // Try to send DM to user
    try {
        await message.author.send(config.claimMessage);

        // Mark user as claimed
        await markUserClaimed(message.channel.id, message.author.id, message.author.tag);

        console.log(`✅ Sent claim DM to ${message.author.tag} from #${message.channel.name}`);
    } catch (error) {
        // User might have DMs disabled
        console.error(`❌ Could not DM ${message.author.tag}:`, error.message);
    }
});

// Login to Discord
client.login(BOT_TOKEN);
