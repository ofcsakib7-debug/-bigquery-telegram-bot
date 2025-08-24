// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 1
// Component: telegram_bot_main
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 10:00 UTC
// Next Step: Implement webhook verification and basic message handling
// =============================================

const { Telegraf } = require('telegraf');
const { PubSub } = require('@google-cloud/pubsub');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Load environment variables
require('dotenv').config();

// Initialize Telegram bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Initialize Pub/Sub client
const pubsub = new PubSub();
const topicName = process.env.PUBSUB_TOPIC_NAME || 'telegram-messages';

// Initialize Secret Manager client
const secretManager = new SecretManagerServiceClient();

/**
 * Verify webhook signature using X-Telegram-Bot-Api-Secret-Token header
 * @param {Object} req - HTTP request object
 * @returns {boolean} - True if signature is valid
 */
function verifyWebhookSignature(req) {
  const secretToken = req.header('X-Telegram-Bot-Api-Secret-Token');
  return secretToken === process.env.WEBHOOK_SECRET_TOKEN;
}

/**
 * Push message to Pub/Sub for asynchronous processing
 * @param {Object} message - Telegram message object
 * @param {string} userId - Telegram user ID
 */
async function pushMessageToPubSub(message, userId) {
  try {
    const dataBuffer = Buffer.from(JSON.stringify({
      message,
      userId,
      timestamp: new Date().toISOString()
    }));

    const messageId = await pubsub.topic(topicName).publishMessage({ data: dataBuffer });
    console.log(`Message ${messageId} published to Pub/Sub`);
  } catch (error) {
    console.error('Error publishing message to Pub/Sub:', error);
  }
}

// Webhook endpoint for Telegram
bot.on('message', async (ctx) => {
  try {
    // Send instant acknowledgment
    await ctx.reply('Processing your request...');
    
    // Push message to Pub/Sub for asynchronous processing
    await pushMessageToPubSub(ctx.message, ctx.from.id);
  } catch (error) {
    console.error('Error handling message:', error);
    await ctx.reply('Sorry, there was an error processing your request. Please try again.');
  }
});

// Handle callback queries (button presses)
bot.on('callback_query', async (ctx) => {
  try {
    // Send instant acknowledgment
    await ctx.answerCbQuery('Processing your request...');
    
    // Push callback query to Pub/Sub for asynchronous processing
    await pushMessageToPubSub(ctx.callbackQuery, ctx.from.id);
  } catch (error) {
    console.error('Error handling callback query:', error);
    await ctx.answerCbQuery('Sorry, there was an error processing your request.');
  }
});

// Start command
bot.start((ctx) => {
  ctx.reply('Welcome to the Business Management Bot! Processing your request...');
  pushMessageToPubSub({ text: '/start' }, ctx.from.id);
});

// Help command
bot.help((ctx) => {
  ctx.reply('This is a business management bot. Use the buttons to navigate through options.');
  pushMessageToPubSub({ text: '/help' }, ctx.from.id);
});

// Export for Cloud Functions
module.exports = bot;