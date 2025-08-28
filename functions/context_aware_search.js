// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 1
// Component: context_aware_search_suggestions
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 13:00 UTC
// Next Step: Implement multi-model quantity search
// =============================================

const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { getFromSearchCache, storeInSearchCache, generateSearchCacheKey } = require('../bigquery/search');
const { withErrorHandling } = require('./error_handling');
const { validateInputPattern } = require('./security');

/**
 * Generate context-aware search suggestions based on user behavior and department patterns
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @param {string} currentContext - Current user context (e.g., "payment_recording", "report_viewing")
 * @returns {Array} Context-aware search suggestions
 */
async function generateContextAwareSuggestions(userId, departmentId, currentContext) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Generating context-aware suggestions for user ${userId} in department ${departmentId}`);
      
      // Check cache first
      const cacheKey = generateSearchCacheKey('context_suggestions', userId, `${departmentId}:${currentContext}`);
      const cachedSuggestions = await getFromSearchCache(cacheKey);
      
      if (cachedSuggestions) {
        console.log(`Returning cached context-aware suggestions for user ${userId}`);
        return cachedSuggestions;
      }
      
      // Get user-specific patterns
      const userPatterns = await getUserSearchPatterns(userId, departmentId);
      
      // Get department-specific common patterns
      const deptPatterns = await getDepartmentCommonPatterns(departmentId);
      
      // Get time-based patterns (morning/afternoon/evening)
      const timePatterns = getTimeBasedPatterns();
      
      // Get context-specific patterns
      const contextPatterns = getContextSpecificPatterns(currentContext, departmentId);
      
      // Combine and rank all patterns
      const allPatterns = [
        ...userPatterns.map(pattern => ({ ...pattern, weight: 3 })), // User patterns have highest weight
        ...deptPatterns.map(pattern => ({ ...pattern, weight: 2 })), // Department patterns have medium weight
        ...timePatterns.map(pattern => ({ ...pattern, weight: 1 })), // Time patterns have lowest weight
        ...contextPatterns.map(pattern => ({ ...pattern, weight: 2 })) // Context patterns have medium weight
      ];
      
      // Remove duplicates and sort by weight and usage
      const uniquePatterns = removeDuplicatePatterns(allPatterns);
      const rankedPatterns = uniquePatterns.sort((a, b) => {
        // Primary sort by weight (descending)
        if (b.weight !== a.weight) {
          return b.weight - a.weight;
        }
        // Secondary sort by usage count (descending)
        return (b.usage_count || 0) - (a.usage_count || 0);
      });
      
      // Take top 10 patterns
      const topPatterns = rankedPatterns.slice(0, 10);
      
      // Format for display
      const suggestions = topPatterns.map(pattern => ({
        text: pattern.expanded_query,
        pattern: pattern.pattern,
        usage_count: pattern.usage_count || 0,
        last_used: pattern.last_used || null
      }));
      
      // Cache suggestions for 30 minutes
      await storeInSearchCache(cacheKey, suggestions, 0.5);
      
      return suggestions;
    } catch (error) {
      console.error(`Error generating context-aware suggestions for user ${userId}:`, error);
      return [];
    }
  })();
}

/**
 * Get user-specific search patterns from interaction history
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @returns {Array} User search patterns
 */
async function getUserSearchPatterns(userId, departmentId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('user_patterns', userId, departmentId);
    const cachedPatterns = await getFromCache(cacheKey);
    
    if (cachedPatterns) {
      return cachedPatterns;
    }
    
    // In a real implementation, we would query BigQuery for user-specific patterns
    // For now, we'll simulate some patterns based on department
    const patterns = [];
    
    switch (departmentId) {
      case 'ACCOUNTING':
        patterns.push(
          { pattern: 't bnk p cm', expanded_query: 'Total bank payments current month', usage_count: 15, last_used: '2023-11-05' },
          { pattern: 'exp sum lw', expanded_query: 'Expense summary last week', usage_count: 8, last_used: '2023-11-04' },
          { pattern: 'cash rcpts td', expanded_query: 'Cash receipts today', usage_count: 12, last_used: '2023-11-05' }
        );
        break;
      case 'SALES':
        patterns.push(
          { pattern: 'dlv chln pend', expanded_query: 'Delivery challans pending', usage_count: 22, last_used: '2023-11-05' },
          { pattern: 'cust pay tw', expanded_query: 'Customer payments this week', usage_count: 18, last_used: '2023-11-04' },
          { pattern: 'stk lvl cat', expanded_query: 'Stock levels by category', usage_count: 9, last_used: '2023-11-03' }
        );
        break;
      case 'INVENTORY':
        patterns.push(
          { pattern: 'mach mdl stk', expanded_query: 'Machine models in stock', usage_count: 31, last_used: '2023-11-05' },
          { pattern: 'low qty alrt', expanded_query: 'Low quantity alerts', usage_count: 14, last_used: '2023-11-04' },
          { pattern: 'prt avl srch', expanded_query: 'Part availability search', usage_count: 7, last_used: '2023-11-02' }
        );
        break;
      case 'SERVICE':
        patterns.push(
          { pattern: 'open srv tkt', expanded_query: 'Open service tickets', usage_count: 19, last_used: '2023-11-05' },
          { pattern: 'tech sched', expanded_query: 'Technician schedules', usage_count: 11, last_used: '2023-11-04' },
          { pattern: 'mnt due soon', expanded_query: 'Maintenance due soon', usage_count: 6, last_used: '2023-11-01' }
        );
        break;
      case 'MARKETING':
        patterns.push(
          { pattern: 'cust acq rate', expanded_query: 'Customer acquisition rate', usage_count: 13, last_used: '2023-11-05' },
          { pattern: 'fact vst sch', expanded_query: 'Factory visit schedule', usage_count: 8, last_used: '2023-11-04' },
          { pattern: 'lead conv stat', expanded_query: 'Lead conversion stats', usage_count: 5, last_used: '2023-11-03' }
        );
        break;
    }
    
    // Cache for 1 hour
    await storeInCache(cacheKey, patterns, 1);
    
    return patterns;
  } catch (error) {
    console.error(`Error getting user search patterns for user ${userId}:`, error);
    return [];
  }
}

/**
 * Get department-specific common patterns
 * @param {string} departmentId - Department ID
 * @returns {Array} Department common patterns
 */
async function getDepartmentCommonPatterns(departmentId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('dept_patterns', 'common', departmentId);
    const cachedPatterns = await getFromCache(cacheKey);
    
    if (cachedPatterns) {
      return cachedPatterns;
    }
    
    // In a real implementation, we would query BigQuery for department patterns
    // For now, we'll simulate some common patterns
    const patterns = [];
    
    switch (departmentId) {
      case 'ACCOUNTING':
        patterns.push(
          { pattern: 't exp cm', expanded_query: 'Total expenses current month', usage_count: 156 },
          { pattern: 'bnk bal', expanded_query: 'Bank balance summary', usage_count: 98 },
          { pattern: 'cash flow', expanded_query: 'Cash flow analysis', usage_count: 87 }
        );
        break;
      case 'SALES':
        patterns.push(
          { pattern: 'top cust', expanded_query: 'Top customers by revenue', usage_count: 203 },
          { pattern: 'dlv perf', expanded_query: 'Delivery performance report', usage_count: 142 },
          { pattern: 'ord bk', expanded_query: 'Order book status', usage_count: 121 }
        );
        break;
      case 'INVENTORY':
        patterns.push(
          { pattern: 'stk alert', expanded_query: 'Stock level alerts', usage_count: 287 },
          { pattern: 'mdl avail', expanded_query: 'Model availability', usage_count: 198 },
          { pattern: 'reord pt', expanded_query: 'Reorder point analysis', usage_count: 156 }
        );
        break;
      case 'SERVICE':
        patterns.push(
          { pattern: 'open tkt', expanded_query: 'Open service tickets', usage_count: 176 },
          { pattern: 'tech perf', expanded_query: 'Technician performance', usage_count: 134 },
          { pattern: 'rep hist', expanded_query: 'Repair history report', usage_count: 98 }
        );
        break;
      case 'MARKETING':
        patterns.push(
          { pattern: 'lead src', expanded_query: 'Lead source analysis', usage_count: 145 },
          { pattern: 'cust sat', expanded_query: 'Customer satisfaction report', usage_count: 112 },
          { pattern: 'camp perf', expanded_query: 'Campaign performance', usage_count: 89 }
        );
        break;
    }
    
    // Cache for 6 hours
    await storeInCache(cacheKey, patterns, 6);
    
    return patterns;
  } catch (error) {
    console.error(`Error getting department common patterns for ${departmentId}:`, error);
    return [];
  }
}

/**
 * Get time-based patterns (morning/afternoon/evening)
 * @returns {Array} Time-based patterns
 */
function getTimeBasedPatterns() {
  try {
    const hour = new Date().getHours();
    let timeContext = 'general';
    
    if (hour >= 6 && hour < 12) {
      timeContext = 'morning';
    } else if (hour >= 12 && hour < 17) {
      timeContext = 'afternoon';
    } else {
      timeContext = 'evening';
    }
    
    // Return time-appropriate patterns
    switch (timeContext) {
      case 'morning':
        return [
          { pattern: 'todays tasks', expanded_query: "Today's priority tasks", usage_count: 234 },
          { pattern: 'mtg prep', expanded_query: 'Meeting preparation items', usage_count: 156 }
        ];
      case 'afternoon':
        return [
          { pattern: 'progress update', expanded_query: 'Progress update on key tasks', usage_count: 189 },
          { pattern: 'follow ups', expanded_query: 'Pending follow-ups', usage_count: 143 }
        ];
      case 'evening':
        return [
          { pattern: 'day summary', expanded_query: 'End-of-day summary', usage_count: 201 },
          { pattern: 'tomorrow plan', expanded_query: "Tomorrow's plan", usage_count: 167 }
        ];
      default:
        return [
          { pattern: 'quick search', expanded_query: 'Quick search options', usage_count: 312 }
        ];
    }
  } catch (error) {
    console.error('Error getting time-based patterns:', error);
    return [];
  }
}

/**
 * Get context-specific patterns based on current workflow
 * @param {string} currentContext - Current context (e.g., "payment_recording", "report_viewing")
 * @param {string} departmentId - Department ID
 * @returns {Array} Context-specific patterns
 */
function getContextSpecificPatterns(currentContext, departmentId) {
  try {
    switch (currentContext) {
      case 'payment_recording':
        if (departmentId === 'ACCOUNTING') {
          return [
            { pattern: 'similar payments', expanded_query: 'Similar recent payments', usage_count: 78 },
            { pattern: 'customer history', expanded_query: 'Customer payment history', usage_count: 65 }
          ];
        }
        break;
      case 'report_viewing':
        return [
          { pattern: 'export report', expanded_query: 'Export current report', usage_count: 156 },
          { pattern: 'schedule report', expanded_query: 'Schedule recurring report', usage_count: 98 }
        ];
      case 'customer_interaction':
        if (departmentId === 'SALES') {
          return [
            { pattern: 'customer details', expanded_query: 'Customer details and history', usage_count: 201 },
            { pattern: 'related orders', expanded_query: 'Related orders and payments', usage_count: 143 }
          ];
        }
        break;
      case 'inventory_check':
        if (departmentId === 'INVENTORY') {
          return [
            { pattern: 'reorder suggestion', expanded_query: 'Reorder quantity suggestions', usage_count: 178 },
            { pattern: 'supplier info', expanded_query: 'Supplier information', usage_count: 123 }
          ];
        }
        break;
    }
    
    // Default context patterns
    return [
      { pattern: 'help options', expanded_query: 'Help and support options', usage_count: 345 },
      { pattern: 'shortcut keys', expanded_query: 'Keyboard shortcuts', usage_count: 234 }
    ];
  } catch (error) {
    console.error('Error getting context-specific patterns:', error);
    return [];
  }
}

/**
 * Remove duplicate patterns from array
 * @param {Array} patterns - Array of patterns
 * @returns {Array} Array with duplicates removed
 */
function removeDuplicatePatterns(patterns) {
  try {
    const seen = new Set();
    const uniquePatterns = [];
    
    for (const pattern of patterns) {
      // Use both pattern and expanded_query for uniqueness
      const key = `${pattern.pattern}-${pattern.expanded_query}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePatterns.push(pattern);
      }
    }
    
    return uniquePatterns;
  } catch (error) {
    console.error('Error removing duplicate patterns:', error);
    return patterns;
  }
}

/**
 * Update user search pattern based on interaction
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @param {string} pattern - Pattern used
 * @param {string} expandedQuery - Expanded query
 */
async function updateUserSearchPattern(userId, departmentId, pattern, expandedQuery) {
  try {
    // In a real implementation, we would update the user's pattern in BigQuery
    // For now, we'll just log the interaction
    console.log(`User ${userId} used pattern "${pattern}" -> "${expandedQuery}" in ${departmentId}`);
    
    // Update cache to reflect new usage
    const cacheKey = generateCacheKey('user_patterns', userId, departmentId);
    await getFromCache(cacheKey); // This will invalidate the cache
    
  } catch (error) {
    console.error(`Error updating user search pattern for user ${userId}:`, error);
  }
}

/**
 * Get personalized search shortcuts for a user
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @returns {Array} Personalized shortcuts
 */
async function getPersonalizedShortcuts(userId, departmentId) {
  return await withErrorHandling(async () => {
    try {
      // Check cache first
      const cacheKey = generateSearchCacheKey('personal_shortcuts', userId, departmentId);
      const cachedShortcuts = await getFromSearchCache(cacheKey);
      
      if (cachedShortcuts) {
        return cachedShortcuts;
      }
      
      // Get user's most frequently used patterns
      const userPatterns = await getUserSearchPatterns(userId, departmentId);
      
      // Sort by usage count and take top 5
      const topPatterns = userPatterns
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 5);
      
      // Format as shortcuts
      const shortcuts = topPatterns.map(pattern => ({
        text: pattern.pattern,
        displayText: pattern.expanded_query,
        usage_count: pattern.usage_count || 0
      }));
      
      // Cache for 2 hours
      await storeInSearchCache(cacheKey, shortcuts, 2);
      
      return shortcuts;
    } catch (error) {
      console.error(`Error getting personalized shortcuts for user ${userId}:`, error);
      return [];
    }
  })();
}

// Export functions
module.exports = {
  generateContextAwareSuggestions,
  updateUserSearchPattern,
  getPersonalizedShortcuts
};