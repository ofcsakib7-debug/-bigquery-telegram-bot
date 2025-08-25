// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Enhancement
// Phase: 1
// Component: remarks_functionality
// Status: IN_PROGRESS
// Last Modified: 2025-08-25 12:00 UTC
// Next Step: Implement remarks extraction and storage
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
 * Extract remarks from user input
 * @param {string} input - User input text
 * @returns {Object} Object containing original text and extracted remarks
 */
function extractRemarks(input) {
  try {
    // Return early if input is empty or not a string
    if (!input || typeof input !== 'string') {
      return {
        originalText: input || '',
        cleanedText: input || '',
        remarks: [],
        hasRemarks: false
      };
    }
    
    // Match anything inside parentheses (non-greedy, balanced)
    // This regex matches content inside balanced parentheses
    const remarksRegex = /\(([^()]*)\)/g;
    const matches = [...input.matchAll(remarksRegex)];
    
    // Extract remarks (text inside parentheses)
    const remarks = matches.map(match => match[1].trim());
    
    // Remove remarks from original text
    const cleanedText = input.replace(/\([^()]*\)/g, '').trim();
    
    return {
      originalText: input,
      cleanedText: cleanedText,
      remarks: remarks,
      hasRemarks: remarks.length > 0
    };
  } catch (error) {
    console.error('Error extracting remarks:', error);
    return {
      originalText: input || '',
      cleanedText: input || '',
      remarks: [],
      hasRemarks: false
    };
  }
}

/**
 * Store remarks in Firestore for admin review
 * @param {string} userId - Telegram user ID
 * @param {string} userName - Telegram user name
 * @param {string} departmentId - User department ID
 * @param {Array} remarks - Array of remarks extracted from user input
 * @param {string} context - Context where remarks were made
 */
async function storeRemarksForReview(userId, userName, departmentId, remarks, context) {
  try {
    if (!remarks || remarks.length === 0) {
      return;
    }
    
    const firestoreClient = getFirestore();
    
    // For each remark, create a review request
    for (const remark of remarks) {
      const remarkId = `remark_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const remarkDoc = {
        remark_id: remarkId,
        user_id: userId.toString(),
        user_name: userName,
        department_id: departmentId,
        remark_text: remark,
        context: context,
        created_at: new Date().toISOString(),
        status: 'pending', // pending, reviewed, acknowledged
        assigned_to: null, // Will be assigned to managers/admins
        snooze_until: null,
        acknowledged_at: null,
        acknowledged_by: null
      };
      
      // Store in Firestore
      await firestoreClient.collection('remarks_for_review').doc(remarkId).set(remarkDoc);
      
      console.log(`Stored remark for review: ${remarkId}`);
    }
  } catch (error) {
    console.error('Error storing remarks for review:', error);
  }
}

/**
 * Notify managers about pending remarks
 * @param {Array} remarks - Array of remarks that need review
 */
async function notifyManagersOfPendingRemarks(remarks) {
  try {
    if (!remarks || remarks.length === 0) {
      return;
    }
    
    const firestoreClient = getFirestore();
    
    // Get managers and admins who should be notified
    const managersSnapshot = await firestoreClient
      .collection('user_profiles')
      .where('role', 'in', ['manager', 'admin'])
      .get();
    
    const managers = [];
    managersSnapshot.forEach(doc => {
      managers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // For each manager, add pending remarks to their notification queue
    for (const manager of managers) {
      for (const remark of remarks) {
        const notificationId = `notification_${manager.id}_${remark.remark_id}`;
        
        const notificationDoc = {
          notification_id: notificationId,
          user_id: manager.id,
          remark_id: remark.remark_id,
          remark_text: remark.remark_text,
          submitted_by: remark.user_name,
          submitted_at: remark.created_at,
          context: remark.context,
          created_at: new Date().toISOString(),
          status: 'unread', // unread, read, acknowledged
          snooze_until: null,
          acknowledged_at: null
        };
        
        // Store notification in Firestore
        await firestoreClient.collection('manager_notifications').doc(notificationId).set(notificationDoc);
      }
    }
    
    console.log(`Notified ${managers.length} managers about ${remarks.length} remarks`);
  } catch (error) {
    console.error('Error notifying managers of pending remarks:', error);
  }
}

/**
 * Generate remarks confirmation message
 * @param {Array} remarks - Array of extracted remarks
 * @returns {string} Confirmation message
 */
function generateRemarksConfirmation(remarks) {
  try {
    if (!remarks || remarks.length === 0) {
      return '';
    }
    
    const remarksList = remarks.map((remark, index) => 
      `${index + 1}. "${remark}"`
    ).join('\n');
    
    return `

📝 *Remarks Detected*:
${remarksList}

✅ These remarks will be reviewed by your manager(s).`;
  } catch (error) {
    console.error('Error generating remarks confirmation:', error);
    return '';
  }
}

/**
 * Mark remark as acknowledged by manager
 * @param {string} remarkId - Remark ID
 * @param {string} managerId - Manager ID who acknowledged
 */
async function acknowledgeRemark(remarkId, managerId) {
  try {
    const firestoreClient = getFirestore();
    
    // Update remark status to acknowledged
    await firestoreClient.collection('remarks_for_review').doc(remarkId).update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: managerId.toString()
    });
    
    // Remove notification for this remark
    const notificationsSnapshot = await firestoreClient
      .collection('manager_notifications')
      .where('remark_id', '==', remarkId)
      .get();
    
    notificationsSnapshot.forEach(async (doc) => {
      await firestoreClient.collection('manager_notifications').doc(doc.id).update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      });
    });
    
    console.log(`Remark ${remarkId} acknowledged by manager ${managerId}`);
  } catch (error) {
    console.error('Error acknowledging remark:', error);
  }
}

/**
 * Get pending remarks for a manager
 * @param {string} managerId - Manager ID
 * @returns {Array} Array of pending remarks
 */
async function getPendingRemarksForManager(managerId) {
  try {
    const firestoreClient = getFirestore();
    
    // Get unread notifications for this manager
    const notificationsSnapshot = await firestoreClient
      .collection('manager_notifications')
      .where('user_id', '==', managerId.toString())
      .where('status', '==', 'unread')
      .get();
    
    const pendingRemarks = [];
    notificationsSnapshot.forEach(doc => {
      pendingRemarks.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return pendingRemarks;
  } catch (error) {
    console.error('Error getting pending remarks for manager:', error);
    return [];
  }
}

/**
 * Generate manager review message for pending remarks
 * @param {Array} pendingRemarks - Array of pending remarks
 * @returns {Object} Message and keyboard for manager review
 */
function generateManagerReviewMessage(pendingRemarks) {
  if (!pendingRemarks || pendingRemarks.length === 0) {
    return {
      message: '✅ No pending remarks for review.',
      keyboard: null
    };
  }
  
  const message = `📝 *Pending Remarks for Review* (${pendingRemarks.length} items):

${pendingRemarks.map((remark, index) => 
  `${index + 1}. From: ${remark.submitted_by}
   Context: ${remark.context}
   Remark: "${remark.remark_text}"
   Submitted: ${new Date(remark.submitted_at).toLocaleString()}`
).join(`

`)}

Please review these remarks and acknowledge them when done.`;
  
  // Generate keyboard with buttons for each remark
  const keyboard = {
    inline_keyboard: []
  };
  
  pendingRemarks.forEach(remark => {
    keyboard.inline_keyboard.push([
      { 
        text: `✅ Acknowledge: "${remark.remark_text.substring(0, 30)}${remark.remark_text.length > 30 ? '...' : ''}"`, 
        callback_data: `acknowledge_remark:${remark.remark_id}` 
      }
    ]);
  });
  
  // Add snooze options
  keyboard.inline_keyboard.push(
    [{ text: "☕ Finish coffee first (30 min)", callback_data: "snooze:30m" }],
    [{ text: "EndInit of work (5pm)", callback_data: "snooze:work_end" }]
  );
  
  return {
    message,
    keyboard
  };
}

// Export functions
module.exports = {
  extractRemarks,
  storeRemarksForReview,
  notifyManagersOfPendingRemarks,
  generateRemarksConfirmation,
  acknowledgeRemark,
  getPendingRemarksForManager,
  generateManagerReviewMessage
};