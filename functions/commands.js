// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 1
// Component: command_handlers
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 10:45 UTC
// Next Step: Implement start command with department-specific options
// =============================================

const { Firestore } = require('@google-cloud/firestore');
const { handleRecordPaymentAction } = require('./payment');

// Initialize Firestore
const firestore = new Firestore();

/**
 * Handle /start command
 * @param {string} userId - Telegram user ID
 */
async function handleStartCommand(userId) {
  try {
    // Get user profile from Firestore
    const userDoc = await firestore.collection('user_profiles').doc(userId.toString()).get();
    let userProfile = userDoc.data();
    
    // If user profile doesn't exist, create a basic one
    if (!userProfile) {
      userProfile = {
        userId: userId,
        firstName: 'User', // We would get this from the Telegram API in a real implementation
        departmentId: 'finance', // Default to finance department
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await firestore.collection('user_profiles').doc(userId.toString()).set(userProfile);
    }
    
    // Send welcome message with department-specific options
    const welcomeMessage = generateWelcomeMessage(userProfile);
    const keyboard = generateMainMenuKeyboard(userProfile.departmentId);
    
    // In a real implementation, we would send this message back to the user
    // through the Telegram API, but for now we'll just log it
    console.log(`Welcome message for user ${userId}:`, welcomeMessage);
    console.log(`Main menu keyboard for user ${userId}:`, JSON.stringify(keyboard, null, 2));
    
  } catch (error) {
    console.error('Error handling start command:', error);
  }
}

/**
 * Handle /help command
 * @param {string} userId - Telegram user ID
 */
async function handleHelpCommand(userId) {
  try {
    // Send help message
    const helpMessage = generateHelpMessage();
    
    // In a real implementation, we would send this message back to the user
    console.log(`Help message for user ${userId}:`, helpMessage);
    
  } catch (error) {
    console.error('Error handling help command:', error);
  }
}

/**
 * Handle unknown commands
 * @param {string} userId - Telegram user ID
 * @param {string} command - Unknown command
 */
async function handleUnknownCommand(userId, command) {
  try {
    // Send error message for unknown command
    const errorMessage = `❌ Unknown command: ${command}\n\nPlease use the buttons to navigate instead of typing commands.`;
    
    // In a real implementation, we would send this message back to the user
    console.log(`Unknown command message for user ${userId}:`, errorMessage);
    
  } catch (error) {
    console.error('Error handling unknown command:', error);
  }
}

/**
 * Generate welcome message with department-specific options
 * @param {Object} userProfile - User profile from Firestore
 * @returns {string} Welcome message
 */
function generateWelcomeMessage(userProfile) {
  const departmentOptions = getDepartmentOptions(userProfile.departmentId);
  
  return `👋 Welcome, ${userProfile.firstName}!

*Select an action:*

${departmentOptions}

🔔 *Notifications*: 0 pending items`;
}

/**
 * Get department-specific options
 * @param {string} departmentId - Department ID
 * @returns {string} Department-specific options
 */
function getDepartmentOptions(departmentId) {
  switch (departmentId) {
    case 'finance':
      return ` Finance & Store Department:
💰 Record Payment
📝 Log Expense
📊 View Reports`;
    case 'sales':
      return ` Sales Department:
🚚 Log Delivery Challan
💰 Record Customer Payment
📱 View Customer List`;
    case 'service':
      return ` Service Department:
🔧 Log Service Ticket
📱 View Technician Schedule
📊 Service Performance`;
    default:
      return `Default Department:
📋 View Options
📊 View Reports
⚙️ Settings`;
  }
}

/**
 * Generate main menu keyboard
 * @param {string} departmentId - Department ID
 * @returns {Object} Inline keyboard structure
 */
function generateMainMenuKeyboard(departmentId) {
  const keyboard = {
    inline_keyboard: []
  };
  
  // Add department-specific options
  switch (departmentId) {
    case 'finance':
      keyboard.inline_keyboard.push(
        [{ text: "💰 Record Payment", callback_data: "action:record_payment" }],
        [{ text: "📝 Log Expense", callback_data: "action:log_expense" }],
        [{ text: "📊 View Reports", callback_data: "action:view_reports" }]
      );
      break;
    case 'sales':
      keyboard.inline_keyboard.push(
        [{ text: "🚚 Log Delivery Challan", callback_data: "action:log_delivery" }],
        [{ text: "💰 Record Customer Payment", callback_data: "action:record_customer_payment" }],
        [{ text: "📱 View Customer List", callback_data: "action:view_customers" }]
      );
      break;
    case 'service':
      keyboard.inline_keyboard.push(
        [{ text: "🔧 Log Service Ticket", callback_data: "action:log_service_ticket" }],
        [{ text: "📱 View Technician Schedule", callback_data: "action:view_schedule" }],
        [{ text: "📊 Service Performance", callback_data: "action:service_performance" }]
      );
      break;
    default:
      keyboard.inline_keyboard.push(
        [{ text: "📋 View Options", callback_data: "action:view_options" }],
        [{ text: "📊 View Reports", callback_data: "action:view_reports" }],
        [{ text: "⚙️ Settings", callback_data: "action:settings" }]
      );
  }
  
  // Add snooze options
  keyboard.inline_keyboard.push(
    [{ text: "☕ Finish coffee first (30 min)", callback_data: "snooze:30m" }],
    [{ text: "EndInit of work (5pm)", callback_data: "snooze:work_end" }],
    [{ text: "🔍 More Options", callback_data: "menu:more" }]
  );
  
  return keyboard;
}

/**
 * Generate help message
 * @returns {string} Help message
 */
function generateHelpMessage() {
  return `This is a business management bot designed for Bangladesh operations.

Key features:
• All interactions use buttons - no typing required
• Department-specific workflows
• Automatic snooze functionality
• Real-time data processing

Use the buttons to navigate through options.`;
}

// Export functions for use in other modules
module.exports = {
  handleStartCommand,
  handleHelpCommand,
  handleUnknownCommand
};