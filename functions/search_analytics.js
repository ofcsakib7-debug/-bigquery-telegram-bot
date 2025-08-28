// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 1
// Component: search_analytics_dashboard
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 14:00 UTC
// Next Step: Implement search performance optimization
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');

// Lazy initialization of BigQuery client
let bigquery = null;

function getBigQuery() {
  if (!bigquery) {
    bigquery = new BigQuery();
  }
  return bigquery;
}

/**
 * Generate search analytics dashboard data
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.generateSearchAnalyticsDashboard = async (req, res) => {
  try {
    console.log('Generating search analytics dashboard...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get overall search statistics
    const overallStats = await getOverallSearchStatistics(bigqueryClient, datasetId);
    
    // Get department-wise search statistics
    const departmentStats = await getDepartmentSearchStatistics(bigqueryClient, datasetId);
    
    // Get search pattern analysis
    const patternAnalysis = await getSearchPatternAnalysis(bigqueryClient, datasetId);
    
    // Get user engagement metrics
    const engagementMetrics = await getUserEngagementMetrics(bigqueryClient, datasetId);
    
    // Get BQML model performance
    const modelPerformance = await getBqmlModelPerformance(bigqueryClient, datasetId);
    
    // Get cache performance metrics
    const cacheMetrics = await getCachePerformanceMetrics(bigqueryClient, datasetId);
    
    // Compile dashboard data
    const dashboardData = {
      timestamp: new Date().toISOString(),
      overall_stats: overallStats,
      department_stats: departmentStats,
      pattern_analysis: patternAnalysis,
      engagement_metrics: engagementMetrics,
      model_performance: modelPerformance,
      cache_metrics: cacheMetrics
    };
    
    console.log('Search analytics dashboard generated successfully');
    
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Error generating search analytics dashboard:', error);
    res.status(500).json({
      error: 'Error generating search analytics dashboard',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get overall search statistics
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} Overall statistics
 */
async function getOverallSearchStatistics(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('analytics', 'overall_stats', 'dashboard');
    const cachedStats = await getFromCache(cacheKey);
    
    if (cachedStats) {
      return cachedStats;
    }
    
    const query = `
      SELECT
        COUNT(*) AS total_searches,
        COUNT(DISTINCT user_id) AS unique_users,
        COUNT(DISTINCT department_id) AS active_departments,
        COUNTIF(successful_completion = TRUE) AS successful_searches,
        COUNTIF(confidence_score > 0.8) AS high_confidence_searches,
        AVG(confidence_score) AS avg_confidence_score,
        MIN(timestamp) AS first_search,
        MAX(timestamp) AS last_search,
        COUNTIF(selected_alternative = TRUE) AS alternative_selections
      FROM
        \`${datasetId}.search_interactions\`
      WHERE
        DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const stats = rows.length > 0 ? {
      total_searches: parseInt(rows[0].total_searches),
      unique_users: parseInt(rows[0].unique_users),
      active_departments: parseInt(rows[0].active_departments),
      successful_searches: parseInt(rows[0].successful_searches),
      high_confidence_searches: parseInt(rows[0].high_confidence_searches),
      avg_confidence_score: parseFloat(rows[0].avg_confidence_score),
      first_search: rows[0].first_search ? rows[0].first_search.value : null,
      last_search: rows[0].last_search ? rows[0].last_search.value : null,
      alternative_selections: parseInt(rows[0].alternative_selections),
      success_rate: rows[0].total_searches > 0 ? 
        (parseInt(rows[0].successful_searches) / parseInt(rows[0].total_searches) * 100) : 0,
      alternative_rate: rows[0].total_searches > 0 ?
        (parseInt(rows[0].alternative_selections) / parseInt(rows[0].total_searches) * 100) : 0
    } : {
      total_searches: 0,
      unique_users: 0,
      active_departments: 0,
      successful_searches: 0,
      high_confidence_searches: 0,
      avg_confidence_score: 0,
      first_search: null,
      last_search: null,
      alternative_selections: 0,
      success_rate: 0,
      alternative_rate: 0
    };
    
    // Cache for 15 minutes
    await storeInCache(cacheKey, stats, 0.25);
    
    return stats;
  } catch (error) {
    console.error('Error getting overall search statistics:', error);
    return {
      total_searches: 0,
      unique_users: 0,
      active_departments: 0,
      successful_searches: 0,
      high_confidence_searches: 0,
      avg_confidence_score: 0,
      first_search: null,
      last_search: null,
      alternative_selections: 0,
      success_rate: 0,
      alternative_rate: 0
    };
  }
}

/**
 * Get department-wise search statistics
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Array} Department statistics
 */
async function getDepartmentSearchStatistics(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('analytics', 'dept_stats', 'dashboard');
    const cachedStats = await getFromCache(cacheKey);
    
    if (cachedStats) {
      return cachedStats;
    }
    
    const query = `
      SELECT
        department_id,
        COUNT(*) AS search_count,
        COUNT(DISTINCT user_id) AS user_count,
        COUNTIF(successful_completion = TRUE) AS successful_searches,
        AVG(confidence_score) AS avg_confidence_score,
        COUNTIF(query_type = 'PAYMENT') AS payment_queries,
        COUNTIF(query_type = 'CHALLAN') AS challan_queries,
        COUNTIF(query_type = 'STOCK') AS stock_queries,
        COUNTIF(query_type = 'EXPENSE') AS expense_queries,
        COUNTIF(query_type = 'REPORT') AS report_queries
      FROM
        \`${datasetId}.search_interactions\`
      WHERE
        DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY
        department_id
      ORDER BY
        search_count DESC
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const stats = rows.map(row => ({
      department_id: row.department_id,
      search_count: parseInt(row.search_count),
      user_count: parseInt(row.user_count),
      successful_searches: parseInt(row.successful_searches),
      success_rate: row.search_count > 0 ? 
        (parseInt(row.successful_searches) / parseInt(row.search_count) * 100) : 0,
      avg_confidence_score: parseFloat(row.avg_confidence_score),
      payment_queries: parseInt(row.payment_queries),
      challan_queries: parseInt(row.challan_queries),
      stock_queries: parseInt(row.stock_queries),
      expense_queries: parseInt(row.expense_queries),
      report_queries: parseInt(row.report_queries)
    }));
    
    // Cache for 30 minutes
    await storeInCache(cacheKey, stats, 0.5);
    
    return stats;
  } catch (error) {
    console.error('Error getting department search statistics:', error);
    return [];
  }
}

/**
 * Get search pattern analysis
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} Pattern analysis
 */
async function getSearchPatternAnalysis(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('analytics', 'pattern_analysis', 'dashboard');
    const cachedAnalysis = await getFromCache(cacheKey);
    
    if (cachedAnalysis) {
      return cachedAnalysis;
    }
    
    const query = `
      WITH pattern_stats AS (
        SELECT
          input_text,
          COUNT(*) AS usage_count,
          COUNTIF(successful_completion = TRUE) AS successful_completions,
          AVG(confidence_score) AS avg_confidence,
          COUNT(DISTINCT user_id) AS unique_users,
          MAX(timestamp) AS last_used
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY
          input_text
      )
      SELECT
        input_text,
        usage_count,
        successful_completions,
        ROUND(avg_confidence, 2) AS avg_confidence,
        unique_users,
        last_used,
        ROUND(SAFE_DIVIDE(successful_completions, usage_count) * 100, 1) AS success_rate
      FROM
        pattern_stats
      WHERE
        usage_count >= 3  -- Only patterns used at least 3 times
      ORDER BY
        usage_count DESC
      LIMIT 20
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const analysis = {
      top_patterns: rows.map(row => ({
        pattern: row.input_text,
        usage_count: parseInt(row.usage_count),
        successful_completions: parseInt(row.successful_completions),
        success_rate: parseFloat(row.success_rate),
        avg_confidence: parseFloat(row.avg_confidence),
        unique_users: parseInt(row.unique_users),
        last_used: row.last_used ? row.last_used.value : null
      })),
      total_analyzed_patterns: rows.length
    };
    
    // Cache for 1 hour
    await storeInCache(cacheKey, analysis, 1);
    
    return analysis;
  } catch (error) {
    console.error('Error getting search pattern analysis:', error);
    return {
      top_patterns: [],
      total_analyzed_patterns: 0
    };
  }
}

/**
 * Get user engagement metrics
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} Engagement metrics
 */
async function getUserEngagementMetrics(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('analytics', 'engagement_metrics', 'dashboard');
    const cachedMetrics = await getFromCache(cacheKey);
    
    if (cachedMetrics) {
      return cachedMetrics;
    }
    
    const query = `
      WITH user_activity AS (
        SELECT
          user_id,
          COUNT(*) AS total_searches,
          COUNTIF(successful_completion = TRUE) AS successful_searches,
          COUNT(DISTINCT department_id) AS departments_used,
          COUNT(DISTINCT DATE(timestamp)) AS active_days,
          MIN(timestamp) AS first_search,
          MAX(timestamp) AS last_search,
          AVG(confidence_score) AS avg_confidence
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY
          user_id
      )
      SELECT
        COUNT(*) AS total_users,
        COUNTIF(total_searches >= 10) AS active_users,
        COUNTIF(total_searches >= 50) AS power_users,
        COUNTIF(active_days >= 15) AS frequent_users,
        AVG(total_searches) AS avg_searches_per_user,
        AVG(successful_searches) AS avg_successful_searches,
        AVG(departments_used) AS avg_departments_per_user,
        AVG(active_days) AS avg_active_days,
        AVG(avg_confidence) AS overall_avg_confidence
      FROM
        user_activity
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const metrics = rows.length > 0 ? {
      total_users: parseInt(rows[0].total_users),
      active_users: parseInt(rows[0].active_users),
      power_users: parseInt(rows[0].power_users),
      frequent_users: parseInt(rows[0].frequent_users),
      avg_searches_per_user: parseFloat(rows[0].avg_searches_per_user),
      avg_successful_searches: parseFloat(rows[0].avg_successful_searches),
      avg_departments_per_user: parseFloat(rows[0].avg_departments_per_user),
      avg_active_days: parseFloat(rows[0].avg_active_days),
      overall_avg_confidence: parseFloat(rows[0].overall_avg_confidence),
      active_user_percentage: rows[0].total_users > 0 ? 
        (parseInt(rows[0].active_users) / parseInt(rows[0].total_users) * 100) : 0
    } : {
      total_users: 0,
      active_users: 0,
      power_users: 0,
      frequent_users: 0,
      avg_searches_per_user: 0,
      avg_successful_searches: 0,
      avg_departments_per_user: 0,
      avg_active_days: 0,
      overall_avg_confidence: 0,
      active_user_percentage: 0
    };
    
    // Cache for 30 minutes
    await storeInCache(cacheKey, metrics, 0.5);
    
    return metrics;
  } catch (error) {
    console.error('Error getting user engagement metrics:', error);
    return {
      total_users: 0,
      active_users: 0,
      power_users: 0,
      frequent_users: 0,
      avg_searches_per_user: 0,
      avg_successful_searches: 0,
      avg_departments_per_user: 0,
      avg_active_days: 0,
      overall_avg_confidence: 0,
      active_user_percentage: 0
    };
  }
}

/**
 * Get BQML model performance metrics
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} Model performance metrics
 */
async function getBqmlModelPerformance(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('analytics', 'model_performance', 'dashboard');
    const cachedPerformance = await getFromCache(cacheKey);
    
    if (cachedPerformance) {
      return cachedPerformance;
    }
    
    // Try to get model evaluation metrics
    try {
      const query = `
        SELECT
          *
        FROM
          ML.EVALUATE(MODEL \`${datasetId}.search_intent_model\`)
      `;
      
      const options = {
        query: query,
        location: 'us-central1'
      };
      
      const [rows] = await bigqueryClient.query(options);
      
      const performance = rows.length > 0 ? {
        precision: parseFloat(rows[0].precision),
        recall: parseFloat(rows[0].recall),
        accuracy: parseFloat(rows[0].accuracy),
        f1_score: parseFloat(rows[0].f1_score),
        log_loss: parseFloat(rows[0].log_loss),
        roc_auc: parseFloat(rows[0].roc_auc)
      } : {
        precision: 0,
        recall: 0,
        accuracy: 0,
        f1_score: 0,
        log_loss: 0,
        roc_auc: 0
      };
      
      // Cache for 2 hours
      await storeInCache(cacheKey, performance, 2);
      
      return performance;
    } catch (modelError) {
      // Model might not exist yet, return default values
      console.log('Search intent model not yet available, returning default performance metrics');
      return {
        precision: 0,
        recall: 0,
        accuracy: 0,
        f1_score: 0,
        log_loss: 0,
        roc_auc: 0
      };
    }
  } catch (error) {
    console.error('Error getting BQML model performance:', error);
    return {
      precision: 0,
      recall: 0,
      accuracy: 0,
      f1_score: 0,
      log_loss: 0,
      roc_auc: 0
    };
  }
}

/**
 * Get cache performance metrics
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} Cache performance metrics
 */
async function getCachePerformanceMetrics(bigqueryClient, datasetId) {
  try {
    // Check cache first (different cache key to avoid confusion)
    const cacheKey = generateCacheKey('analytics', 'cache_metrics', 'dashboard');
    const cachedMetrics = await getFromCache(cacheKey);
    
    if (cachedMetrics) {
      return cachedMetrics;
    }
    
    // Get cache hit rates from master_cache table
    const query = `
      SELECT
        COUNT(*) AS total_cache_entries,
        AVG(hit_count) AS avg_hit_count,
        MAX(hit_count) AS max_hit_count,
        COUNTIF(hit_count > 0) AS used_entries,
        COUNTIF(expires_at < CURRENT_TIMESTAMP()) AS expired_entries
      FROM
        \`${datasetId}.master_cache\`
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const metrics = rows.length > 0 ? {
      total_cache_entries: parseInt(rows[0].total_cache_entries),
      avg_hit_count: parseFloat(rows[0].avg_hit_count),
      max_hit_count: parseInt(rows[0].max_hit_count),
      used_entries: parseInt(rows[0].used_entries),
      expired_entries: parseInt(rows[0].expired_entries),
      cache_efficiency: rows[0].total_cache_entries > 0 ? 
        (parseInt(rows[0].used_entries) / parseInt(rows[0].total_cache_entries) * 100) : 0,
      expiration_rate: rows[0].total_cache_entries > 0 ? 
        (parseInt(rows[0].expired_entries) / parseInt(rows[0].total_cache_entries) * 100) : 0
    } : {
      total_cache_entries: 0,
      avg_hit_count: 0,
      max_hit_count: 0,
      used_entries: 0,
      expired_entries: 0,
      cache_efficiency: 0,
      expiration_rate: 0
    };
    
    // Cache for 1 hour
    await storeInCache(cacheKey, metrics, 1);
    
    return metrics;
  } catch (error) {
    console.error('Error getting cache performance metrics:', error);
    return {
      total_cache_entries: 0,
      avg_hit_count: 0,
      max_hit_count: 0,
      used_entries: 0,
      expired_entries: 0,
      cache_efficiency: 0,
      expiration_rate: 0
    };
  }
}

/**
 * Generate department-specific analytics report
 * @param {string} departmentId - Department ID
 * @returns {Object} Department-specific analytics
 */
async function generateDepartmentAnalyticsReport(departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Generating analytics report for department: ${departmentId}`);
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      // Check cache first
      const cacheKey = generateCacheKey('analytics', 'dept_report', departmentId);
      const cachedReport = await getFromCache(cacheKey);
      
      if (cachedReport) {
        return {
          success: true,
          report: cachedReport,
          fromCache: true
        };
      }
      
      // Get department-specific search statistics
      const deptStatsQuery = `
        SELECT
          COUNT(*) AS total_searches,
          COUNTIF(successful_completion = TRUE) AS successful_searches,
          COUNT(DISTINCT user_id) AS unique_users,
          AVG(confidence_score) AS avg_confidence_score,
          COUNTIF(query_type = 'PAYMENT') AS payment_queries,
          COUNTIF(query_type = 'CHALLAN') AS challan_queries,
          COUNTIF(query_type = 'STOCK') AS stock_queries,
          COUNTIF(query_type = 'EXPENSE') AS expense_queries,
          COUNTIF(query_type = 'REPORT') AS report_queries,
          MIN(timestamp) AS first_search,
          MAX(timestamp) AS last_search
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          department_id = @departmentId
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      `;
      
      const deptStatsOptions = {
        query: deptStatsQuery,
        location: 'us-central1',
        params: { departmentId }
      };
      
      const [deptStatsRows] = await bigqueryClient.query(deptStatsOptions);
      
      const departmentStats = deptStatsRows.length > 0 ? {
        total_searches: parseInt(deptStatsRows[0].total_searches),
        successful_searches: parseInt(deptStatsRows[0].successful_searches),
        success_rate: deptStatsRows[0].total_searches > 0 ? 
          (parseInt(deptStatsRows[0].successful_searches) / parseInt(deptStatsRows[0].total_searches) * 100) : 0,
        unique_users: parseInt(deptStatsRows[0].unique_users),
        avg_confidence_score: parseFloat(deptStatsRows[0].avg_confidence_score),
        payment_queries: parseInt(deptStatsRows[0].payment_queries),
        challan_queries: parseInt(deptStatsRows[0].challan_queries),
        stock_queries: parseInt(deptStatsRows[0].stock_queries),
        expense_queries: parseInt(deptStatsRows[0].expense_queries),
        report_queries: parseInt(deptStatsRows[0].report_queries),
        first_search: deptStatsRows[0].first_search ? deptStatsRows[0].first_search.value : null,
        last_search: deptStatsRows[0].last_search ? deptStatsRows[0].last_search.value : null
      } : {
        total_searches: 0,
        successful_searches: 0,
        success_rate: 0,
        unique_users: 0,
        avg_confidence_score: 0,
        payment_queries: 0,
        challan_queries: 0,
        stock_queries: 0,
        expense_queries: 0,
        report_queries: 0,
        first_search: null,
        last_search: null
      };
      
      // Get top users in department
      const topUsersQuery = `
        SELECT
          user_id,
          COUNT(*) AS search_count,
          COUNTIF(successful_completion = TRUE) AS successful_searches,
          AVG(confidence_score) AS avg_confidence
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          department_id = @departmentId
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY
          user_id
        ORDER BY
          search_count DESC
        LIMIT 10
      `;
      
      const topUsersOptions = {
        query: topUsersQuery,
        location: 'us-central1',
        params: { departmentId }
      };
      
      const [topUsersRows] = await bigqueryClient.query(topUsersOptions);
      
      const topUsers = topUsersRows.map(row => ({
        user_id: row.user_id,
        search_count: parseInt(row.search_count),
        successful_searches: parseInt(row.successful_searches),
        success_rate: row.search_count > 0 ? 
          (parseInt(row.successful_searches) / parseInt(row.search_count) * 100) : 0,
        avg_confidence: parseFloat(row.avg_confidence)
      }));
      
      // Get popular search patterns in department
      const popularPatternsQuery = `
        SELECT
          input_text,
          COUNT(*) AS usage_count,
          COUNTIF(successful_completion = TRUE) AS successful_completions,
          AVG(confidence_score) AS avg_confidence
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          department_id = @departmentId
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY
          input_text
        ORDER BY
          usage_count DESC
        LIMIT 15
      `;
      
      const popularPatternsOptions = {
        query: popularPatternsQuery,
        location: 'us-central1',
        params: { departmentId }
      };
      
      const [popularPatternsRows] = await bigqueryClient.query(popularPatternsOptions);
      
      const popularPatterns = popularPatternsRows.map(row => ({
        pattern: row.input_text,
        usage_count: parseInt(row.usage_count),
        successful_completions: parseInt(row.successful_completions),
        success_rate: row.usage_count > 0 ? 
          (parseInt(row.successful_completions) / parseInt(row.usage_count) * 100) : 0,
        avg_confidence: parseFloat(row.avg_confidence)
      }));
      
      // Compile department report
      const report = {
        department_id: departmentId,
        timestamp: new Date().toISOString(),
        statistics: departmentStats,
        top_users: topUsers,
        popular_patterns: popularPatterns,
        period_days: 30
      };
      
      // Cache for 2 hours
      await storeInCache(cacheKey, report, 2);
      
      return {
        success: true,
        report: report
      };
    } catch (error) {
      console.error(`Error generating department analytics report for ${departmentId}:`, error);
      return {
        success: false,
        error: 'An error occurred while generating the department analytics report.'
      };
    }
  })();
}

/**
 * Get real-time search performance metrics
 * @returns {Object} Real-time performance metrics
 */
async function getRealTimeSearchMetrics() {
  return await withErrorHandling(async () => {
    try {
      // Check cache first
      const cacheKey = generateCacheKey('analytics', 'realtime_metrics', 'current');
      const cachedMetrics = await getFromCache(cacheKey);
      
      if (cachedMetrics) {
        return {
          success: true,
          metrics: cachedMetrics,
          fromCache: true
        };
      }
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      // Get searches in the last hour
      const recentQuery = `
        SELECT
          COUNT(*) AS recent_searches,
          COUNTIF(successful_completion = TRUE) AS recent_successes,
          AVG(confidence_score) AS avg_recent_confidence,
          COUNT(DISTINCT user_id) AS recent_unique_users
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
      `;
      
      const recentOptions = {
        query: recentQuery,
        location: 'us-central1'
      };
      
      const [recentRows] = await bigqueryClient.query(recentOptions);
      
      const recentMetrics = recentRows.length > 0 ? {
        recent_searches: parseInt(recentRows[0].recent_searches),
        recent_successes: parseInt(recentRows[0].recent_successes),
        recent_success_rate: recentRows[0].recent_searches > 0 ? 
          (parseInt(recentRows[0].recent_successes) / parseInt(recentRows[0].recent_searches) * 100) : 0,
        avg_recent_confidence: parseFloat(recentRows[0].avg_recent_confidence),
        recent_unique_users: parseInt(recentRows[0].recent_unique_users)
      } : {
        recent_searches: 0,
        recent_successes: 0,
        recent_success_rate: 0,
        avg_recent_confidence: 0,
        recent_unique_users: 0
      };
      
      // Get trending patterns in last 24 hours
      const trendingQuery = `
        SELECT
          input_text,
          COUNT(*) AS usage_count,
          COUNTIF(successful_completion = TRUE) AS successful_completions
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        GROUP BY
          input_text
        ORDER BY
          usage_count DESC
        LIMIT 5
      `;
      
      const trendingOptions = {
        query: trendingQuery,
        location: 'us-central1'
      };
      
      const [trendingRows] = await bigqueryClient.query(trendingOptions);
      
      const trendingPatterns = trendingRows.map(row => ({
        pattern: row.input_text,
        usage_count: parseInt(row.usage_count),
        successful_completions: parseInt(row.successful_completions),
        success_rate: row.usage_count > 0 ? 
          (parseInt(row.successful_completions) / parseInt(row.usage_count) * 100) : 0
      }));
      
      // Compile real-time metrics
      const metrics = {
        timestamp: new Date().toISOString(),
        recent_metrics: recentMetrics,
        trending_patterns: trendingPatterns,
        period_hours: 1
      };
      
      // Cache for 5 minutes
      await storeInCache(cacheKey, metrics, 0.083); // ~5 minutes
      
      return {
        success: true,
        metrics: metrics
      };
    } catch (error) {
      console.error('Error getting real-time search metrics:', error);
      return {
        success: false,
        error: 'An error occurred while retrieving real-time metrics.'
      };
    }
  })();
}

// Export functions
module.exports = {
  generateDepartmentAnalyticsReport,
  getRealTimeSearchMetrics
};