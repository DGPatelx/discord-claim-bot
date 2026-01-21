# Discord Claim Bot

A Discord bot that monitors channels for URL patterns and sends DM claim links to users (one-time per user per channel).

## Features

- **`/claim`** - Configure a channel to monitor for URL patterns
- **`/claimstatus`** - View all active monitoring configurations
- **`/claimremove`** - Remove monitoring from a channel
- **Notion Integration** - Stores all data in Notion databases

## Setup

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to **Bot** section → Click "Add Bot"
4. **Important:** Enable "Message Content Intent" under Privileged Gateway Intents
5. Copy the bot token

### 2. Configure Notion

You need 2 Notion databases.

**Database 1: Channel Configurations**
- `Channel ID` (Title)
- `URL Pattern` (Text)
- `Claim Message` (Text)
- `Created At` (Date)

**Database 2: Claimed Users**
- `Entry ID` (Title)
- `Channel ID` (Text)
- `User ID` (Text)
- `Username` (Text)
- `Claimed At` (Date)

Create a Notion Integration at https://www.notion.so/my-integrations and share both databases with the integration.

### 3. Deploy to Railway

1. Push this code to a GitHub repository
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repository
4. Add environment variables:
   - `BOT_TOKEN` - Your bot token
   - `CLIENT_ID` - Your application client ID
   - `NOTION_TOKEN` - Your Notion integration token
   - `NOTION_CHANNELS_DB` - ID of Channel Configurations database
   - `NOTION_CLAIMED_DB` - ID of Claimed Users database

5. Deploy!

### 4. Register Commands

After deployment, run the deploy command once (or via a separate process in Railway):

```bash
npm run deploy
```

## Local Development

1. Copy `.env.example` to `.env` and fill in your credentials
2. Install dependencies: `npm install`
3. Register commands: `npm run deploy`
4. Start the bot: `npm start`
