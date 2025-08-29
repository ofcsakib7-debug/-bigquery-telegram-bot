/**
 * Dealer Performance & Trend Analysis System
 * 
 * This module implements the dealer performance metrics functionality
 * as specified in Design 11.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Record dealer performance metrics
 * @param {Object} metricsData - Performance metrics data
 * @returns {string} Metric ID
 */
async function recordDealerPerformanceMetrics(metricsData) {
  try {
    // Generate metric ID
    const metricId = `METRIC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Determine performance category based on score
    let performanceCategory;
    if (metricsData.performanceScore >= 90) {
      performanceCategory = 'EXCELLENT';
    } else if (metricsData.performanceScore >= 75) {
      performanceCategory = 'GOOD';
    } else if (metricsData.performanceScore >= 60) {
      performanceCategory = 'FAIR';
    } else {
      performanceCategory = 'POOR';
    }
    
    // Set values
    const metrics = {
      metric_id: metricId,
      dealer_id: metricsData.dealerId,
      dealer_name: metricsData.dealerName,
      metric_date: metricsData.metricDate || new Date().toISOString().split('T')[0],
      sales_value_bdt: metricsData.salesValueBdt,
      sales_quantity: metricsData.salesQuantity,
      collection_efficiency: metricsData.collectionEfficiency,
      stock_turnover_ratio: metricsData.stockTurnoverRatio,
      average_payment_delay_days: metricsData.averagePaymentDelayDays,
      new_customer_acquisition: metricsData.newCustomerAcquisition,
      machine_service_rate: metricsData.machineServiceRate,
      performance_score: metricsData.performanceScore,
      performance_category: performanceCategory,
      created_at: new Date().toISOString()
    };
    
    // Insert performance metrics
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_performance_metrics\`
      (metric_id, dealer_id, dealer_name, metric_date, sales_value_bdt, sales_quantity,
       collection_efficiency, stock_turnover_ratio, average_payment_delay_days, new_customer_acquisition,
       machine_service_rate, performance_score, performance_category, created_at)
      VALUES
      (@metric_id, @dealer_id, @dealer_name, @metric_date, @sales_value_bdt, @sales_quantity,
       @collection_efficiency, @stock_turnover_ratio, @average_payment_delay_days, @new_customer_acquisition,
       @machine_service_rate, @performance_score, @performance_category, @created_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: metrics
    };
    
    await bigquery.createQueryJob(options);
    
    return metricId;
  } catch (error) {
    console.error('Error recording dealer performance metrics:', error);
    throw error;
  }
}

/**
 * Get dealer performance metrics by dealer ID
 * @param {string} dealerId - Dealer ID
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of performance metrics
 */
async function getDealerPerformanceMetrics(dealerId, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_performance_metrics\`
      WHERE dealer_id = @dealerId
    `;
    
    const params = {
      dealerId: dealerId
    };
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND metric_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND metric_date <= @endDate';
      params.endDate = filters.endDate;
    }
    
    // Add performance category filter if provided
    if (filters.performanceCategory) {
      query += ' AND performance_category = @performanceCategory';
      params.performanceCategory = filters.performanceCategory;
    }
    
    query += ' ORDER BY metric_date DESC';
    
    // Add limit if provided
    if (filters.limit) {
      query += ' LIMIT @limit';
      params.limit = filters.limit;
    }
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting dealer performance metrics:', error);
    return [];
  }
}

/**
 * Get dealer performance summary
 * @param {string} dealerId - Dealer ID
 * @returns {Object|null} Performance summary or null if not found
 */
async function getDealerPerformanceSummary(dealerId) {
  try {
    const query = `
      SELECT 
        dealer_id,
        dealer_name,
        COUNT(*) as total_metrics_records,
        AVG(performance_score) as average_performance_score,
        AVG(sales_value_bdt) as average_sales_value_bdt,
        AVG(collection_efficiency) as average_collection_efficiency,
        AVG(stock_turnover_ratio) as average_stock_turnover_ratio,
        AVG(average_payment_delay_days) as average_payment_delay_days,
        SUM(new_customer_acquisition) as total_new_customers,
        AVG(machine_service_rate) as average_machine_service_rate,
        COUNTIF(performance_category = 'EXCELLENT') as excellent_months,
        COUNTIF(performance_category = 'GOOD') as good_months,
        COUNTIF(performance_category = 'FAIR') as fair_months,
        COUNTIF(performance_category = 'POOR') as poor_months
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_performance_metrics\`
      WHERE dealer_id = @dealerId
      GROUP BY dealer_id, dealer_name
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        dealerId: dealerId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting dealer performance summary:', error);
    return null;
  }
}

/**
 * Get top performing dealers
 * @param {number} limit - Number of dealers to return
 * @param {string} performanceCategory - Performance category filter (optional)
 * @returns {Array} Array of top performing dealers
 */
async function getTopPerformingDealers(limit = 10, performanceCategory = null) {
  try {
    let query = `
      SELECT 
        dealer_id,
        dealer_name,
        AVG(performance_score) as average_performance_score,
        AVG(sales_value_bdt) as average_sales_value_bdt,
        COUNT(*) as metrics_count
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_performance_metrics\`
    `;
    
    const params = {};
    
    if (performanceCategory) {
      query += ' WHERE performance_category = @performanceCategory';
      params.performanceCategory = performanceCategory;
    }
    
    query += `
      GROUP BY dealer_id, dealer_name
      ORDER BY average_performance_score DESC
      LIMIT @limit
    `;
    
    params.limit = limit;
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting top performing dealers:', error);
    return [];
  }
}

/**
 * Get dealers by performance category
 * @param {string} performanceCategory - Performance category (EXCELLENT, GOOD, FAIR, POOR)
 * @returns {Array} Array of dealers
 */
async function getDealersByPerformanceCategory(performanceCategory) {
  try {
    const query = `
      SELECT DISTINCT
        dealer_id,
        dealer_name,
        performance_score,
        metric_date
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_performance_metrics\`
      WHERE performance_category = @performanceCategory
      ORDER BY performance_score DESC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        performanceCategory: performanceCategory
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting dealers by performance category:', error);
    return [];
  }
}

/**
 * Get performance trend for a dealer
 * @param {string} dealerId - Dealer ID
 * @param {number} months - Number of months to analyze
 * @returns {Array} Array of performance trends
 */
async function getDealerPerformanceTrend(dealerId, months = 12) {
  try {
    const query = `
      SELECT 
        metric_date,
        performance_score,
        sales_value_bdt,
        collection_efficiency,
        stock_turnover_ratio
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_performance_metrics\`
      WHERE dealer_id = @dealerId
        AND metric_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @months MONTH)
      ORDER BY metric_date ASC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        dealerId: dealerId,
        months: months
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting dealer performance trend:', error);
    return [];
  }
}

/**
 * Get performance statistics
 * @param {Object} filters - Additional filters
 * @returns {Object|null} Performance statistics or null if not found
 */
async function getPerformanceStatistics(filters = {}) {
  try {
    let query = `
      SELECT 
        COUNT(DISTINCT dealer_id) as total_dealers,
        COUNT(*) as total_metrics_records,
        AVG(performance_score) as average_performance_score,
        MIN(performance_score) as min_performance_score,
        MAX(performance_score) as max_performance_score,
        AVG(sales_value_bdt) as average_sales_value_bdt,
        AVG(collection_efficiency) as average_collection_efficiency,
        AVG(stock_turnover_ratio) as average_stock_turnover_ratio,
        COUNTIF(performance_category = 'EXCELLENT') as excellent_count,
        COUNTIF(performance_category = 'GOOD') as good_count,
        COUNTIF(performance_category = 'FAIR') as fair_count,
        COUNTIF(performance_category = 'POOR') as poor_count
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_performance_metrics\`
    `;
    
    const params = {};
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' WHERE metric_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      if (filters.startDate) {
        query += ' AND metric_date <= @endDate';
      } else {
        query += ' WHERE metric_date <= @endDate';
      }
      params.endDate = filters.endDate;
    }
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting performance statistics:', error);
    return null;
  }
}

/**
 * Update dealer performance score using BQML
 * @param {string} dealerId - Dealer ID
 * @returns {Object|null} Updated performance information or null if not found
 */
async function updateDealerPerformanceScoreWithBQML(dealerId) {
  try {
    // This would typically use a BQML model to predict performance score
    // For now, we'll simulate the process
    
    // Get latest performance metrics for the dealer
    const latestMetrics = await getDealerPerformanceMetrics(dealerId, { limit: 1 });
    
    if (latestMetrics.length === 0) {
      return null;
    }
    
    // In a real implementation, this would use a BQML model:
    /*
    const query = `
      SELECT *
      FROM ML.PREDICT(MODEL \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_trend_model\`,
        (SELECT 
          sales_value_bdt,
          collection_efficiency,
          stock_turnover_ratio,
          average_payment_delay_days,
          new_customer_acquisition,
          machine_service_rate
        FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_performance_metrics\`
        WHERE dealer_id = @dealerId
        ORDER BY metric_date DESC
        LIMIT 1)
      )
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        dealerId: dealerId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
    */
    
    // For now, return the latest metrics
    return latestMetrics[0];
  } catch (error) {
    console.error('Error updating dealer performance score with BQML:', error);
    return null;
  }
}

// Export functions
module.exports = {
  recordDealerPerformanceMetrics,
  getDealerPerformanceMetrics,
  getDealerPerformanceSummary,
  getTopPerformingDealers,
  getDealersByPerformanceCategory,
  getDealerPerformanceTrend,
  getPerformanceStatistics,
  updateDealerPerformanceScoreWithBQML
};