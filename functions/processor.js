// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 1
// Component: pubsub_processor_function
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 13:30 UTC
// Next Step: Implement payment evidence collection
// =============================================

const { Firestore } = require('@google-cloud/firestore');
const { handleStartCommand, handleHelpCommand, handleUnknownCommand } = require('./commands');
const { handleActionCallback, handleSnoozeCallback, handleMenuCallback, handlePaymentCallback, handleUnknownCallback } = require('./callbacks');
const { insertRecord } = require('../bigquery/microbatching');
const { processMultiInputCommand } = require('./multi_input_processor');
const { isAdmin, handleAdminCommand } = require('./admin_management');
const { getDueItems, getPersonalizedSnoozeOptions } = require('./due_items');
const { getCustomerLedger } = require('./customer_payments');
const { getRoleBasedDueItems } = require('./department_due_items');

// Initialize Firestore
const firestore = new Firestore();

/**
 * Google Cloud Function entry point for Pub/Sub message processing
 * @param {Object} message - Pub/Sub message
 * @param {Object} context - Pub/Sub context
 */
exports.processMessage = async (message, context) => {
  try {
    // Decode and parse the message data
    const messageData = JSON.parse(Buffer.from(message.data, 'base64').toString());
    
    console.log('Processing message:', messageData);
    
    // Extract message details
    const { message: telegramMessage, userId, timestamp } = messageData;
    
    // Route message based on type
    if (telegramMessage.text && telegramMessage.text.startsWith('/')) {
      await handleCommand(telegramMessage, userId);
    } else if (telegramMessage.callback_query) {
      await handleCallbackQuery(telegramMessage.callback_query, userId);
    } else {
      await handleMessage(telegramMessage, userId);
    }
    
    // Update user state in Firestore
    await updateUserState(userId, telegramMessage);
    
    // Log interaction pattern to BigQuery (micro-batched)
    await logInteractionPattern(userId, telegramMessage);
    
  } catch (error) {
    console.error('Error processing message:', error);
    // In a production environment, we might want to send to a dead letter queue
  }
};

/**
 * Handle command messages
 * @param {Object} message - Telegram message object
 * @param {string} userId - Telegram user ID
 */
async function handleCommand(message, userId) {
  try {
    const command = message.text.toLowerCase();
    
    switch (command) {
      case '/start':
        await handleStartCommand(userId);
        break;
      case '/help':
        await handleHelpCommand(userId);
        break;
      case '/admin':
        await handleAdminCommand(userId);
        break;
      case '/due':
        await handleDueCommand(userId);
        break;
      default:
        await handleUnknownCommand(userId, command);
    }
  } catch (error) {
    console.error('Error handling command:', error);
  }
}

/**
 * Handle callback queries (button presses)
 * @param {Object} callbackQuery - Telegram callback query object
 * @param {string} userId - Telegram user ID
 */
async function handleCallbackQuery(callbackQuery, userId) {
  try {
    const callbackData = callbackQuery.data;
    
    // Parse callback data
    const parts = callbackData.split(':');
    const type = parts[0];
    const subtype = parts[1];
    const value = parts.slice(2).join(':'); // Join remaining parts in case value contains colons
    
    // Route based on callback type
    switch (type) {
      case 'action':
        await handleActionCallback(subtype, value, userId);
        break;
      case 'snooze':
        await handleSnoozeCallback(value, userId);
        break;
      case 'menu':
        await handleMenuCallback(subtype, value, userId);
        break;
      case 'payment_method':
        await handlePaymentCallback('method', subtype + (value ? ':' + value : ''), userId);
        break;
      case 'example_challan':
        // Handle example challan selection
        // In a real implementation, we would pre-fill the challan entry
        console.log(`User ${userId} selected example challan: ${subtype}`);
        break;
      default:
        await handleUnknownCallback(type, subtype, value, userId);
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
  }
}

/**
 * Handle regular text messages
 * @param {Object} message - Telegram message object
 * @param {string} userId - Telegram user ID
 */
async function handleMessage(message, userId) {
  try {
    // Get user profile to determine department
    const userDoc = await firestore.collection('user_profiles').doc(userId.toString()).get();
    const userProfile = userDoc.data();
    const departmentId = userProfile ? userProfile.departmentId : 'GENERAL';
    
    // Check if this is an admin command
    if (message.text === '/admin') {
      const adminResult = await handleAdminCommand(userId);
      // In a real implementation, we would send the response back to the user
      console.log(`Admin command result for user ${userId}:`, adminResult);
      return;
    }
    
    // Process as multi-input command
    const processingResult = await processMultiInputCommand(message.text, userId, departmentId);
    
    // Send acknowledgment if needed
    if (processingResult.acknowledgment && processingResult.acknowledgment.shouldSend) {
      // In a real implementation, we would send this message back to the user
      console.log(`Acknowledgment for user ${userId}:`, processingResult.acknowledgment.text);
    }
    
    // Handle result
    if (processingResult.result.valid) {
      // In a real implementation, we would send the success message and suggestions
      console.log(`Success message for user ${userId}:`, processingResult.result.message);
      console.log(`Suggestions for user ${userId}:`, processingResult.result.suggestions);
    } else {
      // In a real implementation, we would send the error message and suggestions
      console.log(`Error for user ${userId}:`, processingResult.result.errorMessage);
      console.log(`Suggestions for user ${userId}:`, processingResult.result.suggestions);
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

/**
 * Update user state in Firestore
 * @param {string} userId - Telegram user ID
 * @param {Object} message - Telegram message object
 */
async function updateUserState(userId, message) {
  try {
    const userStateRef = firestore.collection('user_states').doc(userId.toString());
    
    // Update last interaction timestamp
    await userStateRef.set({
      lastInteraction: new Date().toISOString(),
      lastMessage: message.text || 'Button press',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user state:', error);
  }
}

/**
 * Log interaction pattern to BigQuery with micro-batching
 * @param {string} userId - Telegram user ID
 * @param {Object} message - Telegram message object
 */
async function logInteractionPattern(userId, message) {
  try {
    // Get user profile to determine department
    const userDoc = await firestore.collection('user_profiles').doc(userId.toString()).get();
    const userProfile = userDoc.data();
    
    // Create interaction record
    const interactionRecord = {
      interaction_id: `INT-${Date.now()}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      user_id: userId.toString(),
      department_id: userProfile ? userProfile.departmentId : null,
      bot_id: process.env.BOT_ID || 'default_bot',
      interaction_type: message.text ? 'TEXT_INPUT' : (message.callback_query ? 'BUTTON' : 'COMMAND'),
      target_screen: 'unknown', // In a real implementation, we would track the current screen
      action_taken: message.text || (message.callback_query ? message.callback_query.data : 'command'),
      timestamp: new Date().toISOString(),
      is_first_time: false, // In a real implementation, we would check if this is the user's first interaction
      completed_workflow: false // In a real implementation, we would track workflow completion
    };
    
    // Insert record with micro-batching
    insertRecord(
      process.env.BIGQUERY_DATASET_ID || 'business_operations',
      'ui_interaction_patterns',
      interactionRecord
    );
    
  } catch (error) {
    console.error('Error logging interaction pattern:', error);
  }
}