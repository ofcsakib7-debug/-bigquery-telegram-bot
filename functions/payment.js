// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 3
// Component: payment_recording_workflow
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 13:15 UTC
// Next Step: Implement payment method selection UI
// =============================================

const { Firestore } = require('@google-cloud/firestore');
const { insertRecord } = require('../bigquery/microbatching');

// Lazy initialization of Firestore
let firestore = null;
function getFirestore() {
  if (!firestore) {
    firestore = new Firestore();
  }
  return firestore;
}

/**
 * Handle record payment action - Step 1: Payment Method Selection
 * @param {string} userId - Telegram user ID
 */
async function handleRecordPaymentAction(userId) {
  try {
    // Get active bank accounts from Firestore
    const bankAccounts = await getActiveBankAccounts();
    
    // Generate payment method selection message
    const message = generatePaymentMethodMessage();
    
    // Generate inline keyboard with payment methods
    const keyboard = generatePaymentMethodKeyboard(bankAccounts);
    
    // In a real implementation, we would send this message to the user
    console.log(`Payment method selection message for user ${userId}:`, message);
    console.log(`Payment method keyboard for user ${userId}:`, JSON.stringify(keyboard, null, 2));
    
    // Update user state to track payment workflow
    await updateUserPaymentState(userId, {
      state: 'payment_method_selection',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error handling record payment action:', error);
  }
}

/**
 * Get active bank accounts from Firestore
 * @returns {Array} Array of active bank accounts
 */
async function getActiveBankAccounts() {
  try {
    const bankAccountsSnapshot = await getFirestore()
      .collection('bank_accounts')
      .where('status', '==', 'active')
      .get();
    
    const bankAccounts = [];
    bankAccountsSnapshot.forEach(doc => {
      bankAccounts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return bankAccounts;
  } catch (error) {
    console.error('Error getting active bank accounts:', error);
    return [];
  }
}

/**
 * Generate payment method selection message
 * @returns {string} Payment method selection message
 */
function generatePaymentMethodMessage() {
  return `💰 *Payment Recording*

Select payment method:`;
}

/**
 * Generate payment method selection keyboard
 * @param {Array} bankAccounts - Array of active bank accounts
 * @returns {Object} Inline keyboard structure
 */
function generatePaymentMethodKeyboard(bankAccounts) {
  const keyboard = {
    inline_keyboard: [
      // Cash, Mobile Financial, Cheque options
      [{ text: "💵 Cash", callback_data: "payment_method:cash" }],
      [{ text: "📱 Mobile Financial", callback_data: "payment_method:mobile" }],
      [{ text: "📄 Cheque", callback_data: "payment_method:cheque" }]
    ]
  };
  
  // Add bank transfer options from Firestore
  if (bankAccounts.length > 0) {
    const bankButtons = bankAccounts.map(account => ({
      text: `🏦 ${account.bank_name} (${account.display_number})`,
      callback_data: `payment_method:bank:${account.id}`
    }));
    
    // Add bank buttons (2 per row)
    for (let i = 0; i < bankButtons.length; i += 2) {
      const row = [];
      row.push(bankButtons[i]);
      if (i + 1 < bankButtons.length) {
        row.push(bankButtons[i + 1]);
      }
      keyboard.inline_keyboard.push(row);
    }
  }
  
  // Add snooze options
  keyboard.inline_keyboard.push(
    [{ text: "☕ Finish coffee first (30 min)", callback_data: "snooze:30m" }],
    [{ text: "EndInit of work (5pm)", callback_data: "snooze:work_end" }],
    [{ text: "🔙 Back to Main Menu", callback_data: "menu:main" }]
  );
  
  return keyboard;
}

/**
 * Update user payment state in Firestore
 * @param {string} userId - Telegram user ID
 * @param {Object} stateData - State data to store
 */
async function updateUserPaymentState(userId, stateData) {
  try {
    const userStateRef = getFirestore().collection('user_states').doc(userId.toString());
    
    await userStateRef.set({
      paymentWorkflow: stateData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user payment state:', error);
  }
}

/**
 * Handle payment method selection callback
 * @param {string} method - Selected payment method
 * @param {string} userId - Telegram user ID
 * @param {string} accountId - Bank account ID (for bank transfers)
 */
async function handlePaymentMethodSelection(method, userId, accountId = null) {
  try {
    // Update user state with selected payment method
    await updateUserPaymentState(userId, {
      state: 'challan_entry',
      paymentMethod: method,
      bankAccountId: accountId,
      timestamp: new Date().toISOString()
    });
    
    // Generate challan entry message
    const message = generateChallanEntryMessage();
    
    // Generate challan entry keyboard
    const keyboard = generateChallanEntryKeyboard();
    
    // In a real implementation, we would send this message to the user
    console.log(`Challan entry message for user ${userId}:`, message);
    console.log(`Challan entry keyboard for user ${userId}:`, JSON.stringify(keyboard, null, 2));
    
  } catch (error) {
    console.error('Error handling payment method selection:', error);
  }
}

/**
 * Generate challan entry message
 * @returns {string} Challan entry message
 */
function generateChallanEntryMessage() {
  return `🔢 *Challan Numbers*

Please enter the challan number(s) for this payment.

*Format*:
- For single challan: CH-2023-1001
- For multiple: CH-2023-1001 CH-2023-1002`;
}

/**
 * Generate challan entry keyboard
 * @returns {Object} Inline keyboard structure
 */
function generateChallanEntryKeyboard() {
  return {
    inline_keyboard: [
      // Example buttons with valid formats
      [{ text: "CH-2023-1001", callback_data: "example_challan:CH-2023-1001" }],
      [{ text: "CH-2023-1002", callback_data: "example_challan:CH-2023-1002" }],
      [{ text: "CH-2023-1003", callback_data: "example_challan:CH-2023-1003" }],
      // Navigation buttons
      [{ text: "🔙 Back", callback_data: "payment:back" }],
      [{ text: "❌ Cancel", callback_data: "payment:cancel" }],
      // Snooze options
      [{ text: "☕ Finish coffee first (30 min)", callback_data: "snooze:30m" }],
      [{ text: "EndInit of work (5pm)", callback_data: "snooze:work_end" }]
    ]
  };
}

/**
 * Handle challan entry
 * @param {string} challanNumbers - Space-separated challan numbers
 * @param {string} userId - Telegram user ID
 */
async function handleChallanEntry(challanNumbers, userId) {
  try {
    // Validate challan numbers
    const validationResult = validateChallanNumbers(challanNumbers);
    
    if (!validationResult.valid) {
      // Send validation error message
      const errorMessage = generateChallanValidationError(validationResult.error);
      console.log(`Challan validation error for user ${userId}:`, errorMessage);
      return;
    }
    
    // Update user state with challan numbers
    await updateUserPaymentState(userId, {
      state: 'evidence_collection',
      challanNumbers: validationResult.challanNumbers,
      timestamp: new Date().toISOString()
    });
    
    // Generate evidence collection message
    const message = generateEvidenceCollectionMessage();
    
    // Generate evidence collection keyboard
    const keyboard = generateEvidenceCollectionKeyboard();
    
    // In a real implementation, we would send this message to the user
    console.log(`Evidence collection message for user ${userId}:`, message);
    console.log(`Evidence collection keyboard for user ${userId}:`, JSON.stringify(keyboard, null, 2));
    
  } catch (error) {
    console.error('Error handling challan entry:', error);
  }
}

/**
 * Validate challan numbers
 * @param {string} challanNumbers - Space-separated challan numbers
 * @returns {Object} Validation result
 */
function validateChallanNumbers(challanNumbers) {
  try {
    // Split challan numbers by space
    const challanArray = challanNumbers.trim().split(/\s+/);
    
    // Check if we have at least one challan
    if (challanArray.length === 0 || (challanArray.length === 1 && challanArray[0] === '')) {
      return {
        valid: false,
        error: 'Please enter at least one challan number'
      };
    }
    
    // Check if we have more than 5 challan numbers
    if (challanArray.length > 5) {
      return {
        valid: false,
        error: 'Maximum 5 challan numbers per payment'
      };
    }
    
    // Validate each challan number format
    const regex = /^(CH|INV)-\d{4}-\d{3,5}$/;
    for (const challan of challanArray) {
      if (!regex.test(challan)) {
        return {
          valid: false,
          error: `Invalid challan format: ${challan}. Correct format: CH-2023-1001`
        };
      }
    }
    
    return {
      valid: true,
      challanNumbers: challanArray
    };
  } catch (error) {
    console.error('Error validating challan numbers:', error);
    return {
      valid: false,
      error: 'Error validating challan numbers'
    };
  }
}

/**
 * Generate challan validation error message
 * @param {string} error - Error message
 * @returns {string} Validation error message
 */
function generateChallanValidationError(error) {
  return `❌ *Invalid Challan Numbers*

${error}

✅ *Correct Examples*:
- CH-2023-1001
- INV-2023-12345

Please re-enter the challan number(s):`;
}

/**
 * Generate evidence collection message
 * @returns {string} Evidence collection message
 */
function generateEvidenceCollectionMessage() {
  return `📸 *Payment Proof Required*

Please send a clear photo of your payment proof.

You can snooze this request if you're busy:`;
}

/**
 * Generate evidence collection keyboard
 * @returns {Object} Inline keyboard structure
 */
function generateEvidenceCollectionKeyboard() {
  return {
    inline_keyboard: [
      // Snooze options
      [{ text: "☕ Finish coffee first (30 min)", callback_data: "snooze:30m" }],
      [{ text: "After current task (1h)", callback_data: "snooze:1h" }],
      [{ text: "EndInit of work (5pm)", callback_data: "snooze:work_end" }],
      // Skip option
      [{ text: "⏭️ Skip for now (I'll remind gently)", callback_data: "payment:evidence:skip" }],
      // Back button
      [{ text: "🔙 Back", callback_data: "payment:back" }]
    ]
  };
}

// Export functions
module.exports = {
  handleRecordPaymentAction,
  handlePaymentMethodSelection,
  handleChallanEntry,
  validateChallanNumbers,
  generateChallanValidationError
};