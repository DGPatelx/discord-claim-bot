const { Client } = require('@notionhq/client');

// Initialize Notion client
const notion = new Client({
    auth: process.env.NOTION_TOKEN
});

const CHANNELS_DB_ID = process.env.NOTION_CHANNELS_DB;
const CLAIMED_DB_ID = process.env.NOTION_CLAIMED_DB;

// Startup validation
console.log('📋 Notion Config:');
console.log('  - Token:', process.env.NOTION_TOKEN ? '✅ Set' : '❌ Missing');
console.log('  - Channels DB:', CHANNELS_DB_ID || '❌ Missing');
console.log('  - Claimed DB:', CLAIMED_DB_ID || '❌ Missing');

// ==================== CHANNEL CONFIGURATIONS ====================

// Add channel configuration
async function addChannelConfig(channelId, urlPattern, claimMessage) {
    console.log(`📝 Adding config for channel ${channelId}`);
    console.log(`   URL Pattern: ${urlPattern}`);
    console.log(`   Database ID: ${CHANNELS_DB_ID}`);

    try {
        // First check if config already exists
        const existing = await getChannelConfigPage(channelId);

        if (existing) {
            // Update existing
            console.log('   Updating existing config...');
            await notion.pages.update({
                page_id: existing.id,
                properties: {
                    'URL Pattern': { rich_text: [{ text: { content: urlPattern } }] },
                    'Claim Message': { rich_text: [{ text: { content: claimMessage } }] },
                    'Created At': { date: { start: new Date().toISOString() } }
                }
            });
        } else {
            // Create new
            console.log('   Creating new config...');
            await notion.pages.create({
                parent: { database_id: CHANNELS_DB_ID },
                properties: {
                    'Channel ID': { title: [{ text: { content: channelId } }] },
                    'URL Pattern': { rich_text: [{ text: { content: urlPattern } }] },
                    'Claim Message': { rich_text: [{ text: { content: claimMessage } }] },
                    'Created At': { date: { start: new Date().toISOString() } }
                }
            });
        }
        console.log('   ✅ Config saved successfully');
    } catch (error) {
        console.error('   ❌ Error saving config:', error.message);
        console.error('   Full error:', JSON.stringify(error, null, 2));
        throw error;
    }
}

// Get channel config page (internal helper)
async function getChannelConfigPage(channelId) {
    const response = await notion.databases.query({
        database_id: CHANNELS_DB_ID,
        filter: {
            property: 'Channel ID',
            title: { equals: channelId }
        }
    });
    return response.results[0] || null;
}

// Remove channel configuration
async function removeChannelConfig(channelId) {
    const page = await getChannelConfigPage(channelId);
    if (page) {
        await notion.pages.update({
            page_id: page.id,
            archived: true
        });
        return true;
    }
    return false;
}

// Get channel configuration
async function getChannelConfig(channelId) {
    const page = await getChannelConfigPage(channelId);
    if (!page) return null;

    const props = page.properties;
    return {
        urlPattern: props['URL Pattern']?.rich_text?.[0]?.text?.content || '',
        claimMessage: props['Claim Message']?.rich_text?.[0]?.text?.content || '',
        createdAt: props['Created At']?.date?.start || null
    };
}

// Get all channel configurations
async function getAllChannelConfigs() {
    const response = await notion.databases.query({
        database_id: CHANNELS_DB_ID
    });

    const configs = {};
    for (const page of response.results) {
        const props = page.properties;
        const channelId = props['Channel ID']?.title?.[0]?.text?.content;
        if (channelId) {
            configs[channelId] = {
                urlPattern: props['URL Pattern']?.rich_text?.[0]?.text?.content || '',
                claimMessage: props['Claim Message']?.rich_text?.[0]?.text?.content || '',
                createdAt: props['Created At']?.date?.start || null
            };
        }
    }
    return configs;
}

// ==================== CLAIMED USERS ====================

// Check if user has claimed in channel
async function hasUserClaimed(channelId, userId) {
    const entryId = `${channelId}_${userId}`;
    const response = await notion.databases.query({
        database_id: CLAIMED_DB_ID,
        filter: {
            property: 'Entry ID',
            title: { equals: entryId }
        }
    });
    return response.results.length > 0;
}

// Mark user as claimed in channel
async function markUserClaimed(channelId, userId, username = '') {
    const entryId = `${channelId}_${userId}`;

    // Check if already exists
    const exists = await hasUserClaimed(channelId, userId);
    if (exists) return;

    await notion.pages.create({
        parent: { database_id: CLAIMED_DB_ID },
        properties: {
            'Entry ID': { title: [{ text: { content: entryId } }] },
            'Channel ID': { rich_text: [{ text: { content: channelId } }] },
            'User ID': { rich_text: [{ text: { content: userId } }] },
            'Username': { rich_text: [{ text: { content: username } }] },
            'Claimed At': { date: { start: new Date().toISOString() } }
        }
    });
}

// Reset claimed users for a channel
async function resetClaimedUsers(channelId) {
    const response = await notion.databases.query({
        database_id: CLAIMED_DB_ID,
        filter: {
            property: 'Channel ID',
            rich_text: { equals: channelId }
        }
    });

    for (const page of response.results) {
        await notion.pages.update({
            page_id: page.id,
            archived: true
        });
    }
    return response.results.length > 0;
}

// Get claimed users count for a channel
async function getClaimedCount(channelId) {
    const response = await notion.databases.query({
        database_id: CLAIMED_DB_ID,
        filter: {
            property: 'Channel ID',
            rich_text: { equals: channelId }
        }
    });
    return response.results.length;
}

module.exports = {
    addChannelConfig,
    removeChannelConfig,
    getChannelConfig,
    getAllChannelConfigs,
    hasUserClaimed,
    markUserClaimed,
    resetClaimedUsers,
    getClaimedCount
};
