/**
 * Due Items Management System
 * 
 * This module implements the due items management functionality
 * as specified in Design 10.
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');

// Initialize clients
const bigquery = new BigQuery();
const firestore = new Firestore();

/**
 * Create a new due item
 * @param {Object} dueItem - Due item data
 * @returns {string} Due ID
 */
async function createDueItem(dueItem) {
  try {
    // Generate due ID
    const dueId = `DUE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Set default values
    const item = {
      due_id: dueId,
      entity_type: dueItem.entityType,
      entity_id: dueItem.entityId,
      entity_name: dueItem.entityName,
      due_amount: dueItem.dueAmount,
      due_date: dueItem.dueDate,
      status: 'PENDING',
      priority_level: dueItem.priorityLevel || 'MEDIUM',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...dueItem
    };
    
    // Insert due item
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_items\`
      (due_id, entity_type, entity_id, entity_name, due_amount, due_date, status, priority_level, created_at, updated_at,
       payment_method, payment_reference, reminder_count, last_reminder_timestamp, snooze_until, internal_payment_type,
       department_responsible, recurring_frequency, related_cost_center)
      VALUES
      (@due_id, @entity_type, @entity_id, @entity_name, @due_amount, @due_date, @status, @priority_level, @created_at, @updated_at,
       @payment_method, @payment_reference, @reminder_count, @last_reminder_timestamp, @snooze_until, @internal_payment_type,
       @department_responsible, @recurring_frequency, @related_cost_center)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        ...item,
        reminder_count: item.reminder_count || 0
      }
    };
    
    await bigquery.createQueryJob(options);
    
    // Log journal entry
    await logDueJournalEntry(dueId, 'CREATE', item.due_amount, item.user_id, {
      message: 'Due item created'
    });
    
    return dueId;
  } catch (error) {
    console.error('Error creating due item:', error);
    throw error;
  }
}

/**
 * Get due items for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Filters for due items
 * @returns {Array} Array of due items
 */
async function getDueItems(userId, filters = {}) {
  try {
    // First, get user's department
    const userDoc = await firestore.collection('user_profiles').doc(userId.toString()).get();
    const userProfile = userDoc.data();
    const departmentId = userProfile ? userProfile.departmentId : null;
    
    // Build query for cache table (user-facing queries must read from cache)
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\`
      WHERE 1=1
    `;
    
    const params = {};
    
    // Add department filter if user has one
    if (departmentId) {
      query += ' AND department_responsible = @departmentId';
      params.departmentId = departmentId;
    }
    
    // Add status filter
    if (filters.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }
    
    // Add entity type filter
    if (filters.entityType) {
      query += ' AND entity_type = @entityType';
      params.entityType = filters.entityType;
    }
    
    // Add date range filter
    if (filters.startDate) {
      query += ' AND due_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND due_date <= @endDate';
      params.endDate = filters.endDate;
    }
    
    // Order by priority and due date
    query += ' ORDER BY priority_level DESC, due_date ASC';
    
    // Limit results
    query += ' LIMIT @limit';
    params.limit = filters.limit || 50;
    
    const options = {
      query: query,
      location: 'US',
      params: params,
      maximumBytesBilled: process.env.BIGQUERY_MAX_BYTES_BILLED || '100000000' // 100MB default
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting due items:', error);
    return [];
  }
}

/**
 * Update due item status
 * @param {string} dueId - Due item ID
 * @param {string} status - New status
 * @param {Object} details - Additional details
 * @returns {boolean} Success flag
 */
async function updateDueItemStatus(dueId, status, details = {}) {
  try {
    // Update due item
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_items\`
      SET status = @status, updated_at = @updated_at
      WHERE due_id = @due_id
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        due_id: dueId,
        status: status,
        updated_at: new Date().toISOString()
      }
    };
    
    await bigquery.createQueryJob(options);
    
    // Log journal entry
    await logDueJournalEntry(dueId, 'STATUS_UPDATE', null, details.userId, {
      oldStatus: details.oldStatus,
      newStatus: status,
      message: `Status updated from ${details.oldStatus} to ${status}`
    });
    
    return true;
  } catch (error) {
    console.error('Error updating due item status:', error);
    return false;
  }
}

/**
 * Log a due journal entry
 * @param {string} dueId - Due item ID
 * @param {string} transactionType - Type of transaction
 * @param {number} amount - Amount (if applicable)
 * @param {string} userId - User ID
 * @param {Object} details - Additional details
 * @returns {string} Journal ID
 */
async function logDueJournalEntry(dueId, transactionType, amount, userId, details = {}) {
  try {
    // Generate journal ID
    const journalId = `JOURNAL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Insert journal entry
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_journal\`
      (journal_id, due_id, transaction_type, amount, timestamp, user_id, details, created_at)
      VALUES
      (@journal_id, @due_id, @transaction_type, @amount, @timestamp, @user_id, @details, @created_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        journal_id: journalId,
        due_id: dueId,
        transaction_type: transactionType,
        amount: amount,
        timestamp: new Date().toISOString(),
        user_id: userId,
        details: JSON.stringify(details),
        created_at: new Date().toISOString()
      }
    };
    
    await bigquery.createQueryJob(options);
    
    return journalId;
  } catch (error) {
    console.error('Error logging due journal entry:', error);
    throw error;
  }
}

/**
 * Get due item history
 * @param {string} dueId - Due item ID
 * @returns {Array} Array of journal entries
 */
async function getDueItemHistory(dueId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_journal\`
      WHERE due_id = @dueId
      ORDER BY timestamp DESC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        dueId: dueId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    // Parse JSON details
    return rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null
    }));
  } catch (error) {
    console.error('Error getting due item history:', error);
    return [];
  }
}

/**
 * Snooze a due item
 * @param {string} dueId - Due item ID
 * @param {string} userId - User ID
 * @param {Date} snoozeUntil - Snooze until date
 * @returns {boolean} Success flag
 */
async function snoozeDueItem(dueId, userId, snoozeUntil) {
  try {
    // Update due item with snooze date
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_items\`
      SET snooze_until = @snooze_until, updated_at = @updated_at
      WHERE due_id = @due_id
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        due_id: dueId,
        snooze_until: snoozeUntil.toISOString(),
        updated_at: new Date().toISOString()
      }
    };
    
    await bigquery.createQueryJob(options);
    
    // Log journal entry
    await logDueJournalEntry(dueId, 'SNOOZE_SET', null, userId, {
      snoozeUntil: snoozeUntil.toISOString(),
      message: 'Due item snoozed'
    });
    
    return true;
  } catch (error) {
    console.error('Error snoozing due item:', error);
    return false;
  }
}

/**
 * Get personalized snooze options for a user
 * @param {string} userId - User ID
 * @param {string} dueId - Due item ID
 * @returns {Object} Inline keyboard structure
 */
async function getPersonalizedSnoozeOptions(userId, dueId) {
  try {
    // Get user's forgetfulness profile
    const profile = await getUserForgetfulnessProfile(userId);
    
    // Determine snooze options based on profile
    let snoozeOptions = [];
    
    if (profile && profile.optimal_reminder_strategy === 'GENTLE_SNOOZE_FRIENDLY') {
      // Gentle snooze options
      snoozeOptions = [
        { text: "? 30 min", callback_data: `snooze:30m:${dueId}` },
        { text: "?? 1 hour", callback_data: `snooze:1h:${dueId}` },
        { text: "EndInit of work", callback_data: `snooze:work_end:${dueId}` }
      ];
    } else {
      // Aggressive early options
      snoozeOptions = [
        { text: "? 15 min", callback_data: `snooze:15m:${dueId}` },
        { text: "?? 1 hour", callback_data: `snooze:1h:${dueId}` },
        { text: "EndInit of day", callback_data: `snooze:day_end:${dueId}` }
      ];
    }
    
    // Format as Telegram inline keyboard
    const keyboard = {
      inline_keyboard: []
    };
    
    // Add snooze options (max 2 buttons per row)
    for (let i = 0; i < snoozeOptions.length; i += 2) {
      const row = [];
      row.push(snoozeOptions[i]);
      
      if (i + 1 < snoozeOptions.length) {
        row.push(snoozeOptions[i + 1]);
      }
      
      keyboard.inline_keyboard.push(row);
    }
    
    return keyboard;
  } catch (error) {
    console.error('Error getting personalized snooze options:', error);
    // Return default options
    return {
      inline_keyboard: [
        [{ text: "? 30 min", callback_data: `snooze:30m:${dueId}` }],
        [{ text: "?? 1 hour", callback_data: `snooze:1h:${dueId}` }],
        [{ text: "EndInit of work", callback_data: `snooze:work_end:${dueId}` }]
      ]
    };
  }
}

/**
 * Get user's forgetfulness profile
 * @param {string} userId - User ID
 * @returns {Object|null} User profile or null if not found
 */
async function getUserForgetfulnessProfile(userId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.user_forgetfulness_profiles\`
      WHERE user_id = @userId
      ORDER BY snapshot_date DESC
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        userId: userId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting user forgetfulness profile:', error);
    return null;
  }
}

// Export functions
module.exports = {
  createDueItem,
  getDueItems,
  updateDueItemStatus,
  logDueJournalEntry,
  getDueItemHistory,
  snoozeDueItem,
  getPersonalizedSnoozeOptions,
  getUserForgetfulnessProfile
};