/**
 * Contextual Action Suggestion Engine
 * 
 * This module implements the contextual action suggestion engine
 * as specified in Design 8.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Generate contextual action suggestions
 * @param {string} contextType - Type of context (RESULT, ERROR, EMPTY, etc.)
 * @param {string} primaryIntent - Primary intent of the current context
 * @param {string} departmentId - User's department ID
 * @param {Object} contextData - Additional context data
 * @returns {Array} Array of action suggestion objects
 */
async function generateContextualActions(contextType, primaryIntent, departmentId, contextData = {}) {
  try {
    const query = `
      SELECT action_id, action_text, action_data, confidence_score
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.contextual_actions\`
      WHERE department_id = @departmentId
      AND context_type = @contextType
      AND primary_intent = @primaryIntent
      ORDER BY confidence_score DESC
      LIMIT 4
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: { departmentId, contextType, primaryIntent }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    // Format as Telegram inline keyboard
    const keyboard = formatAsInlineKeyboard(rows, contextData);
    
    return keyboard;
  } catch (error) {
    console.error('Error generating contextual actions:', error);
    return getDefaultKeyboard();
  }
}

/**
 * Format actions as Telegram inline keyboard
 * @param {Array} actions - Array of action objects
 * @param {Object} contextData - Context data to include in callback
 * @returns {Object} Inline keyboard structure
 */
function formatAsInlineKeyboard(actions, contextData = {}) {
  try {
    const keyboard = {
      inline_keyboard: []
    };
    
    // Add action buttons (max 2 per row)
    for (let i = 0; i < actions.length; i += 2) {
      const row = [];
      
      // First button
      row.push({
        text: actions[i].action_text,
        callback_data: actions[i].action_data
      });
      
      // Second button if exists
      if (i + 1 < actions.length) {
        row.push({
          text: actions[i + 1].action_text,
          callback_data: actions[i + 1].action_data
        });
      }
      
      keyboard.inline_keyboard.push(row);
    }
    
    // Add back to main menu option
    keyboard.inline_keyboard.push([
      {
        text: "◀️ Back to Main Menu",
        callback_data: "menu:main"
      }
    ]);
    
    // Add snooze options for non-urgent actions
    keyboard.inline_keyboard.push([
      {
        text: "☕ Finish coffee first (30 min)",
        callback_data: "snooze:30m"
      }
    ]);
    
    keyboard.inline_keyboard.push([
      {
        text: "EndInit of work (5pm)",
        callback_data: "snooze:work_end"
      }
    ]);
    
    return keyboard;
  } catch (error) {
    console.error('Error formatting inline keyboard:', error);
    return getDefaultKeyboard();
  }
}

/**
 * Get default keyboard
 * @returns {Object} Default inline keyboard structure
 */
function getDefaultKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "◀️ Back to Main Menu",
          callback_data: "menu:main"
        }
      ]
    ]
  };
}

/**
 * Update action usage count
 * @param {string} actionId - Action ID
 */
async function updateActionUsage(actionId) {
  try {
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.contextual_actions\`
      SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP()
      WHERE action_id = @actionId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: { actionId }
    };
    
    await bigquery.createQueryJob(options);
  } catch (error) {
    console.error('Error updating action usage:', error);
  }
}

/**
 * Get prelisted items for a department
 * @param {string} departmentId - Department ID
 * @param {string} itemType - Type of item (optional)
 * @returns {Array} Array of prelisted items
 */
async function getPrelistedItems(departmentId, itemType = null) {
  try {
    let query = `
      SELECT item_id, item_code, item_name, item_description
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.prelisted_items\`
      WHERE department_id = @departmentId
    `;
    
    const params = { departmentId };
    
    if (itemType) {
      query += ' AND item_type = @itemType';
      params.itemType = itemType;
    }
    
    query += ' ORDER BY usage_count DESC LIMIT 20';
    
    const options = {
      query: query,
      location: 'US',
      params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting prelisted items:', error);
    return [];
  }
}

/**
 * Update item usage count
 * @param {string} itemId - Item ID
 */
async function updateItemUsage(itemId) {
  try {
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.prelisted_items\`
      SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP()
      WHERE item_id = @itemId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: { itemId }
    };
    
    await bigquery.createQueryJob(options);
  } catch (error) {
    console.error('Error updating item usage:', error);
  }
}

// Export functions
module.exports = {
  generateContextualActions,
  getPrelistedItems,
  updateActionUsage,
  updateItemUsage
};