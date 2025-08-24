// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 3
// Component: snooze_functionality
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 14:30 UTC
// Next Step: Implement reminder workflow
// =============================================

const { Firestore } = require('@google-cloud/firestore');

// Lazy initialization of Firestore
let firestore = null;
function getFirestore() {
  if (!firestore) {
    firestore = new Firestore();
  }
  return firestore;
}

/**
 * Update snooze state in Firestore
 * @param {string} userId - Telegram user ID
 * @param {string} duration - Snooze duration
 * @param {string} context - Context for snooze (e.g., payment evidence, expense logging)
 */
async function updateSnoozeState(userId, duration, context) {
  try {
    // Calculate snooze until time based on duration
    const snoozeUntil = calculateSnoozeUntil(duration);
    
    // Get current user snooze state
    const userDoc = await getFirestore().collection('user_snooze').doc(userId.toString()).get();
    let userData = userDoc.data() || {};
    
    // Initialize if not exists
    if (!userData.snoozeRequests) {
      userData.snoozeRequests = [];
    }
    
    // Add new snooze request
    userData.snoozeRequests.push({
      context: context,
      snoozedUntil: snoozeUntil.toISOString(),
      snoozeDuration: duration,
      createdAt: new Date().toISOString()
    });
    
    // Update counts
    userData.snoozeCount = (userData.snoozeCount || 0) + 1;
    userData.lastSnooze = new Date().toISOString();
    userData.currentStatus = 'busy';
    userData.updatedAt = new Date().toISOString();
    
    // Save to Firestore
    await getFirestore().collection('user_snooze').doc(userId.toString()).set(userData);
    
    console.log(`Updated snooze state for user ${userId} until ${snoozeUntil.toISOString()}`);
    
  } catch (error) {
    console.error('Error updating snooze state:', error);
  }
}

/**
 * Calculate snooze until time based on duration
 * @param {string} duration - Snooze duration
 * @returns {Date} Snooze until time
 */
function calculateSnoozeUntil(duration) {
  const now = new Date();
  
  switch (duration) {
    case '30m':
      return new Date(now.getTime() + 30 * 60 * 1000);
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '2h':
      return new Date(now.getTime() + 2 * 60 * 60 * 1000);
    case 'work_end':
      // Assume work ends at 5pm
      const workEnd = new Date();
      workEnd.setHours(17, 0, 0, 0); // 5:00 PM
      return workEnd;
    case 'tomorrow':
      // Tomorrow morning at 9am
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9:00 AM
      return tomorrow;
    default:
      // Default to 1 hour
      return new Date(now.getTime() + 60 * 60 * 1000);
  }
}

/**
 * Generate snooze confirmation message
 * @param {string} duration - Snooze duration
 * @returns {string} Confirmation message
 */
function generateSnoozeConfirmation(duration) {
  const durationText = {
    '30m': '30 minutes',
    '1h': '1 hour',
    '2h': '2 hours',
    'work_end': 'the end of your work day',
    'tomorrow': 'tomorrow morning'
  };
  
  return `✅ Reminder snoozed for ${durationText[duration] || '1 hour'}.
I'll check back with you then!`;
}

/**
 * Check if user is currently snoozed
 * @param {string} userId - Telegram user ID
 * @returns {boolean} True if user is snoozed
 */
async function isUserSnoozed(userId) {
  try {
    const userDoc = await getFirestore().collection('user_snooze').doc(userId.toString()).get();
    const userData = userDoc.data();
    
    if (!userData) return false;
    
    // Check if any snooze requests are still active
    if (userData.snoozeRequests && userData.snoozeRequests.length > 0) {
      const now = new Date();
      for (const request of userData.snoozeRequests) {
        const snoozeUntil = new Date(request.snoozedUntil);
        if (snoozeUntil > now) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if user is snoozed:', error);
    return false;
  }
}

/**
 * Get context-aware snooze options based on time of day
 * @returns {Array} Array of snooze options
 */
function getContextAwareSnoozeOptions() {
  const hour = new Date().getHours();
  
  // Morning (6-11am)
  if (hour >= 6 && hour < 12) {
    return [
      { text: "☕ Finish coffee first (30 min)", callback_data: "snooze:30m" },
      { text: "After morning meeting (2h)", callback_data: "snooze:2h" },
      { text: "EndInit of work (5pm)", callback_data: "snooze:work_end" }
    ];
  }
  // Afternoon (12-5pm)
  else if (hour >= 12 && hour < 17) {
    return [
      { text: "After current task (1h)", callback_data: "snooze:1h" },
      { text: "After lunch break (2h)", callback_data: "snooze:2h" },
      { text: "EndInit of work (5pm)", callback_data: "snooze:work_end" }
    ];
  }
  // Evening (5pm+)
  else {
    return [
      { text: "Tomorrow morning (9am)", callback_data: "snooze:tomorrow" },
      { text: "EndInit of current task (1h)", callback_data: "snooze:1h" },
      { text: "EndInit of work (8pm)", callback_data: "snooze:work_end" }
    ];
  }
}

/**
 * Clear expired snooze requests
 * @param {string} userId - Telegram user ID
 */
async function clearExpiredSnoozeRequests(userId) {
  try {
    const userDoc = await getFirestore().collection('user_snooze').doc(userId.toString()).get();
    const userData = userDoc.data();
    
    if (!userData || !userData.snoozeRequests) return;
    
    const now = new Date();
    const activeRequests = userData.snoozeRequests.filter(request => 
      new Date(request.snoozedUntil) > now
    );
    
    // Update user document with only active requests
    await getFirestore().collection('user_snooze').doc(userId.toString()).set({
      ...userData,
      snoozeRequests: activeRequests,
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error clearing expired snooze requests:', error);
  }
}

// Export functions
module.exports = {
  updateSnoozeState,
  calculateSnoozeUntil,
  generateSnoozeConfirmation,
  isUserSnoozed,
  getContextAwareSnoozeOptions,
  clearExpiredSnoozeRequests
};