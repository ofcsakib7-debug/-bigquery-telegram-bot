// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: search_processing_flow
// Status: IN_PROGRESS
// Last Modified: 2025-08-28 12:20 UTC
// Next Step: Integrate with validation and auto-correction system
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');
const { validateSyntax, validateMultiModelFormat, validateTimePeriodFormat } = require('./validation');
const { validateLogic, getUserDepartment, getDepartmentPatterns, findMatchingPattern } = require('./logical_validation');
const { checkHeuristicPatterns } = require('./heuristic_check');
const { findTypoCorrections } = require('./typo_correction');
const { processSearchQueryWithValidation } = require('./validation_correction_integration');

// Lazy initialization of clients
let bigquery = null;
let firestore = null;

function getBigQuery() {
  if (!bigquery) {
    bigquery = new BigQuery();
  }
  return bigquery;
}

function getFirestore() {
  if (!firestore) {
    firestore = new Firestore();
  }
  return firestore;
}

/**
 * Process search query through multi-layer validation and correction
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @returns {Object} Search processing result
 */
async function processSearchQuery(userId, queryText) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing search query for user ${userId}: "${queryText}"`);
      
      // Validate inputs
      if (!userId || !queryText) {
        return {
          success: false,
          error: 'Invalid inputs: userId and queryText are required',
          suggestions: ['Enter a valid search query']
        };
      }
      
      // Normalize query text
      const normalizedQuery = queryText.trim().toLowerCase();
      
      if (normalizedQuery.length === 0) {
        return {
          success: false,
          error: 'Empty query not allowed',
          suggestions: ['Enter a search query']
        };
      }
      
      // Get user department
      const userDepartment = await getUserDepartment(userId);
      if (!userDepartment) {
        return {
          success: false,
          error: 'User department not found',
          suggestions: ['Contact administrator to set up your profile']
        };
      }
      
      // Use integrated validation and correction system
      const validationResult = await processSearchQueryWithValidation(userId, normalizedQuery, userDepartment);
      
      if (!validationResult.success) {
        return validationResult;
      }
      
      // Query passed all validation layers
      console.log(`Query passed all validation layers for user ${userId}: "${normalizedQuery}"`);
      
      // Phase 5: Process the validated query
      const processingResult = await processValidatedQuery(userId, normalizedQuery, userDepartment);
      
      if (!processingResult.success) {
        return processingResult;
      }
      
      // Phase 6: Log successful interaction
      await logSearchInteraction(userId, normalizedQuery, userDepartment, processingResult);
      
      return processingResult;
    } catch (error) {
      console.error(`Error processing search query for user ${userId}:`, error);
      return {
        success: false,
        error: 'Error processing search query',
        suggestions: ['Try a different query format']
      };
    }
  })();
}

/**
 * Process validated query
 * @param {string} userId - User ID
 * @param {string} queryText - Normalized query text
 * @param {string} departmentId - Department ID
 * @returns {Object} Processing result
 */
async function processValidatedQuery(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing validated query for user ${userId} in department ${departmentId}: "${queryText}"`);
      
      // Check cache first for instant response
      const cacheKey = generateCacheKey('search_results', userId, `${departmentId}:${queryText}`);
      const cachedResults = await getFromCache(cacheKey);
      
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
      
      // Determine query type based on department and patterns
      const queryType = determineQueryType(queryText, departmentId);
      
      // Process based on query type
      let results = [];
      let confidenceScore = 0.5; // Default confidence
      
      switch (queryType) {
        case 'MULTI_MODEL_QUANTITY':
          const multiModelResult = await processMultiModelQuantitySearch(userId, queryText, departmentId);
          results = multiModelResult.results;
          confidenceScore = multiModelResult.confidenceScore;
          break;
        case 'TIME_PERIOD':
          const timePeriodResult = await processTimePeriodSearch(userId, queryText, departmentId);
          results = timePeriodResult.results;
          confidenceScore = timePeriodResult.confidenceScore;
          break;
        case 'DEPARTMENT_SPECIFIC':
          const deptResult = await processDepartmentSpecificSearch(userId, queryText, departmentId);
          results = deptResult.results;
          confidenceScore = deptResult.confidenceScore;
          break;
        default:
          // Fallback to general search
          const generalResult = await processGeneralSearch(userId, queryText, departmentId);
          results = generalResult.results;
          confidenceScore = generalResult.confidenceScore;
      }
      
      // Generate alternative suggestions
      const alternatives = await generateSearchAlternatives(userId, queryText, departmentId);
      
      // Prepare response
      const response = {
        success: true,
        results: results,
        alternatives: alternatives,
        confidenceScore: confidenceScore,
        fromCache: false,
        queryType: queryType,
        interpretedQuery: queryText,
        departmentId: departmentId
      };
      
      // Cache results for 1 hour
      await storeInCache(cacheKey, response, 1);
      
      return response;
    } catch (error) {
      console.error(`Error processing validated query for user ${userId}:`, error);
      return {
        success: false,
        error: 'Error processing validated query',
        suggestions: ['Try a different query format']
      };
    }
  })();
}

/**
 * Determine query type based on input and department
 * @param {string} queryText - Query text
 * @param {string} departmentId - Department ID
 * @returns {string} Query type
 */
function determineQueryType(queryText, departmentId) {
  try {
    // Check for multi-model quantity format (model_code=quantity)
    if (validateMultiModelFormat(queryText).valid) {
      return 'MULTI_MODEL_QUANTITY';
    }
    
    // Check for time period format
    if (validateTimePeriodFormat(queryText).valid) {
      return 'TIME_PERIOD';
    }
    
    // Check for department-specific patterns
    const departmentPatterns = getDepartmentPatterns(departmentId);
    if (departmentPatterns && departmentPatterns.length > 0) {
      const patternMatch = findMatchingPattern(queryText, departmentPatterns);
      if (patternMatch) {
        return 'DEPARTMENT_SPECIFIC';
      }
    }
    
    // Default to general search
    return 'GENERAL';
  } catch (error) {
    console.error(`Error determining query type for ${departmentId}:`, error);
    return 'GENERAL';
  }
}

/**
 * Process multi-model quantity search
 * @param {string} userId - User ID
 * @param {string} queryText - Query text
 * @param {string} departmentId - Department ID
 * @returns {Object} Processing result
 */
async function processMultiModelQuantitySearch(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing multi-model quantity search for user ${userId}: "${queryText}"`);
      
      // Validate format
      const formatValidation = validateMultiModelFormat(queryText);
      if (!formatValidation.valid) {
        return {
          success: false,
          error: formatValidation.errorMessage,
          suggestions: formatValidation.suggestions
        };
      }
      
      // Parse model-quantity pairs
      const pairs = queryText.trim().split(/\s+/);
      const modelQuantities = pairs.map(pair => {
        const [modelCode, quantityStr] = pair.split('=');
        return {
          modelCode: modelCode.trim(),
          quantity: parseInt(quantityStr, 10)
        };
      });
      
      // Get model information from database
      const modelInfo = await getMultiModelInfo(modelQuantities, departmentId);
      
      // Calculate totals
      const totalQuantity = modelQuantities.reduce((sum, mq) => sum + mq.quantity, 0);
      const totalPrice = modelInfo.reduce((sum, model) => sum + (model.price * model.quantity), 0);
      
      // Prepare results
      const results = {
        queryType: 'MULTI_MODEL_QUANTITY',
        models: modelInfo,
        totalQuantity: totalQuantity,
        totalPrice: totalPrice,
        confidenceScore: 0.95 // High confidence for valid format
      };
      
      return {
        success: true,
        results: results,
        confidenceScore: 0.95
      };
    } catch (error) {
      console.error(`Error processing multi-model quantity search for user ${userId}:`, error);
      return {
        success: false,
        error: 'Error processing multi-model quantity search',
        suggestions: ['Try a different multi-model format']
      };
    }
  })();
}

/**
 * Get multi-model information
 * @param {Array} modelQuantities - Array of model-quantity pairs
 * @param {string} departmentId - Department ID
 * @returns {Array} Model information
 */
async function getMultiModelInfo(modelQuantities, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Getting multi-model info for ${modelQuantities.length} models in department ${departmentId}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('multi_model_info', departmentId, modelQuantities.map(mq => `${mq.modelCode}:${mq.quantity}`).join('_'));
      const cachedInfo = await getFromCache(cacheKey);
      
      if (cachedInfo) {
        console.log(`Using cached multi-model info for ${modelQuantities.length} models in ${departmentId}`);
        return cachedInfo;
      }
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      // Build query for model information
      const modelCodes = modelQuantities.map(mq => `'${mq.modelCode}'`).join(',');
      const query = `
        SELECT 
          model_code,
          model_name,
          base_price,
          current_stock,
          branch_availability
        FROM \`${datasetId}.machine_inventory_cache\`
        WHERE 
          model_code IN (${modelCodes})
          AND DATE(expires_at) >= CURRENT_DATE()
        ORDER BY model_code
      `;
      
      const options = {
        query: query,
        location: 'us-central1'
      };
      
      const [rows] = await bigqueryClient.query(options);
      
      const modelInfo = rows.map(row => {
        // Find matching quantity
        const modelQuantity = modelQuantities.find(mq => mq.modelCode === row.model_code);
        const quantity = modelQuantity ? modelQuantity.quantity : 1;
        
        return {
          model_code: row.model_code,
          model_name: row.model_name,
          quantity: quantity,
          price: parseFloat(row.base_price) || 0,
          total_price: parseFloat(row.base_price) * quantity || 0,
          current_stock: parseInt(row.current_stock) || 0,
          branch_availability: row.branch_availability || [],
          confidence_score: 0.95
        };
      });
      
      // Cache for 30 minutes
      await storeInCache(cacheKey, modelInfo, 0.5);
      
      return modelInfo;
    } catch (error) {
      console.error(`Error getting multi-model info for ${departmentId}:`, error);
      return modelQuantities.map(mq => ({
        model_code: mq.modelCode,
        model_name: `Unknown Model ${mq.modelCode}`,
        quantity: mq.quantity,
        price: 0,
        total_price: 0,
        current_stock: 0,
        branch_availability: [],
        confidence_score: 0.1
      }));
    }
  })();
}

/**
 * Process time period search
 * @param {string} userId - User ID
 * @param {string} queryText - Query text
 * @param {string} departmentId - Department ID
 * @returns {Object} Processing result
 */
async function processTimePeriodSearch(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing time period search for user ${userId}: "${queryText}"`);
      
      // Validate format
      const formatValidation = validateTimePeriodFormat(queryText);
      if (!formatValidation.valid) {
        return {
          success: false,
          error: formatValidation.errorMessage,
          suggestions: formatValidation.suggestions
        };
      }
      
      // Get time period data
      const timePeriodData = await getTimePeriodData(queryText, departmentId);
      
      // Prepare results
      const results = {
        queryType: 'TIME_PERIOD',
        timePeriod: queryText,
        timePeriodData: timePeriodData,
        confidenceScore: 0.9 // High confidence for valid format
      };
      
      return {
        success: true,
        results: results,
        confidenceScore: 0.9
      };
    } catch (error) {
      console.error(`Error processing time period search for user ${userId}:`, error);
      return {
        success: false,
        error: 'Error processing time period search',
        suggestions: ['Try a different time period format']
      };
    }
  })();
}

/**
 * Get time period data
 * @param {string} timePeriod - Time period
 * @param {string} departmentId - Department ID
 * @returns {Object} Time period data
 */
async function getTimePeriodData(timePeriod, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Getting time period data for ${timePeriod} in department ${departmentId}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('time_period_data', departmentId, timePeriod);
      const cachedData = await getFromCache(cacheKey);
      
      if (cachedData) {
        console.log(`Using cached time period data for ${timePeriod} in ${departmentId}`);
        return cachedData;
      }
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      // Map time period to date range
      const dateRange = mapTimePeriodToDateRange(timePeriod);
      
      // Build query based on department
      let query = '';
      switch (departmentId) {
        case 'ACCOUNTING':
          query = `
            SELECT 
              SUM(payment_amount) as total_payments,
              COUNT(*) as payment_count,
              AVG(payment_amount) as avg_payment_amount,
              MIN(payment_amount) as min_payment_amount,
              MAX(payment_amount) as max_payment_amount
            FROM \`${datasetId}.payment_receipts\`
            WHERE 
              DATE(payment_timestamp) >= @startDate
              AND DATE(payment_timestamp) <= @endDate
          `;
          break;
        case 'SALES':
          query = `
            SELECT 
              COUNT(*) as delivery_count,
              SUM(total_value) as total_value,
              AVG(total_value) as avg_delivery_value,
              MIN(total_value) as min_delivery_value,
              MAX(total_value) as max_delivery_value
            FROM \`${datasetId}.delivery_challans\`
            WHERE 
              DATE(delivery_date) >= @startDate
              AND DATE(delivery_date) <= @endDate
          `;
          break;
        case 'INVENTORY':
          query = `
            SELECT 
              COUNT(*) as stock_movement_count,
              SUM(quantity_change) as total_quantity_change,
              AVG(quantity_change) as avg_quantity_change,
              MIN(quantity_change) as min_quantity_change,
              MAX(quantity_change) as max_quantity_change
            FROM \`${datasetId}.inventory_movements\`
            WHERE 
              DATE(movement_date) >= @startDate
              AND DATE(movement_date) <= @endDate
          `;
          break;
        case 'SERVICE':
          query = `
            SELECT 
              COUNT(*) as service_ticket_count,
              COUNTIF(status = 'OPEN') as open_tickets,
              COUNTIF(status = 'CLOSED') as closed_tickets,
              AVG(completion_time_hours) as avg_completion_time,
              MIN(completion_time_hours) as min_completion_time,
              MAX(completion_time_hours) as max_completion_time
            FROM \`${datasetId}.service_tickets\`
            WHERE 
              DATE(created_at) >= @startDate
              AND DATE(created_at) <= @endDate
          `;
          break;
        case 'MARKETING':
          query = `
            SELECT 
              COUNT(*) as customer_count,
              COUNTIF(is_new_customer = TRUE) as new_customers,
              COUNTIF(is_repeat_customer = TRUE) as repeat_customers,
              AVG(lead_conversion_rate) as avg_conversion_rate,
              MIN(lead_conversion_rate) as min_conversion_rate,
              MAX(lead_conversion_rate) as max_conversion_rate
            FROM \`${datasetId}.customer_acquisitions\`
            WHERE 
              DATE(acquisition_date) >= @startDate
              AND DATE(acquisition_date) <= @endDate
          `;
          break;
        default:
          query = `
            SELECT 
              COUNT(*) as record_count
            FROM \`${datasetId}.general_records\`
            WHERE 
              DATE(created_at) >= @startDate
              AND DATE(created_at) <= @endDate
          `;
      }
      
      const options = {
        query: query,
        location: 'us-central1',
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      };
      
      const [rows] = await bigqueryClient.query(options);
      
      const timePeriodData = rows.length > 0 ? rows[0] : {};
      
      // Cache for 1 hour
      await storeInCache(cacheKey, timePeriodData, 1);
      
      return timePeriodData;
    } catch (error) {
      console.error(`Error getting time period data for ${timePeriod} in ${departmentId}:`, error);
      return {};
    }
  })();
}

/**
 * Map time period to date range
 * @param {string} timePeriod - Time period
 * @returns {Object} Date range
 */
function mapTimePeriodToDateRange(timePeriod) {
  try {
    const today = new Date();
    let startDate = new Date(today);
    let endDate = new Date(today);
    
    switch (timePeriod.toLowerCase()) {
      case 'cm': // Current month
        startDate.setDate(1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lm': // Last month
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'lw': // Last week
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - 7);
        startDate = new Date(lastWeekStart);
        startDate.setDate(lastWeekStart.getDate() - lastWeekStart.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'tw': // This week
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'ly': // Last year
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        // Default to current month
        startDate.setDate(1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Error mapping time period to date range:', error);
    const today = new Date();
    return {
      startDate: today.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }
}

/**
 * Process department-specific search
 * @param {string} userId - User ID
 * @param {string} queryText - Query text
 * @param {string} departmentId - Department ID
 * @returns {Object} Processing result
 */
async function processDepartmentSpecificSearch(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing department-specific search for user ${userId} in ${departmentId}: "${queryText}"`);
      
      // Get department patterns
      const departmentPatterns = await getDepartmentPatterns(departmentId);
      
      if (!departmentPatterns || departmentPatterns.length === 0) {
        return {
          success: false,
          error: `No patterns found for department ${departmentId}`,
          suggestions: [`Contact administrator to configure ${departmentId} patterns`]
        };
      }
      
      // Find matching pattern
      const matchedPattern = findMatchingPattern(queryText, departmentPatterns);
      
      if (!matchedPattern) {
        return {
          success: false,
          error: `No matching pattern found for "${queryText}" in ${departmentId}`,
          suggestions: [`Review ${departmentId} patterns`, 'Try a different query format']
        };
      }
      
      // Process according to matched pattern
      const patternResult = await processPatternMatch(userId, queryText, matchedPattern, departmentId);
      
      return {
        success: true,
        results: patternResult.results,
        confidenceScore: patternResult.confidenceScore
      };
    } catch (error) {
      console.error(`Error processing department-specific search for user ${userId}:`, error);
      return {
        success: false,
        error: 'Error processing department-specific search',
        suggestions: ['Try a different query format']
      };
    }
  })();
}

/**
 * Process pattern match
 * @param {string} userId - User ID
 * @param {string} queryText - Query text
 * @param {Object} pattern - Matched pattern
 * @param {string} departmentId - Department ID
 * @returns {Object} Pattern processing result
 */
async function processPatternMatch(userId, queryText, pattern, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing pattern match for user ${userId}: "${queryText}" -> "${pattern.pattern}"`);
      
      // Check cache first
      const cacheKey = generateCacheKey('pattern_match', userId, `${departmentId}:${pattern.pattern}:${queryText}`);
      const cachedResult = await getFromCache(cacheKey);
      
      if (cachedResult) {
        console.log(`Using cached pattern match result for user ${userId}`);
        return cachedResult;
      }
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      // Process based on pattern query type
      let query = '';
      let params = {};
      
      switch (pattern.query_type) {
        case 'PAYMENT':
          query = `
            SELECT
              payment_id,
              customer_name,
              amount,
              payment_method,
              payment_date
            FROM \`${datasetId}.payment_receipts\`
            WHERE 
              DATE(payment_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            ORDER BY payment_date DESC
            LIMIT 10
          `;
          break;
        case 'CHALLAN':
          query = `
            SELECT
              challan_id,
              customer_name,
              total_amount,
              delivery_date,
              status
            FROM \`${datasetId}.delivery_challans\`
            WHERE 
              DATE(delivery_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            ORDER BY delivery_date DESC
            LIMIT 10
          `;
          break;
        case 'STOCK':
          query = `
            SELECT
              model_code,
              model_name,
              current_stock,
              reorder_point,
              last_updated
            FROM \`${datasetId}.inventory_levels\`
            WHERE 
              DATE(last_updated) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
            ORDER BY current_stock ASC
            LIMIT 20
          `;
          break;
        case 'VISIT':
          query = `
            SELECT
              visit_id,
              customer_name,
              scheduled_date,
              purpose,
              status
            FROM \`${datasetId}.factory_visits\`
            WHERE 
              DATE(scheduled_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            ORDER BY scheduled_date DESC
            LIMIT 10
          `;
          break;
        case 'EXPENSE':
          query = `
            SELECT
              expense_id,
              expense_category,
              amount,
              expense_date,
              description
            FROM \`${datasetId}.expense_records\`
            WHERE 
              DATE(expense_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            ORDER BY expense_date DESC
            LIMIT 10
          `;
          break;
        case 'REPORT':
          query = `
            SELECT
              report_id,
              report_name,
              generated_date,
              report_type,
              status
            FROM \`${datasetId}.generated_reports\`
            WHERE 
              DATE(generated_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            ORDER BY generated_date DESC
            LIMIT 10
          `;
          break;
        case 'QUANTITY_STOCK':
          query = `
            SELECT
              model_code,
              model_name,
              quantity_available,
              unit_price,
              branch_location
            FROM \`${datasetId}.quantity_stock_cache\`
            WHERE 
              DATE(expires_at) >= CURRENT_DATE()
            ORDER BY quantity_available DESC
            LIMIT 20
          `;
          break;
        default:
          query = `
            SELECT
              COUNT(*) as record_count
            FROM \`${datasetId}.general_records\`
            WHERE 
              DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
          `;
      }
      
      const options = {
        query: query,
        location: 'us-central1',
        params: params
      };
      
      const [rows] = await bigqueryClient.query(options);
      
      const results = rows.map(row => {
        const result = {};
        for (const [key, value] of Object.entries(row)) {
          result[key] = value && value.value ? value.value : value;
        }
        return result;
      });
      
      const patternResult = {
        results: results,
        confidenceScore: pattern.priority_score || 0.8
      };
      
      // Cache for 30 minutes
      await storeInCache(cacheKey, patternResult, 0.5);
      
      return patternResult;
    } catch (error) {
      console.error(`Error processing pattern match for user ${userId}:`, error);
      return {
        results: [],
        confidenceScore: 0.1
      };
    }
  })();
}

/**
 * Process general search
 * @param {string} userId - User ID
 * @param {string} queryText - Query text
 * @param {string} departmentId - Department ID
 * @returns {Object} Processing result
 */
async function processGeneralSearch(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing general search for user ${userId}: "${queryText}"`);
      
      // Check cache first
      const cacheKey = generateCacheKey('general_search', userId, `${departmentId}:${queryText}`);
      const cachedResults = await getFromCache(cacheKey);
      
      if (cachedResults) {
        console.log(`Using cached general search results for user ${userId}`);
        return {
          success: true,
          results: cachedResults.results,
          confidenceScore: cachedResults.confidenceScore,
          fromCache: true
        };
      }
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      // Build general search query
      const query = `
        SELECT
          search_result_id,
          result_title,
          result_description,
          result_type,
          result_url,
          relevance_score
        FROM \`${datasetId}.general_search_index\`
        WHERE 
          CONTAINS_SUBSTR(search_text, @queryText)
          AND department_id = @departmentId
        ORDER BY relevance_score DESC
        LIMIT 20
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: {
          queryText: queryText.toLowerCase(),
          departmentId: departmentId.toString()
        }
      };
      
      const [rows] = await bigqueryClient.query(options);
      
      const results = rows.map(row => ({
        search_result_id: row.search_result_id,
        result_title: row.result_title,
        result_description: row.result_description,
        result_type: row.result_type,
        result_url: row.result_url,
        relevance_score: parseFloat(row.relevance_score) || 0
      }));
      
      const generalResult = {
        success: true,
        results: results,
        confidenceScore: results.length > 0 ? 0.7 : 0.3,
        fromCache: false
      };
      
      // Cache for 15 minutes
      await storeInCache(cacheKey, generalResult, 0.25);
      
      return generalResult;
    } catch (error) {
      console.error(`Error processing general search for user ${userId}:`, error);
      return {
        success: false,
        error: 'Error processing general search',
        suggestions: ['Try a different search term']
      };
    }
  })();
}

/**
 * Generate search alternatives
 * @param {string} userId - User ID
 * @param {string} queryText - Query text
 * @param {string} departmentId - Department ID
 * @returns {Array} Alternative suggestions
 */
async function generateSearchAlternatives(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Generating search alternatives for user ${userId}: "${queryText}"`);
      
      // Check cache first
      const cacheKey = generateCacheKey('search_alternatives', userId, `${departmentId}:${queryText}`);
      const cachedAlternatives = await getFromCache(cacheKey);
      
      if (cachedAlternatives) {
        console.log(`Using cached search alternatives for user ${userId}`);
        return cachedAlternatives;
      }
      
      // Get department patterns
      const departmentPatterns = await getDepartmentPatterns(departmentId);
      
      if (!departmentPatterns || departmentPatterns.length === 0) {
        return [];
      }
      
      // Find patterns that are similar to the query
      const similarPatterns = findSimilarPatterns(queryText, departmentPatterns);
      
      // Generate alternatives from similar patterns
      const alternatives = similarPatterns.slice(0, 3).map(pattern => ({
        text: pattern.pattern,
        description: pattern.expanded_query,
        confidenceScore: pattern.priority_score || 0.5
      }));
      
      // Cache for 1 hour
      await storeInCache(cacheKey, alternatives, 1);
      
      return alternatives;
    } catch (error) {
      console.error(`Error generating search alternatives for user ${userId}:`, error);
      return [];
    }
  })();
}

/**
 * Find similar patterns to a query
 * @param {string} queryText - Query text
 * @param {Array} patterns - Department patterns
 * @returns {Array} Similar patterns
 */
function findSimilarPatterns(queryText, patterns) {
  try {
    // Calculate similarity scores for all patterns
    const scoredPatterns = patterns.map(pattern => {
      const similarity = calculateSimilarity(queryText, pattern.pattern);
      return {
        ...pattern,
        similarity: similarity
      };
    });
    
    // Sort by similarity (highest first) and return top 5
    return scoredPatterns
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  } catch (error) {
    console.error('Error finding similar patterns:', error);
    return [];
  }
}

/**
 * Calculate similarity between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(str1, str2) {
  try {
    // Simple character overlap calculation
    const set1 = new Set(str1.toLowerCase().split(''));
    const set2 = new Set(str2.toLowerCase().split(''));
    
    // Count overlapping characters
    let overlapCount = 0;
    for (const char of set1) {
      if (set2.has(char)) {
        overlapCount++;
      }
    }
    
    // Calculate similarity as ratio of overlapping characters to total unique characters
    const totalUniqueChars = new Set([...set1, ...set2]).size;
    const similarity = totalUniqueChars > 0 ? overlapCount / totalUniqueChars : 0;
    
    return similarity;
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}

/**
 * Log search interaction
 * @param {string} userId - User ID
 * @param {string} queryText - Query text
 * @param {string} departmentId - Department ID
 * @param {Object} processingResult - Processing result
 */
async function logSearchInteraction(userId, queryText, departmentId, processingResult) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Logging search interaction for user ${userId}: "${queryText}"`);
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      // Generate interaction ID
      const interactionId = `INT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      
      // Prepare interaction record
      const interactionRecord = {
        interaction_id: interactionId,
        user_id: userId.toString(),
        department_id: departmentId.toString(),
        input_text: queryText,
        interpreted_query: processingResult.interpretedQuery || queryText,
        query_type: processingResult.queryType || 'GENERAL',
        confidence_score: processingResult.confidenceScore || 0.5,
        successful_completion: processingResult.success,
        timestamp: new Date().toISOString()
      };
      
      // Insert into search_interactions table
      const query = `
        INSERT INTO \`${datasetId}.search_interactions\`
        (interaction_id, user_id, department_id, input_text, interpreted_query, query_type, confidence_score, successful_completion, timestamp)
        VALUES
        (@interactionId, @userId, @departmentId, @inputText, @interpretedQuery, @queryType, @confidenceScore, @successfulCompletion, @timestamp)
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: {
          interactionId: interactionRecord.interaction_id,
          userId: interactionRecord.user_id,
          departmentId: interactionRecord.department_id,
          inputText: interactionRecord.input_text,
          interpretedQuery: interactionRecord.interpretedQuery,
          queryType: interactionRecord.query_type,
          confidenceScore: parseFloat(interactionRecord.confidence_score),
          successfulCompletion: interactionRecord.successful_completion,
          timestamp: interactionRecord.timestamp
        }
      };
      
      await bigqueryClient.query(options);
      
      console.log(`Search interaction logged for user ${userId}: ${interactionId}`);
      
    } catch (error) {
      console.error(`Error logging search interaction for user ${userId}:`, error);
    }
  })();
}

/**
 * Validate semantically for suspicious queries
 * @param {string} userId - User ID
 * @param {string} queryText - Query text
 * @param {Object} heuristicResult - Heuristic analysis result
 * @returns {Object} Semantic validation result
 */
async function validateSemantically(userId, queryText, heuristicResult) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Validating semantically for user ${userId}: "${queryText}"`);
      
      // Check cache first
      const cacheKey = generateCacheKey('semantic_validation', userId, queryText);
      const cachedValidation = await getFromCache(cacheKey);
      
      if (cachedValidation) {
        console.log(`Using cached semantic validation for user ${userId}`);
        return cachedValidation;
      }
      
      // If heuristic flagged query as suspicious, get typo corrections
      const corrections = await findTypoCorrections(userId, queryText, 'GENERAL');
      
      if (corrections && corrections.length > 0) {
        // Return suggestions for corrections
        const suggestions = corrections.slice(0, 3).map(correction => 
          `Did you mean: "${correction.correctedText}"?`
        );
        
        const result = {
          success: false,
          valid: false,
          errorType: 'SEMANTIC',
          error: `Possible typo detected in your query.`,
          suggestions: [
            ...suggestions,
            'Select one of the suggestions above',
            'Or keep your original query if it was intentional'
          ]
        };
        
        // Cache for 30 minutes
        await storeInCache(cacheKey, result, 0.5);
        
        return result;
      }
      
      // Query seems legitimate despite heuristic flags
      const result = {
        success: true,
        valid: true,
        errorType: null,
        error: null,
        suggestions: []
      };
      
      // Cache for 1 hour
      await storeInCache(cacheKey, result, 1);
      
      return result;
    } catch (error) {
      console.error(`Error in semantic validation for user ${userId}:`, error);
      return {
        success: false,
        valid: false,
        errorType: 'SEMANTIC',
        error: 'Error during semantic validation',
        suggestions: ['Try a different query format']
      };
    }
  })();
}

// Export functions
module.exports = {
  processSearchQuery,
  processValidatedQuery,
  determineQueryType,
  processMultiModelQuantitySearch,
  getMultiModelInfo,
  processTimePeriodSearch,
  getTimePeriodData,
  mapTimePeriodToDateRange,
  processDepartmentSpecificSearch,
  processPatternMatch,
  processGeneralSearch,
  generateSearchAlternatives,
  findSimilarPatterns,
  calculateSimilarity,
  logSearchInteraction,
  validateSemantically
};