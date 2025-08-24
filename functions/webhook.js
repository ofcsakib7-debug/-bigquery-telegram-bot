// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 1
// Component: webhook_receiver_function
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 10:15 UTC
// Next Step: Implement environment variable validation and error handling
// =============================================

const bot = require('./bot');

/**
 * Google Cloud Function entry point for Telegram webhook
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.telegramWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      res.status(403).send('Forbidden: Invalid webhook signature');
      return;
    }

    // Process update with Telegraf
    await bot.handleUpdate(req.body, res);
    
    // Note: Telegraf will send the response, so we don't need to send it here
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.status(500).send('Internal Server Error');
  }
};

/**
 * Verify webhook signature using X-Telegram-Bot-Api-Secret-Token header
 * @param {Object} req - HTTP request object
 * @returns {boolean} - True if signature is valid
 */
function verifyWebhookSignature(req) {
  // In production, this should check against a secret token
  // For now, we'll just check if the header exists
  const secretToken = req.header('X-Telegram-Bot-Api-Secret-Token');
  return !!secretToken; // Simplified for now
}