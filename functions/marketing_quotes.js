// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 1
// Component: marketing_team_recent_quotes
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 13:30 UTC
// Next Step: Implement search UI integration
// =============================================

const { getFromSearchCache, storeInSearchCache, generateSearchCacheKey } = require('../bigquery/search');
const { withErrorHandling } = require('./error_handling');
const { validateInputPattern } = require('./security');

/**
 * Handle marketing team recent quotes functionality
 * @param {string} userId - User ID
 * @param {string} customerId - Customer ID (optional)
 * @param {string} modelCode - Model code (optional)
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Object} Recent quotes information
 */
async function handleMarketingRecentQuotes(userId, customerId = null, modelCode = null, days = 30) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing marketing recent quotes for user ${userId}`);
      
      // Validate input parameters
      if (customerId && !validateInputPattern(customerId, '^[a-zA-Z0-9\\-\\s]+$')) {
        return {
          success: false,
          error: 'Invalid customer ID format'
        };
      }
      
      if (modelCode && !validateInputPattern(modelCode, '^[a-zA-Z0-9]{2,4}$')) {
        return {
          success: false,
          error: 'Invalid model code format'
        };
      }
      
      if (days < 1 || days > 365) {
        return {
          success: false,
          error: 'Days parameter must be between 1 and 365'
        };
      }
      
      // Check if we have cached results
      const cacheKey = generateSearchCacheKey('marketing_quotes', userId, `${customerId || 'all'}:${modelCode || 'all'}:${days}`);
      const cachedResults = await getFromSearchCache(cacheKey);
      
      if (cachedResults) {
        console.log(`Returning cached marketing recent quotes for user ${userId}`);
        return {
          success: true,
          quotes: cachedResults.quotes,
          summary: cachedResults.summary,
          fromCache: true
        };
      }
      
      // Get recent quotes from database
      const recentQuotes = await getRecentQuotesFromDatabase(customerId, modelCode, days);
      
      // Generate summary statistics
      const summary = generateQuoteSummary(recentQuotes, days);
      
      // Prepare response
      const response = {
        success: true,
        quotes: recentQuotes,
        summary: summary
      };
      
      // Cache results for 2 hours
      await storeInSearchCache(cacheKey, response, 2);
      
      return response;
    } catch (error) {
      console.error(`Error processing marketing recent quotes for user ${userId}:`, error);
      return {
        success: false,
        error: 'An error occurred while retrieving recent quotes. Please try again.'
      };
    }
  })();
}

/**
 * Get recent quotes from database with filtering
 * @param {string|null} customerId - Customer ID to filter by
 * @param {string|null} modelCode - Model code to filter by
 * @param {number} days - Number of days to look back
 * @returns {Array} Recent quotes
 */
async function getRecentQuotesFromDatabase(customerId = null, modelCode = null, days = 30) {
  try {
    // Check cache first
    const cacheKey = generateSearchCacheKey('quotes_db', 'filtered', `${customerId || 'all'}:${modelCode || 'all'}:${days}`);
    const cachedQuotes = await getFromSearchCache(cacheKey);
    
    if (cachedQuotes) {
      return cachedQuotes;
    }
    
    // In a real implementation, we would query BigQuery
    // For now, we'll simulate the data
    
    // Generate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Simulate database of quotes
    const allQuotes = generateSimulatedQuoteDatabase();
    
    // Filter quotes based on parameters
    let filteredQuotes = allQuotes.filter(quote => {
      const quoteDate = new Date(quote.quotation_date);
      return quoteDate >= startDate && quoteDate <= endDate;
    });
    
    // Apply customer filter if provided
    if (customerId) {
      filteredQuotes = filteredQuotes.filter(quote => 
        quote.customer_id === customerId || 
        quote.customer_name.toLowerCase().includes(customerId.toLowerCase())
      );
    }
    
    // Apply model filter if provided
    if (modelCode) {
      filteredQuotes = filteredQuotes.filter(quote => 
        quote.machine_model_id === modelCode.toUpperCase()
      );
    }
    
    // Sort by quotation date (newest first)
    filteredQuotes.sort((a, b) => new Date(b.quotation_date) - new Date(a.quotation_date));
    
    // Limit to 50 most recent quotes
    const recentQuotes = filteredQuotes.slice(0, 50);
    
    // Cache for 1 hour
    await storeInSearchCache(cacheKey, recentQuotes, 1);
    
    return recentQuotes;
  } catch (error) {
    console.error('Error getting recent quotes from database:', error);
    return [];
  }
}

/**
 * Generate simulated quote database for demonstration
 * @returns {Array} Simulated quote database
 */
function generateSimulatedQuoteDatabase() {
  try {
    // Sample data for simulation
    const customers = [
      { id: 'CUST-001', name: 'ABC Textiles Ltd.' },
      { id: 'CUST-002', name: 'XYZ Garments Co.' },
      { id: 'CUST-003', name: 'Dhaka Fashion House' },
      { id: 'CUST-004', name: 'Chittagong Apparel' },
      { id: 'CUST-005', name: 'Sylhet Stitching Center' },
      { id: 'CUST-006', name: 'Rajshahi Sewing Works' },
      { id: 'CUST-007', name: 'Khulna Fabric Solutions' },
      { id: 'CUST-008', name: 'Barisal Garment Factory' }
    ];
    
    const models = [
      { id: 'A2B', name: 'Juki A2B Overlock Machine' },
      { id: 'E4S', name: 'Brother E4S Serger' },
      { id: 'T5C', name: 'Toyota T5C Flatlock' },
      { id: 'J3H', name: 'Jack J3H Coverstitch' },
      { id: 'R7M', name: 'Ribber R7M Machine' },
      { id: 'P9K', name: 'Pfaff P9K Industrial' }
    ];
    
    const quotes = [];
    const numberOfQuotes = 200; // Generate 200 sample quotes
    
    // Generate random quotes
    for (let i = 0; i < numberOfQuotes; i++) {
      // Random customer
      const customer = customers[Math.floor(Math.random() * customers.length)];
      
      // Random model
      const model = models[Math.floor(Math.random() * models.length)];
      
      // Random date within last 90 days
      const daysAgo = Math.floor(Math.random() * 90);
      const quoteDate = new Date();
      quoteDate.setDate(quoteDate.getDate() - daysAgo);
      
      // Random unit price (between 80k-180k BDT)
      const unitPrice = 80000 + Math.floor(Math.random() * 100000);
      
      // Random quantity (1-10)
      const quantity = Math.floor(Math.random() * 10) + 1;
      
      // Generate quote ID
      const quoteId = `QUOTE-${quoteDate.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      
      quotes.push({
        quote_id: quoteId,
        machine_model_id: model.id,
        machine_model_name: model.name,
        customer_id: customer.id,
        customer_name: customer.name,
        unit_price: unitPrice,
        quantity: quantity,
        total_price: unitPrice * quantity,
        quotation_date: quoteDate.toISOString().split('T')[0],
        status: ['SENT', 'ACCEPTED', 'CONVERTED', 'EXPIRED'][Math.floor(Math.random() * 4)],
        sales_representative: `REP-${Math.floor(Math.random() * 10) + 1}`,
        branch: ['DHK-1', 'CTG-1', 'SYL-1', 'RAJ-1', 'KHU-1'][Math.floor(Math.random() * 5)]
      });
    }
    
    return quotes;
  } catch (error) {
    console.error('Error generating simulated quote database:', error);
    return [];
  }
}

/**
 * Generate quote summary statistics
 * @param {Array} quotes - Array of quotes
 * @param {number} days - Number of days analyzed
 * @returns {Object} Summary statistics
 */
function generateQuoteSummary(quotes, days) {
  try {
    if (quotes.length === 0) {
      return {
        total_quotes: 0,
        total_value: 0,
        average_quote_value: 0,
        conversion_rate: 0,
        top_models: [],
        top_customers: [],
        time_period_days: days
      };
    }
    
    // Calculate totals
    const totalQuotes = quotes.length;
    const totalValue = quotes.reduce((sum, quote) => sum + quote.total_price, 0);
    const averageQuoteValue = totalValue / totalQuotes;
    
    // Calculate conversion rate (converted / sent + accepted + converted)
    const convertedQuotes = quotes.filter(q => q.status === 'CONVERTED').length;
    const activeQuotes = quotes.filter(q => q.status !== 'EXPIRED').length;
    const conversionRate = activeQuotes > 0 ? (convertedQuotes / activeQuotes) * 100 : 0;
    
    // Get top models by count
    const modelCounts = {};
    quotes.forEach(quote => {
      if (!modelCounts[quote.machine_model_id]) {
        modelCounts[quote.machine_model_id] = 0;
      }
      modelCounts[quote.machine_model_id]++;
    });
    
    const topModels = Object.entries(modelCounts)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Get top customers by total value
    const customerValues = {};
    quotes.forEach(quote => {
      if (!customerValues[quote.customer_name]) {
        customerValues[quote.customer_name] = 0;
      }
      customerValues[quote.customer_name] += quote.total_price;
    });
    
    const topCustomers = Object.entries(customerValues)
      .map(([customer, value]) => ({ customer, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    return {
      total_quotes: totalQuotes,
      total_value: totalValue,
      average_quote_value: Math.round(averageQuoteValue),
      conversion_rate: Math.round(conversionRate * 100) / 100,
      top_models: topModels,
      top_customers: topCustomers,
      time_period_days: days
    };
  } catch (error) {
    console.error('Error generating quote summary:', error);
    return {
      total_quotes: 0,
      total_value: 0,
      average_quote_value: 0,
      conversion_rate: 0,
      top_models: [],
      top_customers: [],
      time_period_days: days
    };
  }
}

/**
 * Get quote trends over time
 * @param {string} userId - User ID
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Object} Quote trends data
 */
async function getQuoteTrends(userId, days = 30) {
  return await withErrorHandling(async () => {
    try {
      // Check cache first
      const cacheKey = generateSearchCacheKey('quote_trends', userId, `${days}`);
      const cachedTrends = await getFromSearchCache(cacheKey);
      
      if (cachedTrends) {
        return {
          success: true,
          trends: cachedTrends,
          fromCache: true
        };
      }
      
      // Get recent quotes
      const recentQuotes = await getRecentQuotesFromDatabase(null, null, days);
      
      // Generate weekly trends
      const weeklyTrends = generateWeeklyTrends(recentQuotes, days);
      
      // Generate model trends
      const modelTrends = generateModelTrends(recentQuotes);
      
      // Generate customer trends
      const customerTrends = generateCustomerTrends(recentQuotes);
      
      const trends = {
        weekly_trends: weeklyTrends,
        model_trends: modelTrends,
        customer_trends: customerTrends,
        period_days: days
      };
      
      // Cache for 4 hours
      await storeInSearchCache(cacheKey, trends, 4);
      
      return {
        success: true,
        trends: trends
      };
    } catch (error) {
      console.error(`Error getting quote trends for user ${userId}:`, error);
      return {
        success: false,
        error: 'An error occurred while retrieving quote trends.'
      };
    }
  })();
}

/**
 * Generate weekly trends from quotes
 * @param {Array} quotes - Array of quotes
 * @param {number} days - Number of days analyzed
 * @returns {Array} Weekly trend data
 */
function generateWeeklyTrends(quotes, days) {
  try {
    // Group quotes by week
    const weeks = {};
    
    quotes.forEach(quote => {
      const quoteDate = new Date(quote.quotation_date);
      // Get week number (simplified)
      const weekStart = new Date(quoteDate);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          date: weekKey,
          quote_count: 0,
          total_value: 0,
          converted_count: 0
        };
      }
      
      weeks[weekKey].quote_count++;
      weeks[weekKey].total_value += quote.total_price;
      if (quote.status === 'CONVERTED') {
        weeks[weekKey].converted_count++;
      }
    });
    
    // Convert to array and sort
    const weeklyData = Object.values(weeks)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return weeklyData;
  } catch (error) {
    console.error('Error generating weekly trends:', error);
    return [];
  }
}

/**
 * Generate model trends from quotes
 * @param {Array} quotes - Array of quotes
 * @returns {Array} Model trend data
 */
function generateModelTrends(quotes) {
  try {
    const modelStats = {};
    
    quotes.forEach(quote => {
      if (!modelStats[quote.machine_model_id]) {
        modelStats[quote.machine_model_id] = {
          model_id: quote.machine_model_id,
          model_name: quote.machine_model_name,
          quote_count: 0,
          total_value: 0,
          converted_count: 0
        };
      }
      
      modelStats[quote.machine_model_id].quote_count++;
      modelStats[quote.machine_model_id].total_value += quote.total_price;
      if (quote.status === 'CONVERTED') {
        modelStats[quote.machine_model_id].converted_count++;
      }
    });
    
    // Convert to array and sort by quote count
    const modelData = Object.values(modelStats)
      .sort((a, b) => b.quote_count - a.quote_count);
    
    return modelData;
  } catch (error) {
    console.error('Error generating model trends:', error);
    return [];
  }
}

/**
 * Generate customer trends from quotes
 * @param {Array} quotes - Array of quotes
 * @returns {Array} Customer trend data
 */
function generateCustomerTrends(quotes) {
  try {
    const customerStats = {};
    
    quotes.forEach(quote => {
      if (!customerStats[quote.customer_id]) {
        customerStats[quote.customer_id] = {
          customer_id: quote.customer_id,
          customer_name: quote.customer_name,
          quote_count: 0,
          total_value: 0,
          converted_count: 0
        };
      }
      
      customerStats[quote.customer_id].quote_count++;
      customerStats[quote.customer_id].total_value += quote.total_price;
      if (quote.status === 'CONVERTED') {
        customerStats[quote.customer_id].converted_count++;
      }
    });
    
    // Convert to array and sort by total value
    const customerData = Object.values(customerStats)
      .sort((a, b) => b.total_value - a.total_value);
    
    return customerData;
  } catch (error) {
    console.error('Error generating customer trends:', error);
    return [];
  }
}

/**
 * Get pricing intelligence for marketing team
 * @param {string} userId - User ID
 * @param {string} modelCode - Model code
 * @param {number} days - Number of days to analyze (default: 90)
 * @returns {Object} Pricing intelligence data
 */
async function getPricingIntelligence(userId, modelCode, days = 90) {
  return await withErrorHandling(async () => {
    try {
      // Validate model code
      if (!validateInputPattern(modelCode, '^[a-zA-Z0-9]{2,4}$')) {
        return {
          success: false,
          error: 'Invalid model code format'
        };
      }
      
      // Check cache first
      const cacheKey = generateSearchCacheKey('pricing_intel', userId, `${modelCode}:${days}`);
      const cachedIntel = await getFromSearchCache(cacheKey);
      
      if (cachedIntel) {
        return {
          success: true,
          intelligence: cachedIntel,
          fromCache: true
        };
      }
      
      // Get quotes for this model
      const modelQuotes = await getRecentQuotesFromDatabase(null, modelCode, days);
      
      if (modelQuotes.length === 0) {
        return {
          success: true,
          intelligence: {
            model_code: modelCode.toUpperCase(),
            message: 'No recent quotes found for this model'
          }
        };
      }
      
      // Calculate pricing statistics
      const prices = modelQuotes.map(q => q.unit_price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      // Get price distribution
      const priceRanges = calculatePriceDistribution(prices);
      
      // Get competitor pricing insights
      const competitorInsights = analyzeCompetitorPricing(modelQuotes);
      
      const intelligence = {
        model_code: modelCode.toUpperCase(),
        model_name: modelQuotes[0].machine_model_name,
        quote_count: modelQuotes.length,
        price_range: {
          minimum: minPrice,
          maximum: maxPrice,
          average: Math.round(avgPrice)
        },
        price_distribution: priceRanges,
        competitor_insights: competitorInsights,
        period_days: days
      };
      
      // Cache for 6 hours
      await storeInSearchCache(cacheKey, intelligence, 6);
      
      return {
        success: true,
        intelligence: intelligence
      };
    } catch (error) {
      console.error(`Error getting pricing intelligence for user ${userId}:`, error);
      return {
        success: false,
        error: 'An error occurred while retrieving pricing intelligence.'
      };
    }
  })();
}

/**
 * Calculate price distribution
 * @param {Array} prices - Array of prices
 * @returns {Object} Price distribution data
 */
function calculatePriceDistribution(prices) {
  try {
    if (prices.length === 0) return {};
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    
    // Create 5 price ranges
    const bucketSize = range / 5;
    const buckets = [];
    
    for (let i = 0; i < 5; i++) {
      const rangeMin = minPrice + (i * bucketSize);
      const rangeMax = i === 4 ? maxPrice : minPrice + ((i + 1) * bucketSize);
      const count = prices.filter(price => price >= rangeMin && price <= rangeMax).length;
      
      buckets.push({
        range_min: Math.round(rangeMin),
        range_max: Math.round(rangeMax),
        count: count,
        percentage: Math.round((count / prices.length) * 100)
      });
    }
    
    return buckets;
  } catch (error) {
    console.error('Error calculating price distribution:', error);
    return [];
  }
}

/**
 * Analyze competitor pricing from quotes
 * @param {Array} quotes - Array of quotes
 * @returns {Object} Competitor analysis
 */
function analyzeCompetitorPricing(quotes) {
  try {
    // Group by customer to identify if they're getting similar quotes
    const customerQuotes = {};
    
    quotes.forEach(quote => {
      if (!customerQuotes[quote.customer_id]) {
        customerQuotes[quote.customer_id] = {
          customer_name: quote.customer_name,
          quotes: []
        };
      }
      customerQuotes[quote.customer_id].quotes.push(quote);
    });
    
    // Find customers who frequently quote this model
    const frequentCustomers = Object.entries(customerQuotes)
      .filter(([_, data]) => data.quotes.length > 2)
      .map(([customerId, data]) => ({
        customer_id: customerId,
        customer_name: data.customer_name,
        quote_count: data.quotes.length,
        avg_price: Math.round(data.quotes.reduce((sum, q) => sum + q.unit_price, 0) / data.quotes.length)
      }))
      .sort((a, b) => b.quote_count - a.quote_count);
    
    return {
      frequent_customers: frequentCustomers.slice(0, 5),
      total_customers_quoting: Object.keys(customerQuotes).length
    };
  } catch (error) {
    console.error('Error analyzing competitor pricing:', error);
    return {
      frequent_customers: [],
      total_customers_quoting: 0
    };
  }
}

// Export functions
module.exports = {
  handleMarketingRecentQuotes,
  getQuoteTrends,
  getPricingIntelligence
};