require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!BOT_TOKEN || !CLIENT_ID) {
    console.error('❌ Missing BOT_TOKEN or CLIENT_ID environment variables');
    console.log('Set them in Railway or in a .env file');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`📝 Loaded command: ${command.data.name}`);
    }
}

const rest = new REST().setToken(BOT_TOKEN);

(async () => {
    try {
        console.log(`\n🔄 Registering ${commands.length} slash commands...`);

        // Register commands globally
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log(`✅ Successfully registered ${data.length} commands globally!`);
        console.log('\nNote: Global commands may take up to 1 hour to appear in all servers.');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
