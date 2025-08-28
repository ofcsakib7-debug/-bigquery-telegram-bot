// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 1
// Component: multi_model_quantity_search
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 13:15 UTC
// Next Step: Implement marketing team recent quotes
// =============================================

const { getFromSearchCache, storeInSearchCache, generateSearchCacheKey } = require('../bigquery/search');
const { withErrorHandling } = require('./error_handling');
const { validateInputPattern } = require('./security');

/**
 * Handle multi-model quantity search with context awareness
 * @param {string} userId - User ID
 * @param {string} inputText - User input (e.g., "a2b=2 e4s=3 cm")
 * @param {string} departmentId - Department ID
 * @returns {Object} Search results with model information and pricing
 */
async function handleMultiModelQuantitySearch(userId, inputText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing multi-model quantity search for user ${userId}: "${inputText}"`);
      
      // Validate input format
      if (!validateMultiModelInput(inputText)) {
        return {
          success: false,
          error: 'Invalid multi-model input format. Example: "a2b=2 e4s=3 cm"'
        };
      }
      
      // Check if we have cached results
      const cacheKey = generateSearchCacheKey('multi_model_search', userId, inputText);
      const cachedResults = await getFromSearchCache(cacheKey);
      
      if (cachedResults) {
        console.log(`Returning cached multi-model search results for user ${userId}`);
        return {
          success: true,
          results: cachedResults.results,
          recentQuotes: cachedResults.recentQuotes,
          totalPrice: cachedResults.totalPrice,
          totalQuantity: cachedResults.totalQuantity,
          fromCache: true
        };
      }
      
      // Parse the input
      const parsedInput = parseMultiModelInput(inputText);
      
      // Get model information from inventory system
      const modelResults = await getModelInformation(parsedInput.models);
      
      // Get recent quotes for marketing department
      let recentQuotes = [];
      if (departmentId === 'MARKETING') {
        recentQuotes = await getRecentQuotesForModels(modelResults.map(m => m.model_code));
      }
      
      // Calculate totals
      const totalQuantity = modelResults.reduce((sum, model) => sum + model.quantity, 0);
      const totalPrice = modelResults.reduce((sum, model) => sum + model.total_price, 0);
      
      // Prepare response
      const response = {
        success: true,
        results: modelResults,
        recentQuotes: recentQuotes,
        totalPrice: totalPrice,
        totalQuantity: totalQuantity,
        inputParsed: parsedInput
      };
      
      // Cache results for 30 minutes (shorter cache due to pricing volatility)
      await storeInSearchCache(cacheKey, response, 0.5);
      
      return response;
    } catch (error) {
      console.error(`Error processing multi-model quantity search for user ${userId}:`, error);
      return {
        success: false,
        error: 'An error occurred while processing your search. Please try again.'
      };
    }
  })();
}

/**
 * Validate multi-model input format
 * @param {string} inputText - User input
 * @returns {boolean} True if valid format
 */
function validateMultiModelInput(inputText) {
  try {
    // Multi-model format: model_code=quantity (e.g., "a2b=2 e4s=3")
    const multiModelRegex = /^([a-z0-9]{2,4}=\d{1,2}\s*)+$/i;
    return multiModelRegex.test(inputText.trim());
  } catch (error) {
    console.error('Error validating multi-model input:', error);
    return false;
  }
}

/**
 * Parse multi-model input text
 * @param {string} inputText - User input
 * @returns {Object} Parsed input with models and context
 */
function parseMultiModelInput(inputText) {
  try {
    const models = [];
    const parts = inputText.trim().split(/\s+/);
    
    // Parse model quantities
    for (const part of parts) {
      if (part.includes('=')) {
        const [modelCode, quantityStr] = part.split('=');
        const quantity = parseInt(quantityStr, 10);
        
        if (!isNaN(quantity) && quantity > 0 && quantity <= 99) {
          models.push({
            model_code: modelCode.toUpperCase(),
            quantity: quantity
          });
        }
      }
    }
    
    // Extract context (if any)
    let context = 'current';
    if (inputText.toLowerCase().includes('cm')) {
      context = 'current_month';
    } else if (inputText.toLowerCase().includes('lm')) {
      context = 'last_month';
    } else if (inputText.toLowerCase().includes('ly')) {
      context = 'last_year';
    } else if (inputText.toLowerCase().includes('lw')) {
      context = 'last_week';
    } else if (inputText.toLowerCase().includes('tw')) {
      context = 'this_week';
    }
    
    return {
      models: models,
      context: context,
      originalInput: inputText
    };
  } catch (error) {
    console.error('Error parsing multi-model input:', error);
    return {
      models: [],
      context: 'current',
      originalInput: inputText
    };
  }
}

/**
 * Get model information from inventory system
 * @param {Array} models - Array of model objects with code and quantity
 * @returns {Array} Model information with pricing
 */
async function getModelInformation(models) {
  try {
    // In a real implementation, we would query the inventory system
    // For now, we'll simulate model data
    
    const results = [];
    
    for (const model of models) {
      // Simulate getting model information
      const modelInfo = await getSingleModelInformation(model.model_code);
      
      if (modelInfo) {
        // Calculate total price
        const totalPrice = modelInfo.bottom_price * model.quantity;
        
        results.push({
          model_code: model.model_code,
          model_name: modelInfo.model_name,
          quantity: model.quantity,
          bottom_price: modelInfo.bottom_price,
          total_price: totalPrice,
          branch_availability: modelInfo.branch_availability
        });
      } else {
        // Model not found
        results.push({
          model_code: model.model_code,
          model_name: 'Unknown Model',
          quantity: model.quantity,
          bottom_price: 0,
          total_price: 0,
          branch_availability: [],
          error: 'Model not found'
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error getting model information:', error);
    return [];
  }
}

/**
 * Get information for a single model
 * @param {string} modelCode - Model code
 * @returns {Object|null} Model information or null if not found
 */
async function getSingleModelInformation(modelCode) {
  try {
    // Check cache first
    const cacheKey = generateSearchCacheKey('model_info', 'single', modelCode);
    const cachedInfo = await getFromSearchCache(cacheKey);
    
    if (cachedInfo) {
      return cachedInfo;
    }
    
    // Simulate model database lookup
    // In a real implementation, we would query the inventory database
    const modelDatabase = {
      'A2B': { model_name: 'Juki A2B Overlock Machine', bottom_price: 125000, branches: ['DHK-1', 'CTG-1', 'SYL-1'] },
      'E4S': { model_name: 'Brother E4S Serger', bottom_price: 85000, branches: ['DHK-1', 'RAJ-1', 'KHU-1'] },
      'T5C': { model_name: 'Toyota T5C Flatlock', bottom_price: 150000, branches: ['DHK-2', 'CTG-2', 'SYL-1'] },
      'J3H': { model_name: 'Jack J3H Coverstitch', bottom_price: 95000, branches: ['DHK-1', 'RAJ-1', 'KHU-1'] }
    };
    
    const modelData = modelDatabase[modelCode.toUpperCase()];
    
    if (modelData) {
      // Format branch availability
      const branchAvailability = modelData.branches.map(branch => ({
        branch: branch,
        stock: Math.floor(Math.random() * 10) + 1 // Random stock between 1-10
      }));
      
      const modelInfo = {
        model_name: modelData.model_name,
        bottom_price: modelData.bottom_price,
        branch_availability: branchAvailability
      };
      
      // Cache for 1 hour
      await storeInSearchCache(cacheKey, modelInfo, 1);
      
      return modelInfo;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting information for model ${modelCode}:`, error);
    return null;
  }
}

/**
 * Get recent quotes for models (marketing department specific)
 * @param {Array} modelCodes - Array of model codes
 * @returns {Array} Recent quotes
 */
async function getRecentQuotesForModels(modelCodes) {
  try {
    // Check cache first
    const cacheKey = generateSearchCacheKey('recent_quotes', 'models', modelCodes.join(','));
    const cachedQuotes = await getFromSearchCache(cacheKey);
    
    if (cachedQuotes) {
      return cachedQuotes;
    }
    
    // Simulate getting recent quotes from database
    // In a real implementation, we would query the marketing database
    const recentQuotes = [];
    
    // Sample customer database
    const customers = [
      'ABC Textiles Ltd.',
      'XYZ Garments Co.',
      'Dhaka Fashion House',
      'Chittagong Apparel',
      'Sylhet Stitching Center'
    ];
    
    for (const modelCode of modelCodes) {
      // Generate 1-2 recent quotes per model
      const quoteCount = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < quoteCount; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const unitPrice = 100000 + Math.floor(Math.random() * 50000); // Random price between 100k-150k
        const daysAgo = Math.floor(Math.random() * 30) + 1; // Random days 1-30 ago
        const quoteDate = new Date();
        quoteDate.setDate(quoteDate.getDate() - daysAgo);
        
        recentQuotes.push({
          model_code: modelCode,
          customer_name: customer,
          unit_price: unitPrice,
          quotation_date: quoteDate.toISOString().split('T')[0]
        });
      }
    }
    
    // Sort by quotation date (newest first)
    recentQuotes.sort((a, b) => new Date(b.quotation_date) - new Date(a.quotation_date));
    
    // Cache for 2 hours
    await storeInSearchCache(cacheKey, recentQuotes, 2);
    
    return recentQuotes;
  } catch (error) {
    console.error('Error getting recent quotes for models:', error);
    return [];
  }
}

/**
 * Generate multi-model search examples for user guidance
 * @returns {Array} Example searches
 */
function generateMultiModelSearchExamples() {
  try {
    return [
      {
        text: 'a2b=2 e4s=3',
        description: '2 Juki A2B machines and 3 Brother E4S machines',
        context: 'Standard order'
      },
      {
        text: 't5c=1 j3h=2 cm',
        description: '1 Toyota T5C and 2 Jack J3H with current month pricing',
        context: 'Monthly procurement'
      },
      {
        text: 'a2b=5 e4s=3 t5c=2',
        description: 'Bulk order with multiple models',
        context: 'Large purchase'
      }
    ];
  } catch (error) {
    console.error('Error generating multi-model search examples:', error);
    return [];
  }
}

/**
 * Validate model codes against known inventory
 * @param {Array} modelCodes - Array of model codes to validate
 * @returns {Object} Validation results
 */
async function validateModelCodes(modelCodes) {
  try {
    const results = {
      valid: [],
      invalid: [],
      unknown: []
    };
    
    // Known model codes
    const knownModels = ['A2B', 'E4S', 'T5C', 'J3H', 'R7M', 'P9K', 'L2N', 'M5Q'];
    
    for (const code of modelCodes) {
      const upperCode = code.toUpperCase();
      if (knownModels.includes(upperCode)) {
        results.valid.push(upperCode);
      } else if (upperCode.match(/^[A-Z0-9]{2,4}$/)) {
        results.invalid.push(upperCode);
      } else {
        results.unknown.push(upperCode);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error validating model codes:', error);
    return {
      valid: [],
      invalid: [],
      unknown: modelCodes
    };
  }
}

// Export functions
module.exports = {
  handleMultiModelQuantitySearch,
  validateMultiModelInput,
  parseMultiModelInput,
  generateMultiModelSearchExamples,
  validateModelCodes
};