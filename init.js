// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 1
// Component: system_initialization
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 12:15 UTC
// Next Step: Complete Pub/Sub and Firestore initialization
// =============================================

const { PubSub } = require('@google-cloud/pubsub');
const { Firestore } = require('@google-cloud/firestore');
const { initializeDataset, createDesign1Tables } = require('./bigquery/tables');

/**
 * Initialize the entire system
 * This function sets up all required components as per the architecture specification
 */
async function initializeSystem() {
  try {
    console.log('Initializing system...');
    
    // Validate environment variables
    validateEnvironmentVariables();
    
    // Initialize BigQuery dataset
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    await initializeDataset(datasetId);
    
    // Create required tables
    await createDesign1Tables(datasetId);
    
    // Initialize Pub/Sub topics
    await initializePubSub();
    
    // Initialize Firestore
    await initializeFirestore();
    
    console.log('System initialization completed successfully');
    
  } catch (error) {
    console.error('Error initializing system:', error);
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironmentVariables() {
  const requiredVars = [
    'BOT_TOKEN',
    'WEBHOOK_SECRET_TOKEN',
    'GOOGLE_CLOUD_PROJECT',
    'BIGQUERY_DATASET_ID'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  console.log('Environment variables validated successfully');
}

/**
 * Initialize Pub/Sub topics and subscriptions
 */
async function initializePubSub() {
  try {
    // Initialize Pub/Sub client
    const pubsub = new PubSub();
    
    // Create the main topic for Telegram messages
    const topicName = process.env.PUBSUB_TOPIC_NAME || 'telegram-messages';
    const [topic] = await pubsub.createTopic(topicName);
    console.log(`Topic ${topic.name} created successfully`);
    
    // Create subscription with 10-minute acknowledgment deadline
    const subscriptionName = `${topicName}-subscription`;
    const [subscription] = await topic.createSubscription(subscriptionName, {
      ackDeadline: 600 // 10 minutes in seconds
    });
    console.log(`Subscription ${subscription.name} created successfully`);
    
    // Create dead letter topic for failed messages
    const deadLetterTopicName = `${topicName}-dead-letter`;
    const [deadLetterTopic] = await pubsub.createTopic(deadLetterTopicName);
    console.log(`Dead letter topic ${deadLetterTopic.name} created successfully`);
    
  } catch (error) {
    console.error('Error initializing Pub/Sub:', error);
  }
}

/**
 * Initialize Firestore collections
 */
async function initializeFirestore() {
  try {
    // Initialize Firestore client
    const firestore = new Firestore();
    
    // Create user_profiles collection (documented implicitly by usage)
    console.log('Firestore collections will be created implicitly by usage');
    
    // Create user_states collection for tracking user interaction states
    console.log('Firestore user_states collection will be created implicitly by usage');
    
    // Create bot configuration collections
    console.log('Firestore bot configuration collections will be created implicitly by usage');
    
    console.log('Firestore initialized successfully');
    
  } catch (error) {
    console.error('Error initializing Firestore:', error);
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeSystem();
}

// Export for use in other modules
module.exports = {
  initializeSystem
};