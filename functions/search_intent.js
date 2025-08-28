// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 1
// Component: search_intent_processing
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 12:45 UTC
// Next Step: Implement context-aware search suggestions
// =============================================

const { interpretSearchInput, getFromSearchCache, storeInSearchCache, generateSearchCacheKey } = require('../bigquery/search');
const { getSearchIntentPrediction } = require('../bigquery/bqml_search');
const { getFromCache, storeInCache } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');
const { validateInputPattern } = require('./security');

/**
 * Handle search intent processing with BQML predictions
 * @param {string} userId - User ID
 * @param {string} inputText - Raw user input
 * @param {string} departmentId - Department ID
 * @returns {Object} Search results and suggestions
 */
async function handleSearchIntent(userId, inputText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing search intent for user ${userId}: "${inputText}" in department ${departmentId}`);
      
      // Validate input
      if (!validateInputPattern(inputText, '^[a-zA-Z0-9\\s\\-]+$')) {
        return {
          success: false,
          error: 'Invalid search input. Please use only letters, numbers, spaces, and hyphens.'
        };
      }
      
      // Check if we have cached results for this exact search
      const cacheKey = generateSearchCacheKey('search_results', userId, `${departmentId}:${inputText}`);
      const cachedResults = await getFromSearchCache(cacheKey);
      
      if (cachedResults) {
        console.log(`Returning cached search results for user ${userId}`);
        return {
          success: true,
          results: cachedResults.results,
          alternatives: cachedResults.alternatives,
          confidenceScore: cachedResults.confidenceScore,
          fromCache: true
        };
      }
      
      // Interpret the search input
      const interpreted = await interpretSearchInput(userId, inputText, departmentId);
      
      // Get BQML prediction for search success
      const prediction = await getSearchIntentPrediction(
        userId,
        departmentId,
        inputText,
        interpreted.interpretedQuery,
        interpreted.queryType,
        interpreted.confidenceScore
      );
      
      // Generate search results based on interpreted query
      const searchResults = await executeSearchQuery(userId, interpreted.interpretedQuery, departmentId);
      
      // Generate alternative suggestions
      const alternatives = await generateSearchAlternatives(userId, inputText, departmentId, interpreted);
      
      // Prepare response
      const response = {
        success: true,
        results: searchResults,
        alternatives: alternatives,
        confidenceScore: interpreted.confidenceScore,
        predictedSuccess: prediction ? prediction.predictedSuccessfulCompletion : null,
        successProbability: prediction ? prediction.successProbability : null,
        interpretedQuery: interpreted.interpretedQuery,
        queryType: interpreted.queryType
      };
      
      // Cache results for future use (short-term cache)
      await storeInSearchCache(cacheKey, response, 0.5); // 30 minutes
      
      return response;
    } catch (error) {
      console.error(`Error processing search intent for user ${userId}:`, error);
      return {
        success: false,
        error: 'An error occurred while processing your search. Please try again.'
      };
    }
  })();
}

/**
 * Execute search query based on interpreted input
 * @param {string} userId - User ID
 * @param {string} interpretedQuery - Interpreted query
 * @param {string} departmentId - Department ID
 * @returns {Array} Search results
 */
async function executeSearchQuery(userId, interpretedQuery, departmentId) {
  try {
    // Check cache first
    const cacheKey = generateSearchCacheKey('query_results', userId, `${departmentId}:${interpretedQuery}`);
    const cachedResults = await getFromCache(cacheKey);
    
    if (cachedResults) {
      return cachedResults;
    }
    
    // Determine query type based on department and keywords
    const lowerQuery = interpretedQuery.toLowerCase();
    let results = [];
    
    switch (departmentId) {
      case 'ACCOUNTING':
        results = await executeAccountingQuery(interpretedQuery, lowerQuery);
        break;
      case 'SALES':
        results = await executeSalesQuery(interpretedQuery, lowerQuery);
        break;
      case 'INVENTORY':
        results = await executeInventoryQuery(interpretedQuery, lowerQuery);
        break;
      case 'SERVICE':
        results = await executeServiceQuery(interpretedQuery, lowerQuery);
        break;
      case 'MARKETING':
        results = await executeMarketingQuery(interpretedQuery, lowerQuery);
        break;
      default:
        results = await executeGeneralQuery(interpretedQuery, lowerQuery, departmentId);
    }
    
    // Cache results
    await storeInCache(cacheKey, results, 1); // 1 hour cache
    
    return results;
  } catch (error) {
    console.error(`Error executing search query for department ${departmentId}:`, error);
    return [];
  }
}

/**
 * Execute accounting-specific query
 * @param {string} query - Original query
 * @param {string} lowerQuery - Lowercase query
 * @returns {Array} Search results
 */
async function executeAccountingQuery(query, lowerQuery) {
  try {
    // Simulate accounting data retrieval
    const results = [];
    
    // Payment-related queries
    if (lowerQuery.includes('payment') || lowerQuery.includes('pay') || lowerQuery.includes('receipt')) {
      results.push({
        type: 'PAYMENT_SUMMARY',
        title: 'Recent Payments',
        description: 'Total payments in the last 30 days',
        value: '৳1,250,000',
        context: '30-day total'
      });
    }
    
    // Bank-related queries
    if (lowerQuery.includes('bank')) {
      results.push({
        type: 'BANK_BALANCE',
        title: 'Bank Balance',
        description: 'Current balance in main account',
        value: '৳850,000',
        context: 'Account #1234'
      });
    }
    
    // Expense-related queries
    if (lowerQuery.includes('expense') || lowerQuery.includes('cost')) {
      results.push({
        type: 'EXPENSE_SUMMARY',
        title: 'Monthly Expenses',
        description: 'Total expenses this month',
        value: '৳425,000',
        context: 'Current month'
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error executing accounting query:', error);
    return [];
  }
}

/**
 * Execute sales-specific query
 * @param {string} query - Original query
 * @param {string} lowerQuery - Lowercase query
 * @returns {Array} Search results
 */
async function executeSalesQuery(query, lowerQuery) {
  try {
    // Simulate sales data retrieval
    const results = [];
    
    // Challan-related queries
    if (lowerQuery.includes('challan') || lowerQuery.includes('delivery')) {
      results.push({
        type: 'DELIVERY_CHALLAN',
        title: 'Pending Deliveries',
        description: 'Challans awaiting delivery',
        value: '12',
        context: 'This week'
      });
    }
    
    // Customer-related queries
    if (lowerQuery.includes('customer') || lowerQuery.includes('client')) {
      results.push({
        type: 'CUSTOMER_COUNT',
        title: 'Active Customers',
        description: 'Customers with activity this month',
        value: '142',
        context: 'This month'
      });
    }
    
    // Payment-related queries
    if (lowerQuery.includes('payment') || lowerQuery.includes('received')) {
      results.push({
        type: 'PAYMENT_RECEIVED',
        title: 'Payments Received',
        description: 'Total payments this month',
        value: '৳980,000',
        context: 'This month'
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error executing sales query:', error);
    return [];
  }
}

/**
 * Execute inventory-specific query
 * @param {string} query - Original query
 * @param {string} lowerQuery - Lowercase query
 * @returns {Array} Search results
 */
async function executeInventoryQuery(query, lowerQuery) {
  try {
    // Simulate inventory data retrieval
    const results = [];
    
    // Stock-related queries
    if (lowerQuery.includes('stock') || lowerQuery.includes('quantity') || lowerQuery.includes('qty')) {
      results.push({
        type: 'STOCK_LEVEL',
        title: 'Low Stock Items',
        description: 'Items below minimum threshold',
        value: '8',
        context: 'Require attention'
      });
    }
    
    // Machine-related queries
    if (lowerQuery.includes('machine') || lowerQuery.includes('model')) {
      results.push({
        type: 'MACHINE_AVAILABILITY',
        title: 'Available Machines',
        description: 'Models currently in stock',
        value: '24',
        context: 'Across all branches'
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error executing inventory query:', error);
    return [];
  }
}

/**
 * Execute service-specific query
 * @param {string} query - Original query
 * @param {string} lowerQuery - Lowercase query
 * @returns {Array} Search results
 */
async function executeServiceQuery(query, lowerQuery) {
  try {
    // Simulate service data retrieval
    const results = [];
    
    // Ticket-related queries
    if (lowerQuery.includes('ticket') || lowerQuery.includes('service')) {
      results.push({
        type: 'SERVICE_TICKETS',
        title: 'Open Tickets',
        description: 'Tickets requiring attention',
        value: '5',
        context: 'High priority'
      });
    }
    
    // Technician-related queries
    if (lowerQuery.includes('technician') || lowerQuery.includes('tech')) {
      results.push({
        type: 'TECHNICIAN_SCHEDULE',
        title: 'Available Technicians',
        description: 'Technicians free for assignment',
        value: '3',
        context: 'Today'
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error executing service query:', error);
    return [];
  }
}

/**
 * Execute marketing-specific query
 * @param {string} query - Original query
 * @param {string} lowerQuery - Lowercase query
 * @returns {Array} Search results
 */
async function executeMarketingQuery(query, lowerQuery) {
  try {
    // Simulate marketing data retrieval
    const results = [];
    
    // Customer-related queries
    if (lowerQuery.includes('customer') || lowerQuery.includes('client')) {
      results.push({
        type: 'CUSTOMER_GROWTH',
        title: 'New Customers',
        description: 'Customers acquired this month',
        value: '24',
        context: '+12% from last month'
      });
    }
    
    // Visit-related queries
    if (lowerQuery.includes('visit') || lowerQuery.includes('factory')) {
      results.push({
        type: 'FACTORY_VISITS',
        title: 'Scheduled Visits',
        description: 'Factory visits planned',
        value: '7',
        context: 'This week'
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error executing marketing query:', error);
    return [];
  }
}

/**
 * Execute general query for other departments
 * @param {string} query - Original query
 * @param {string} lowerQuery - Lowercase query
 * @param {string} departmentId - Department ID
 * @returns {Array} Search results
 */
async function executeGeneralQuery(query, lowerQuery, departmentId) {
  try {
    // Simulate general data retrieval
    return [
      {
        type: 'GENERAL_INFO',
        title: 'General Information',
        description: `Search results for "${query}" in ${departmentId}`,
        value: 'Information available',
        context: 'General search'
      }
    ];
  } catch (error) {
    console.error('Error executing general query:', error);
    return [];
  }
}

/**
 * Generate alternative search suggestions
 * @param {string} userId - User ID
 * @param {string} inputText - Original input text
 * @param {string} departmentId - Department ID
 * @param {Object} interpreted - Interpreted search object
 * @returns {Array} Alternative suggestions
 */
async function generateSearchAlternatives(userId, inputText, departmentId, interpreted) {
  try {
    // Check cache first
    const cacheKey = generateSearchCacheKey('alternatives', userId, `${departmentId}:${inputText}`);
    const cachedAlternatives = await getFromSearchCache(cacheKey);
    
    if (cachedAlternatives) {
      return cachedAlternatives;
    }
    
    // Generate alternatives based on input and department
    const alternatives = [];
    
    // Add common alternatives based on department
    switch (departmentId) {
      case 'ACCOUNTING':
        alternatives.push(
          { text: 'Total bank payments current month', pattern: 't bnk p cm' },
          { text: 'Expense summary last week', pattern: 'exp sum lw' },
          { text: 'Cash receipts today', pattern: 'cash rcpts td' }
        );
        break;
      case 'SALES':
        alternatives.push(
          { text: 'Delivery challans pending', pattern: 'dlv chln pend' },
          { text: 'Customer payments this week', pattern: 'cust pay tw' },
          { text: 'Stock levels by category', pattern: 'stk lvl cat' }
        );
        break;
      case 'INVENTORY':
        alternatives.push(
          { text: 'Machine models in stock', pattern: 'mach mdl stk' },
          { text: 'Low quantity alerts', pattern: 'low qty alrt' },
          { text: 'Part availability search', pattern: 'prt avl srch' }
        );
        break;
      case 'SERVICE':
        alternatives.push(
          { text: 'Open service tickets', pattern: 'open srv tkt' },
          { text: 'Technician schedules', pattern: 'tech sched' },
          { text: 'Maintenance due soon', pattern: 'mnt due soon' }
        );
        break;
      case 'MARKETING':
        alternatives.push(
          { text: 'Customer acquisition rate', pattern: 'cust acq rate' },
          { text: 'Factory visit schedule', pattern: 'fact vst sch' },
          { text: 'Lead conversion stats', pattern: 'lead conv stat' }
        );
        break;
    }
    
    // Add contextually relevant alternatives based on interpreted query
    if (interpreted.queryType === 'PAYMENT') {
      alternatives.push(
        { text: 'Payment by method breakdown', pattern: 'pay meth brk' },
        { text: 'Late payments report', pattern: 'late pay rpt' }
      );
    } else if (interpreted.queryType === 'CHALLAN') {
      alternatives.push(
        { text: 'Challan status tracking', pattern: 'chln stat trk' },
        { text: 'Delayed deliveries', pattern: 'delay dlv' }
      );
    } else if (interpreted.queryType === 'STOCK') {
      alternatives.push(
        { text: 'Stock movement report', pattern: 'stk mov rpt' },
        { text: 'Reorder point alerts', pattern: 'reord pt alrt' }
      );
    }
    
    // Limit to 5 alternatives max
    const finalAlternatives = alternatives.slice(0, 5);
    
    // Cache alternatives
    await storeInSearchCache(cacheKey, finalAlternatives, 2); // 2 hour cache
    
    return finalAlternatives;
  } catch (error) {
    console.error('Error generating search alternatives:', error);
    return [];
  }
}

// Export functions
module.exports = {
  handleSearchIntent,
  executeSearchQuery,
  generateSearchAlternatives
};