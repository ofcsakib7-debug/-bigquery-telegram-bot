// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 1
// Component: search_ui_integration
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 13:45 UTC
// Next Step: Implement search analytics dashboard
// =============================================

const { handleSearchIntent } = require('./search_intent');
const { generateContextAwareSuggestions } = require('./context_aware_search');
const { handleMultiModelQuantitySearch } = require('./multi_model_search');
const { handleMarketingRecentQuotes } = require('./marketing_quotes');
const { withErrorHandling } = require('./error_handling');
const { validateInputPattern } = require('./security');

/**
 * Handle search UI interactions
 * @param {string} userId - User ID
 * @param {string} inputText - User input
 * @param {string} departmentId - Department ID
 * @param {string} currentContext - Current context
 * @returns {Object} UI response with search results and suggestions
 */
async function handleSearchUIInteraction(userId, inputText, departmentId, currentContext) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Handling search UI interaction for user ${userId}: "${inputText}"`);
      
      // Validate input
      if (!inputText || inputText.trim().length === 0) {
        return {
          success: false,
          error: 'Please enter a search query'
        };
      }
      
      // Normalize input
      const normalizedInput = inputText.trim().toLowerCase();
      
      // Check for special commands or patterns
      if (normalizedInput === 'help') {
        return generateSearchHelpResponse(departmentId);
      }
      
      if (normalizedInput === 'examples') {
        return generateSearchExamplesResponse(departmentId);
      }
      
      // Check for multi-model quantity search pattern
      if (isMultiModelQuantitySearch(normalizedInput)) {
        return await handleMultiModelQuantitySearch(userId, normalizedInput, departmentId);
      }
      
      // Check for marketing-specific commands
      if (departmentId === 'MARKETING' && isMarketingCommand(normalizedInput)) {
        return await handleMarketingCommand(userId, normalizedInput);
      }
      
      // Handle regular search intent
      const searchResults = await handleSearchIntent(userId, normalizedInput, departmentId);
      
      // Generate context-aware suggestions
      const suggestions = await generateContextAwareSuggestions(userId, departmentId, currentContext);
      
      // Prepare UI response
      const response = {
        success: true,
        results: searchResults.results || [],
        alternatives: searchResults.alternatives || [],
        suggestions: suggestions,
        confidenceScore: searchResults.confidenceScore || 0,
        predictedSuccess: searchResults.predictedSuccess,
        successProbability: searchResults.successProbability,
        interpretedQuery: searchResults.interpretedQuery,
        queryType: searchResults.queryType,
        inputParsed: normalizedInput
      };
      
      return response;
    } catch (error) {
      console.error(`Error handling search UI interaction for user ${userId}:`, error);
      return {
        success: false,
        error: 'An error occurred while processing your search. Please try again.'
      };
    }
  })();
}

/**
 * Check if input is a multi-model quantity search
 * @param {string} input - User input
 * @returns {boolean} True if multi-model quantity search pattern
 */
function isMultiModelQuantitySearch(input) {
  try {
    // Multi-model format: model_code=quantity (e.g., "a2b=2 e4s=3")
    const multiModelRegex = /^([a-z0-9]{2,4}=\d{1,2}\s*)+$/i;
    return multiModelRegex.test(input.trim());
  } catch (error) {
    console.error('Error checking multi-model search pattern:', error);
    return false;
  }
}

/**
 * Check if input is a marketing-specific command
 * @param {string} input - User input
 * @returns {boolean} True if marketing command
 */
function isMarketingCommand(input) {
  try {
    const marketingCommands = [
      'recent quotes',
      'quote trends',
      'pricing intel',
      'customer analysis',
      'top customers',
      'quote history'
    ];
    
    return marketingCommands.some(cmd => input.includes(cmd));
  } catch (error) {
    console.error('Error checking marketing command:', error);
    return false;
  }
}

/**
 * Handle marketing-specific commands
 * @param {string} userId - User ID
 * @param {string} input - User input
 * @returns {Object} Marketing command response
 */
async function handleMarketingCommand(userId, input) {
  try {
    // Parse command
    if (input.includes('recent quotes') || input.includes('quote history')) {
      // Extract parameters (customer, model, days)
      let customerId = null;
      let modelCode = null;
      let days = 30;
      
      // Try to extract customer ID/name
      const customerMatch = input.match(/customer[:\s]+([a-zA-Z0-9\-]+)/i);
      if (customerMatch) {
        customerId = customerMatch[1];
      }
      
      // Try to extract model code
      const modelMatch = input.match(/model[:\s]+([a-zA-Z0-9]{2,4})/i);
      if (modelMatch) {
        modelCode = modelMatch[1];
      }
      
      // Try to extract days
      const daysMatch = input.match(/(\d+)\s*(day|week|month)s?/i);
      if (daysMatch) {
        const number = parseInt(daysMatch[1], 10);
        const unit = daysMatch[2].toLowerCase();
        
        if (unit.startsWith('week')) {
          days = number * 7;
        } else if (unit.startsWith('month')) {
          days = number * 30;
        } else {
          days = number;
        }
      }
      
      return await handleMarketingRecentQuotes(userId, customerId, modelCode, days);
    }
    
    if (input.includes('quote trends')) {
      // Extract days parameter
      let days = 30;
      const daysMatch = input.match(/(\d+)\s*(day|week|month)s?/i);
      if (daysMatch) {
        const number = parseInt(daysMatch[1], 10);
        const unit = daysMatch[2].toLowerCase();
        
        if (unit.startsWith('week')) {
          days = number * 7;
        } else if (unit.startsWith('month')) {
          days = number * 30;
        } else {
          days = number;
        }
      }
      
      const { getQuoteTrends } = require('./marketing_quotes');
      return await getQuoteTrends(userId, days);
    }
    
    if (input.includes('pricing intel') || input.includes('pricing intelligence')) {
      // Extract model code
      const modelMatch = input.match(/model[:\s]+([a-zA-Z0-9]{2,4})/i);
      if (modelMatch) {
        const modelCode = modelMatch[1];
        const { getPricingIntelligence } = require('./marketing_quotes');
        return await getPricingIntelligence(userId, modelCode);
      } else {
        return {
          success: false,
          error: 'Please specify a model code for pricing intelligence (e.g., "pricing intel model a2b")'
        };
      }
    }
    
    return {
      success: false,
      error: 'Unknown marketing command. Try "recent quotes", "quote trends", or "pricing intel model [code]"'
    };
  } catch (error) {
    console.error(`Error handling marketing command for user ${userId}:`, error);
    return {
      success: false,
      error: 'An error occurred while processing your marketing command.'
    };
  }
}

/**
 * Generate search help response
 * @param {string} departmentId - Department ID
 * @returns {Object} Help response
 */
function generateSearchHelpResponse(departmentId) {
  try {
    const helpTexts = {
      ACCOUNTING: `
*Accounting Department Search Help*

📚 *Common Searches:*
• "t bnk p cm" - Total bank payments current month
• "exp sum lw" - Expense summary last week
• "cash rcpts td" - Cash receipts today
• "t exp ly" - Total expenses last year

📊 *Report Searches:*
• "bal sheet" - Balance sheet summary
• "inc stmt" - Income statement
• "cash flow" - Cash flow analysis

💳 *Payment Searches:*
• "late pay" - Late payments report
• "rec pay" - Recently received payments
• "pay meth" - Payment method breakdown
`,
      
      SALES: `
*Sales Department Search Help*

📚 *Common Searches:*
• "dlv chln pend" - Delivery challans pending
• "cust pay tw" - Customer payments this week
• "stk lvl cat" - Stock levels by category
• "top cust" - Top customers by revenue

🚚 *Delivery Searches:*
• "delay dlv" - Delayed deliveries
• "chln stat" - Challan status tracking
• "cust dlv" - Customer delivery history

💰 *Payment Searches:*
• "outstand pay" - Outstanding payments
• "rec pay" - Recently received payments
• "pay trend" - Payment trends
`,
      
      INVENTORY: `
*Inventory Department Search Help*

📚 *Common Searches:*
• "mach mdl stk" - Machine models in stock
• "low qty alrt" - Low quantity alerts
• "prt avl srch" - Part availability search
• "reord pt alrt" - Reorder point alerts

📦 *Stock Searches:*
• "stk mov" - Stock movement report
• "inv val" - Inventory valuation
• "slow mov" - Slow-moving items

🛠️ *Machine Searches:*
• "mdl spec" - Model specifications
• "rep hist" - Repair history
• "mnt sched" - Maintenance schedule
`,
      
      SERVICE: `
*Service Department Search Help*

📚 *Common Searches:*
• "open srv tkt" - Open service tickets
• "tech sched" - Technician schedules
• "mnt due soon" - Maintenance due soon
• "rep hist" - Repair history

🔧 *Ticket Searches:*
• "high prio" - High priority tickets
• "pend tech" - Pending technician assignment
• "overdue" - Overdue tickets

👨‍🔧 *Technician Searches:*
• "tech perf" - Technician performance
• "tech load" - Technician workload
• "skill mat" - Skill matrix
`,
      
      MARKETING: `
*Marketing Department Search Help*

📚 *Common Searches:*
• "cust acq rate" - Customer acquisition rate
• "fact vst sch" - Factory visit schedule
• "lead conv stat" - Lead conversion stats
• "camp perf" - Campaign performance

👥 *Customer Searches:*
• "top cust" - Top customers
• "new leads" - New leads this week
• "cust sat" - Customer satisfaction

📊 *Analytics:*
• "quote trends" - Quote trends
• "pricing intel model [code]" - Pricing intelligence
• "recent quotes" - Recent customer quotes
`,
      
      GENERAL: `
*General Search Help*

🔍 *How to Search:*
• Use abbreviations (e.g., "t" for "total", "cm" for "current month")
• Combine terms with spaces
• Use context clues for better results

📌 *Examples by Department:*
• Accounting: "t bnk p cm"
• Sales: "dlv chln pend"
• Inventory: "mach mdl stk"
• Service: "open srv tkt"
• Marketing: "cust acq rate"

💡 *Pro Tips:*
• Use "help" anytime for department-specific help
• Use "examples" for search examples
• Try context-aware suggestions below
`
    };
    
    return {
      success: true,
      helpText: helpTexts[departmentId] || helpTexts.GENERAL,
      department: departmentId
    };
  } catch (error) {
    console.error('Error generating search help response:', error);
    return {
      success: false,
      error: 'An error occurred while generating help information.'
    };
  }
}

/**
 * Generate search examples response
 * @param {string} departmentId - Department ID
 * @returns {Object} Examples response
 */
function generateSearchExamplesResponse(departmentId) {
  try {
    const examples = {
      ACCOUNTING: [
        { text: 't bnk p cm', description: 'Total bank payments current month' },
        { text: 'exp sum lw', description: 'Expense summary last week' },
        { text: 'cash rcpts td', description: 'Cash receipts today' },
        { text: 't exp ly', description: 'Total expenses last year' },
        { text: 'late pay', description: 'Late payments report' }
      ],
      
      SALES: [
        { text: 'dlv chln pend', description: 'Delivery challans pending' },
        { text: 'cust pay tw', description: 'Customer payments this week' },
        { text: 'stk lvl cat', description: 'Stock levels by category' },
        { text: 'top cust', description: 'Top customers by revenue' },
        { text: 'delay dlv', description: 'Delayed deliveries' }
      ],
      
      INVENTORY: [
        { text: 'mach mdl stk', description: 'Machine models in stock' },
        { text: 'low qty alrt', description: 'Low quantity alerts' },
        { text: 'prt avl srch', description: 'Part availability search' },
        { text: 'reord pt alrt', description: 'Reorder point alerts' },
        { text: 'stk mov', description: 'Stock movement report' }
      ],
      
      SERVICE: [
        { text: 'open srv tkt', description: 'Open service tickets' },
        { text: 'tech sched', description: 'Technician schedules' },
        { text: 'mnt due soon', description: 'Maintenance due soon' },
        { text: 'rep hist', description: 'Repair history' },
        { text: 'high prio', description: 'High priority tickets' }
      ],
      
      MARKETING: [
        { text: 'cust acq rate', description: 'Customer acquisition rate' },
        { text: 'fact vst sch', description: 'Factory visit schedule' },
        { text: 'lead conv stat', description: 'Lead conversion stats' },
        { text: 'camp perf', description: 'Campaign performance' },
        { text: 'quote trends', description: 'Quote trends' }
      ],
      
      GENERAL: [
        { text: 'help', description: 'Show help information' },
        { text: 'examples', description: 'Show search examples' },
        { text: 'a2b=2 e4s=3', description: 'Multi-model quantity search' },
        { text: 'recent quotes', description: 'Recent customer quotes (Marketing)' },
        { text: 'pricing intel model a2b', description: 'Pricing intelligence (Marketing)' }
      ]
    };
    
    return {
      success: true,
      examples: examples[departmentId] || examples.GENERAL,
      department: departmentId
    };
  } catch (error) {
    console.error('Error generating search examples response:', error);
    return {
      success: false,
      error: 'An error occurred while generating examples.'
    };
  }
}

/**
 * Generate search UI keyboard with context-aware options
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @param {string} currentContext - Current context
 * @returns {Object} Keyboard configuration
 */
async function generateSearchUIKeyboard(userId, departmentId, currentContext) {
  try {
    // Generate context-aware suggestions
    const suggestions = await generateContextAwareSuggestions(userId, departmentId, currentContext);
    
    // Create keyboard structure
    const keyboard = {
      inline_keyboard: []
    };
    
    // Add search input field
    keyboard.inline_keyboard.push([
      {
        text: '🔍 Enter Search Term...',
        callback_data: 'search:input'
      }
    ]);
    
    // Add context-aware suggestions (max 3 rows of 2 buttons each)
    if (suggestions && suggestions.length > 0) {
      const suggestionButtons = suggestions.slice(0, 6).map(suggestion => ({
        text: suggestion.text.length > 30 ? suggestion.text.substring(0, 27) + '...' : suggestion.text,
        callback_data: `search:suggest:${encodeURIComponent(suggestion.pattern)}`
      }));
      
      // Add suggestions in rows of 2
      for (let i = 0; i < suggestionButtons.length; i += 2) {
        const row = [suggestionButtons[i]];
        if (i + 1 < suggestionButtons.length) {
          row.push(suggestionButtons[i + 1]);
        }
        keyboard.inline_keyboard.push(row);
      }
    }
    
    // Add department-specific quick actions
    const quickActions = getDepartmentQuickActions(departmentId);
    if (quickActions.length > 0) {
      keyboard.inline_keyboard.push([
        {
          text: '⚡ Quick Actions',
          callback_data: 'search:quick_actions'
        }
      ]);
    }
    
    // Add help and examples buttons
    keyboard.inline_keyboard.push([
      {
        text: '❓ Help',
        callback_data: 'search:help'
      },
      {
        text: '📋 Examples',
        callback_data: 'search:examples'
      }
    ]);
    
    return keyboard;
  } catch (error) {
    console.error('Error generating search UI keyboard:', error);
    return {
      inline_keyboard: [
        [{ text: '🔍 Enter Search Term...', callback_data: 'search:input' }],
        [{ text: '❓ Help', callback_data: 'search:help' }]
      ]
    };
  }
}

/**
 * Get department-specific quick actions
 * @param {string} departmentId - Department ID
 * @returns {Array} Quick actions
 */
function getDepartmentQuickActions(departmentId) {
  try {
    const actions = {
      ACCOUNTING: [
        { text: '📊 Reports', callback_data: 'acct:reports' },
        { text: '💳 Payments', callback_data: 'acct:payments' },
        { text: '🧾 Expenses', callback_data: 'acct:expenses' }
      ],
      
      SALES: [
        { text: '📦 Deliveries', callback_data: 'sales:deliveries' },
        { text: '💰 Payments', callback_data: 'sales:payments' },
        { text: '👥 Customers', callback_data: 'sales:customers' }
      ],
      
      INVENTORY: [
        { text: '🛠️ Machines', callback_data: 'inv:machines' },
        { text: '📦 Stock', callback_data: 'inv:stock' },
        { text: '📋 Parts', callback_data: 'inv:parts' }
      ],
      
      SERVICE: [
        { text: '🔧 Tickets', callback_data: 'svc:tickets' },
        { text: '👨‍🔧 Technicians', callback_data: 'svc:techs' },
        { text: '⚙️ Maintenance', callback_data: 'svc:maintenance' }
      ],
      
      MARKETING: [
        { text: '👥 Customers', callback_data: 'mkt:customers' },
        { text: '📈 Analytics', callback_data: 'mkt:analytics' },
        { text: '💬 Visits', callback_data: 'mkt:visits' }
      ]
    };
    
    return actions[departmentId] || [];
  } catch (error) {
    console.error('Error getting department quick actions:', error);
    return [];
  }
}

/**
 * Format search results for UI display
 * @param {Object} searchResults - Search results object
 * @returns {string} Formatted results text
 */
function formatSearchResultsForUI(searchResults) {
  try {
    if (!searchResults || !searchResults.success) {
      return searchResults?.error || 'No results found';
    }
    
    if (!searchResults.results || searchResults.results.length === 0) {
      return 'No results found for your search.';
    }
    
    // Format results based on type
    const formattedResults = searchResults.results.map(result => {
      switch (result.type) {
        case 'PAYMENT_SUMMARY':
          return `💰 *${result.title}*
${result.description}: ${result.value}
_Context: ${result.context}_`;
        
        case 'BANK_BALANCE':
          return `🏦 *${result.title}*
${result.description}: ${result.value}
_Account: ${result.context}_`;
        
        case 'EXPENSE_SUMMARY':
          return `🧾 *${result.title}*
${result.description}: ${result.value}
_Period: ${result.context}_`;
        
        case 'DELIVERY_CHALLAN':
          return `🚚 *${result.title}*
${result.description}: ${result.value}
_Timeline: ${result.context}_`;
        
        case 'CUSTOMER_COUNT':
          return `👥 *${result.title}*
${result.description}: ${result.value}
_Period: ${result.context}_`;
        
        case 'PAYMENT_RECEIVED':
          return `💳 *${result.title}*
${result.description}: ${result.value}
_Period: ${result.context}_`;
        
        case 'STOCK_LEVEL':
          return `📦 *${result.title}*
${result.description}: ${result.value}
_Status: ${result.context}_`;
        
        case 'MACHINE_AVAILABILITY':
          return `🛠️ *${result.title}*
${result.description}: ${result.value}
_Scope: ${result.context}_`;
        
        case 'SERVICE_TICKETS':
          return `🔧 *${result.title}*
${result.description}: ${result.value}
_Priority: ${result.context}_`;
        
        case 'TECHNICIAN_SCHEDULE':
          return `👨‍🔧 *${result.title}*
${result.description}: ${result.value}
_Timeline: ${result.context}_`;
        
        case 'CUSTOMER_GROWTH':
          return `📈 *${result.title}*
${result.description}: ${result.value}
_Trend: ${result.context}_`;
        
        case 'FACTORY_VISITS':
          return `🏭 *${result.title}*
${result.description}: ${result.value}
_Timeline: ${result.context}_`;
        
        default:
          return `📄 *${result.title}*
${result.description}: ${result.value}
_Context: ${result.context}_`;
      }
    });
    
    // Add confidence indicator
    let confidenceText = '';
    if (searchResults.confidenceScore) {
      const confidenceLevel = searchResults.confidenceScore >= 0.8 ? 'High' : 
                             searchResults.confidenceScore >= 0.5 ? 'Medium' : 'Low';
      confidenceText = `

🔍 *Confidence:* ${confidenceLevel} (${Math.round(searchResults.confidenceScore * 100)}%)`;
    }
    
    // Add prediction indicator
    let predictionText = '';
    if (searchResults.predictedSuccess !== undefined) {
      const successText = searchResults.predictedSuccess ? '✅ Likely to succeed' : '⚠️ May need refinement';
      const probabilityText = searchResults.successProbability ? 
        ` (Probability: ${Math.round(searchResults.successProbability * 100)}%)` : '';
      predictionText = `

🔮 *Prediction:* ${successText}${probabilityText}`;
    }
    
    return formattedResults.join('

') + confidenceText + predictionText;
  } catch (error) {
    console.error('Error formatting search results for UI:', error);
    return 'Error formatting search results';
  }
}

// Export functions
module.exports = {
  handleSearchUIInteraction,
  generateSearchUIKeyboard,
  formatSearchResultsForUI
};