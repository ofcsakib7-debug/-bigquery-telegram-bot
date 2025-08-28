// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: search_monitoring_alerting
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 16:15 UTC
// Next Step: Implement search pattern learning
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');
const { validateInputPattern } = require('./security');

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
 * Monitor search system performance and send alerts
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.monitorSearchSystem = async (req, res) => {
  try {
    console.log('Starting search system monitoring...');
    
    const bigqueryClient = getBigQuery();
    const firestoreClient = getFirestore();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get system metrics
    const systemMetrics = await getSystemMetrics(bigqueryClient, datasetId);
    
    // Check for anomalies
    const anomalies = await detectAnomalies(bigqueryClient, datasetId, systemMetrics);
    
    // Send alerts if needed
    await sendAlertsIfNecessary(anomalies, systemMetrics);
    
    // Store metrics in Firestore for historical tracking
    await storeMetricsInFirestore(firestoreClient, systemMetrics);
    
    console.log('Search system monitoring completed');
    
    res.status(200).json({
      success: true,
      metrics: systemMetrics,
      anomalies: anomalies,
      alerts_sent: anomalies.length > 0
    });
  } catch (error) {
    console.error('Error monitoring search system:', error);
    res.status(500).json({ error: 'Error monitoring search system' });
  }
};

/**
 * Get system metrics from BigQuery
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} System metrics
 */
async function getSystemMetrics(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('monitoring', 'system_metrics', 'current');
    const cachedMetrics = await getFromCache(cacheKey);
    
    if (cachedMetrics) {
      return cachedMetrics;
    }
    
    // Get recent search interactions
    const interactionsQuery = `
      SELECT
        COUNT(*) as total_interactions,
        COUNTIF(successful_completion = TRUE) as successful_interactions,
        COUNTIF(confidence_score > 0.8) as high_confidence_interactions,
        COUNTIF(confidence_score < 0.3) as low_confidence_interactions,
        AVG(confidence_score) as avg_confidence_score,
        AVG(response_time_seconds) as avg_response_time,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT department_id) as active_departments,
        MIN(timestamp) as first_interaction,
        MAX(timestamp) as last_interaction
      FROM \`${datasetId}.search_interactions\`
      WHERE DATE(timestamp) = CURRENT_DATE()
    `;
    
    const interactionsOptions = {
      query: interactionsQuery,
      location: 'us-central1'
    };
    
    const [interactionsRows] = await bigqueryClient.query(interactionsOptions);
    
    const interactionsMetrics = interactionsRows.length > 0 ? {
      total_interactions: parseInt(interactionsRows[0].total_interactions) || 0,
      successful_interactions: parseInt(interactionsRows[0].successful_interactions) || 0,
      high_confidence_interactions: parseInt(interactionsRows[0].high_confidence_interactions) || 0,
      low_confidence_interactions: parseInt(interactionsRows[0].low_confidence_interactions) || 0,
      avg_confidence_score: parseFloat(interactionsRows[0].avg_confidence_score) || 0,
      avg_response_time: parseFloat(interactionsRows[0].avg_response_time) || 0,
      unique_users: parseInt(interactionsRows[0].unique_users) || 0,
      active_departments: parseInt(interactionsRows[0].active_departments) || 0,
      first_interaction: interactionsRows[0].first_interaction ? interactionsRows[0].first_interaction.value : null,
      last_interaction: interactionsRows[0].last_interaction ? interactionsRows[0].last_interaction.value : null,
      success_rate: interactionsRows[0].total_interactions > 0 ? 
        (parseInt(interactionsRows[0].successful_interactions) / parseInt(interactionsRows[0].total_interactions) * 100) : 0,
      high_confidence_rate: interactionsRows[0].total_interactions > 0 ? 
        (parseInt(interactionsRows[0].high_confidence_interactions) / parseInt(interactionsRows[0].total_interactions) * 100) : 0,
      low_confidence_rate: interactionsRows[0].total_interactions > 0 ? 
        (parseInt(interactionsRows[0].low_confidence_interactions) / parseInt(interactionsRows[0].total_interactions) * 100) : 0
    } : {
      total_interactions: 0,
      successful_interactions: 0,
      high_confidence_interactions: 0,
      low_confidence_interactions: 0,
      avg_confidence_score: 0,
      avg_response_time: 0,
      unique_users: 0,
      active_departments: 0,
      first_interaction: null,
      last_interaction: null,
      success_rate: 0,
      high_confidence_rate: 0,
      low_confidence_rate: 0
    };
    
    // Get cache performance metrics
    const cacheQuery = `
      SELECT
        COUNT(*) as total_cache_entries,
        AVG(hit_count) as avg_hit_count,
        MAX(hit_count) as max_hit_count,
        COUNTIF(expires_at < CURRENT_TIMESTAMP()) as expired_entries,
        COUNTIF(expires_at > CURRENT_TIMESTAMP()) as active_entries
      FROM \`${datasetId}.master_cache\`
    `;
    
    const cacheOptions = {
      query: cacheQuery,
      location: 'us-central1'
    };
    
    const [cacheRows] = await bigqueryClient.query(cacheOptions);
    
    const cacheMetrics = cacheRows.length > 0 ? {
      total_cache_entries: parseInt(cacheRows[0].total_cache_entries) || 0,
      avg_hit_count: parseFloat(cacheRows[0].avg_hit_count) || 0,
      max_hit_count: parseInt(cacheRows[0].max_hit_count) || 0,
      expired_entries: parseInt(cacheRows[0].expired_entries) || 0,
      active_entries: parseInt(cacheRows[0].active_entries) || 0,
      cache_efficiency: cacheRows[0].total_cache_entries > 0 ? 
        (parseInt(cacheRows[0].active_entries) / parseInt(cacheRows[0].total_cache_entries) * 100) : 0,
      expiration_rate: cacheRows[0].total_cache_entries > 0 ? 
        (parseInt(cacheRows[0].expired_entries) / parseInt(cacheRows[0].total_cache_entries) * 100) : 0
    } : {
      total_cache_entries: 0,
      avg_hit_count: 0,
      max_hit_count: 0,
      expired_entries: 0,
      active_entries: 0,
      cache_efficiency: 0,
      expiration_rate: 0
    };
    
    // Get error metrics
    const errorQuery = `
      SELECT
        COUNT(*) as total_errors,
        COUNTIF(error_type = 'VALIDATION_ERROR') as validation_errors,
        COUNTIF(error_type = 'SYNTAX_ERROR') as syntax_errors,
        COUNTIF(error_type = 'LOGIC_ERROR') as logic_errors,
        COUNTIF(error_type = 'TIMEOUT_ERROR') as timeout_errors,
        COUNTIF(error_type = 'RATE_LIMIT_ERROR') as rate_limit_errors,
        COUNTIF(error_type = 'INTERNAL_ERROR') as internal_errors,
        MIN(timestamp) as first_error,
        MAX(timestamp) as last_error
      FROM \`${datasetId}.error_logs\`
      WHERE DATE(timestamp) = CURRENT_DATE()
    `;
    
    const errorOptions = {
      query: errorQuery,
      location: 'us-central1'
    };
    
    const [errorRows] = await bigqueryClient.query(errorOptions);
    
    const errorMetrics = errorRows.length > 0 ? {
      total_errors: parseInt(errorRows[0].total_errors) || 0,
      validation_errors: parseInt(errorRows[0].validation_errors) || 0,
      syntax_errors: parseInt(errorRows[0].syntax_errors) || 0,
      logic_errors: parseInt(errorRows[0].logic_errors) || 0,
      timeout_errors: parseInt(errorRows[0].timeout_errors) || 0,
      rate_limit_errors: parseInt(errorRows[0].rate_limit_errors) || 0,
      internal_errors: parseInt(errorRows[0].internal_errors) || 0,
      first_error: errorRows[0].first_error ? errorRows[0].first_error.value : null,
      last_error: errorRows[0].last_error ? errorRows[0].last_error.value : null,
      error_rate: interactionsMetrics.total_interactions > 0 ? 
        (parseInt(errorRows[0].total_errors) / interactionsMetrics.total_interactions * 100) : 0,
      validation_error_rate: errorRows[0].total_errors > 0 ? 
        (parseInt(errorRows[0].validation_errors) / parseInt(errorRows[0].total_errors) * 100) : 0,
      syntax_error_rate: errorRows[0].total_errors > 0 ? 
        (parseInt(errorRows[0].syntax_errors) / parseInt(errorRows[0].total_errors) * 100) : 0,
      logic_error_rate: errorRows[0].total_errors > 0 ? 
        (parseInt(errorRows[0].logic_errors) / parseInt(errorRows[0].total_errors) * 100) : 0,
      timeout_error_rate: errorRows[0].total_errors > 0 ? 
        (parseInt(errorRows[0].timeout_errors) / parseInt(errorRows[0].total_errors) * 100) : 0,
      rate_limit_error_rate: errorRows[0].total_errors > 0 ? 
        (parseInt(errorRows[0].rate_limit_errors) / parseInt(errorRows[0].total_errors) * 100) : 0,
      internal_error_rate: errorRows[0].total_errors > 0 ? 
        (parseInt(errorRows[0].internal_errors) / parseInt(errorRows[0].total_errors) * 100) : 0
    } : {
      total_errors: 0,
      validation_errors: 0,
      syntax_errors: 0,
      logic_errors: 0,
      timeout_errors: 0,
      rate_limit_errors: 0,
      internal_errors: 0,
      first_error: null,
      last_error: null,
      error_rate: 0,
      validation_error_rate: 0,
      syntax_error_rate: 0,
      logic_error_rate: 0,
      timeout_error_rate: 0,
      rate_limit_error_rate: 0,
      internal_error_rate: 0
    };
    
    // Compile system metrics
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      interactions: interactionsMetrics,
      cache: cacheMetrics,
      errors: errorMetrics,
      overall_health: calculateOverallHealth(interactionsMetrics, cacheMetrics, errorMetrics)
    };
    
    // Cache for 15 minutes
    await storeInCache(cacheKey, systemMetrics, 0.25);
    
    return systemMetrics;
  } catch (error) {
    console.error('Error getting system metrics:', error);
    return {
      timestamp: new Date().toISOString(),
      interactions: {
        total_interactions: 0,
        successful_interactions: 0,
        high_confidence_interactions: 0,
        low_confidence_interactions: 0,
        avg_confidence_score: 0,
        avg_response_time: 0,
        unique_users: 0,
        active_departments: 0,
        first_interaction: null,
        last_interaction: null,
        success_rate: 0,
        high_confidence_rate: 0,
        low_confidence_rate: 0
      },
      cache: {
        total_cache_entries: 0,
        avg_hit_count: 0,
        max_hit_count: 0,
        expired_entries: 0,
        active_entries: 0,
        cache_efficiency: 0,
        expiration_rate: 0
      },
      errors: {
        total_errors: 0,
        validation_errors: 0,
        syntax_errors: 0,
        logic_errors: 0,
        timeout_errors: 0,
        rate_limit_errors: 0,
        internal_errors: 0,
        first_error: null,
        last_error: null,
        error_rate: 0,
        validation_error_rate: 0,
        syntax_error_rate: 0,
        logic_error_rate: 0,
        timeout_error_rate: 0,
        rate_limit_error_rate: 0,
        internal_error_rate: 0
      },
      overall_health: 'UNKNOWN'
    };
  }
}

/**
 * Calculate overall system health
 * @param {Object} interactionsMetrics - Interactions metrics
 * @param {Object} cacheMetrics - Cache metrics
 * @param {Object} errorMetrics - Error metrics
 * @returns {string} Overall health status
 */
function calculateOverallHealth(interactionsMetrics, cacheMetrics, errorMetrics) {
  try {
    // Calculate health score based on multiple factors
    let healthScore = 0;
    let totalFactors = 0;
    
    // Factor 1: Success rate (weight: 30%)
    if (interactionsMetrics.success_rate >= 95) {
      healthScore += 30;
    } else if (interactionsMetrics.success_rate >= 90) {
      healthScore += 25;
    } else if (interactionsMetrics.success_rate >= 85) {
      healthScore += 20;
    } else if (interactionsMetrics.success_rate >= 80) {
      healthScore += 15;
    } else {
      healthScore += 5;
    }
    totalFactors += 30;
    
    // Factor 2: Response time (weight: 20%)
    if (interactionsMetrics.avg_response_time <= 1.0) {
      healthScore += 20;
    } else if (interactionsMetrics.avg_response_time <= 2.0) {
      healthScore += 15;
    } else if (interactionsMetrics.avg_response_time <= 3.0) {
      healthScore += 10;
    } else {
      healthScore += 0;
    }
    totalFactors += 20;
    
    // Factor 3: Cache efficiency (weight: 15%)
    if (cacheMetrics.cache_efficiency >= 90) {
      healthScore += 15;
    } else if (cacheMetrics.cache_efficiency >= 80) {
      healthScore += 12;
    } else if (cacheMetrics.cache_efficiency >= 70) {
      healthScore += 8;
    } else {
      healthScore += 4;
    }
    totalFactors += 15;
    
    // Factor 4: Error rate (weight: 20%)
    if (errorMetrics.error_rate <= 1.0) {
      healthScore += 20;
    } else if (errorMetrics.error_rate <= 2.0) {
      healthScore += 15;
    } else if (errorMetrics.error_rate <= 5.0) {
      healthScore += 10;
    } else {
      healthScore += 0;
    }
    totalFactors += 20;
    
    // Factor 5: Confidence score (weight: 15%)
    if (interactionsMetrics.avg_confidence_score >= 0.9) {
      healthScore += 15;
    } else if (interactionsMetrics.avg_confidence_score >= 0.8) {
      healthScore += 12;
    } else if (interactionsMetrics.avg_confidence_score >= 0.7) {
      healthScore += 8;
    } else {
      healthScore += 4;
    }
    totalFactors += 15;
    
    // Calculate percentage
    const healthPercentage = (healthScore / totalFactors) * 100;
    
    // Determine health status
    if (healthPercentage >= 90) {
      return 'HEALTHY';
    } else if (healthPercentage >= 75) {
      return 'GOOD';
    } else if (healthPercentage >= 60) {
      return 'FAIR';
    } else if (healthPercentage >= 40) {
      return 'POOR';
    } else {
      return 'CRITICAL';
    }
  } catch (error) {
    console.error('Error calculating overall health:', error);
    return 'UNKNOWN';
  }
}

/**
 * Detect anomalies in system metrics
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @param {Object} systemMetrics - Current system metrics
 * @returns {Array} Detected anomalies
 */
async function detectAnomalies(bigqueryClient, datasetId, systemMetrics) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('monitoring', 'detected_anomalies', 'current');
    const cachedAnomalies = await getFromCache(cacheKey);
    
    if (cachedAnomalies) {
      return cachedAnomalies;
    }
    
    const anomalies = [];
    
    // Check for success rate drop
    if (systemMetrics.interactions.success_rate < 85) {
      anomalies.push({
        type: 'SUCCESS_RATE_DROP',
        severity: 'HIGH',
        description: `Success rate dropped to ${systemMetrics.interactions.success_rate.toFixed(1)}% (threshold: 85%)`,
        detected_at: new Date().toISOString()
      });
    }
    
    // Check for response time increase
    if (systemMetrics.interactions.avg_response_time > 3.0) {
      anomalies.push({
        type: 'RESPONSE_TIME_INCREASE',
        severity: 'HIGH',
        description: `Average response time increased to ${systemMetrics.interactions.avg_response_time.toFixed(2)}s (threshold: 3.0s)`,
        detected_at: new Date().toISOString()
      });
    }
    
    // Check for cache efficiency drop
    if (systemMetrics.cache.cache_efficiency < 70) {
      anomalies.push({
        type: 'CACHE_EFFICIENCY_DROP',
        severity: 'MEDIUM',
        description: `Cache efficiency dropped to ${systemMetrics.cache.cache_efficiency.toFixed(1)}% (threshold: 70%)`,
        detected_at: new Date().toISOString()
      });
    }
    
    // Check for error rate spike
    if (systemMetrics.errors.error_rate > 5.0) {
      anomalies.push({
        type: 'ERROR_RATE_SPIKE',
        severity: 'HIGH',
        description: `Error rate spiked to ${systemMetrics.errors.error_rate.toFixed(1)}% (threshold: 5.0%)`,
        detected_at: new Date().toISOString()
      });
    }
    
    // Check for confidence score drop
    if (systemMetrics.interactions.avg_confidence_score < 0.7) {
      anomalies.push({
        type: 'CONFIDENCE_SCORE_DROP',
        severity: 'MEDIUM',
        description: `Average confidence score dropped to ${systemMetrics.interactions.avg_confidence_score.toFixed(2)} (threshold: 0.7)`,
        detected_at: new Date().toISOString()
      });
    }
    
    // Check for validation error spikes
    if (systemMetrics.errors.validation_error_rate > 30) {
      anomalies.push({
        type: 'VALIDATION_ERROR_SPIKE',
        severity: 'MEDIUM',
        description: `Validation error rate increased to ${systemMetrics.errors.validation_error_rate.toFixed(1)}% (threshold: 30%)`,
        detected_at: new Date().toISOString()
      });
    }
    
    // Check for syntax error spikes
    if (systemMetrics.errors.syntax_error_rate > 20) {
      anomalies.push({
        type: 'SYNTAX_ERROR_SPIKE',
        severity: 'MEDIUM',
        description: `Syntax error rate increased to ${systemMetrics.errors.syntax_error_rate.toFixed(1)}% (threshold: 20%)`,
        detected_at: new Date().toISOString()
      });
    }
    
    // Cache for 5 minutes
    await storeInCache(cacheKey, anomalies, 0.083);
    
    return anomalies;
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return [];
  }
}

/**
 * Send alerts if necessary based on anomalies
 * @param {Array} anomalies - Detected anomalies
 * @param {Object} systemMetrics - System metrics
 */
async function sendAlertsIfNecessary(anomalies, systemMetrics) {
  try {
    if (anomalies.length === 0) {
      console.log('No anomalies detected, no alerts to send');
      return;
    }
    
    // Send alerts for high severity anomalies
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'HIGH');
    if (highSeverityAnomalies.length > 0) {
      await sendCriticalAlert(highSeverityAnomalies, systemMetrics);
    }
    
    // Send alerts for medium severity anomalies
    const mediumSeverityAnomalies = anomalies.filter(a => a.severity === 'MEDIUM');
    if (mediumSeverityAnomalies.length > 0) {
      await sendWarningAlert(mediumSeverityAnomalies, systemMetrics);
    }
    
    console.log(`Sent ${anomalies.length} alerts (${highSeverityAnomalies.length} critical, ${mediumSeverityAnomalies.length} warning)`);
  } catch (error) {
    console.error('Error sending alerts:', error);
  }
}

/**
 * Send critical alert for high severity anomalies
 * @param {Array} anomalies - High severity anomalies
 * @param {Object} systemMetrics - System metrics
 */
async function sendCriticalAlert(anomalies, systemMetrics) {
  try {
    console.log('SENDING CRITICAL ALERT:', JSON.stringify({
      anomalies: anomalies,
      system_metrics: systemMetrics,
      severity: 'CRITICAL',
      timestamp: new Date().toISOString()
    }, null, 2));
    
    // In a real implementation, we would send alerts via:
    // - Email to administrators
    // - SMS to on-call engineers
    // - Slack/Teams notifications
    // - PagerDuty alerts
    // - Push notifications to mobile devices
    
    // For now, we'll just log the alert
  } catch (error) {
    console.error('Error sending critical alert:', error);
  }
}

/**
 * Send warning alert for medium severity anomalies
 * @param {Array} anomalies - Medium severity anomalies
 * @param {Object} systemMetrics - System metrics
 */
async function sendWarningAlert(anomalies, systemMetrics) {
  try {
    console.log('SENDING WARNING ALERT:', JSON.stringify({
      anomalies: anomalies,
      system_metrics: systemMetrics,
      severity: 'WARNING',
      timestamp: new Date().toISOString()
    }, null, 2));
    
    // In a real implementation, we would send alerts via:
    // - Email notifications
    // - Slack/Teams notifications
    // - Dashboard alerts
    // - In-app notifications
    
    // For now, we'll just log the alert
  } catch (error) {
    console.error('Error sending warning alert:', error);
  }
}

/**
 * Store metrics in Firestore for historical tracking
 * @param {Object} firestoreClient - Firestore client
 * @param {Object} systemMetrics - System metrics
 */
async function storeMetricsInFirestore(firestoreClient, systemMetrics) {
  try {
    // Create metrics ID
    const metricsId = `METRICS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Prepare metrics document
    const metricsDocument = {
      metrics_id: metricsId,
      timestamp: systemMetrics.timestamp,
      interactions: systemMetrics.interactions,
      cache: systemMetrics.cache,
      errors: systemMetrics.errors,
      overall_health: systemMetrics.overall_health,
      created_at: new Date().toISOString()
    };
    
    // Store in Firestore
    await firestoreClient.collection('system_metrics').doc(metricsId).set(metricsDocument);
    
    console.log(`Stored system metrics with ID: ${metricsId}`);
  } catch (error) {
    console.error('Error storing metrics in Firestore:', error);
  }
}

/**
 * Generate search system health report
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.generateHealthReport = async (req, res) => {
  try {
    console.log('Generating search system health report...');
    
    const bigqueryClient = getBigQuery();
    const firestoreClient = getFirestore();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get current system metrics
    const systemMetrics = await getSystemMetrics(bigqueryClient, datasetId);
    
    // Get historical metrics for trend analysis
    const historicalMetrics = await getHistoricalMetrics(firestoreClient);
    
    // Get anomaly history
    const anomalyHistory = await getAnomalyHistory(firestoreClient);
    
    // Generate health report
    const healthReport = {
      timestamp: new Date().toISOString(),
      current_metrics: systemMetrics,
      historical_trends: analyzeHistoricalTrends(systemMetrics, historicalMetrics),
      anomaly_history: anomalyHistory,
      recommendations: generateRecommendations(systemMetrics, historicalMetrics, anomalyHistory)
    };
    
    console.log('Search system health report generated');
    
    res.status(200).json(healthReport);
  } catch (error) {
    console.error('Error generating health report:', error);
    res.status(500).json({ error: 'Error generating health report' });
  }
};

/**
 * Get historical metrics from Firestore
 * @param {Object} firestoreClient - Firestore client
 * @returns {Array} Historical metrics
 */
async function getHistoricalMetrics(firestoreClient) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('monitoring', 'historical_metrics', 'last_week');
    const cachedMetrics = await getFromCache(cacheKey);
    
    if (cachedMetrics) {
      return cachedMetrics;
    }
    
    // Get metrics from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const metricsSnapshot = await firestoreClient
      .collection('system_metrics')
      .where('timestamp', '>=', sevenDaysAgo.toISOString())
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
    const historicalMetrics = [];
    metricsSnapshot.forEach(doc => {
      historicalMetrics.push(doc.data());
    });
    
    // Cache for 1 hour
    await storeInCache(cacheKey, historicalMetrics, 1);
    
    return historicalMetrics;
  } catch (error) {
    console.error('Error getting historical metrics:', error);
    return [];
  }
}

/**
 * Get anomaly history from Firestore
 * @param {Object} firestoreClient - Firestore client
 * @returns {Array} Anomaly history
 */
async function getAnomalyHistory(firestoreClient) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('monitoring', 'anomaly_history', 'last_week');
    const cachedAnomalies = await getFromCache(cacheKey);
    
    if (cachedAnomalies) {
      return cachedAnomalies;
    }
    
    // Get anomalies from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const anomaliesSnapshot = await firestoreClient
      .collection('anomalies')
      .where('detected_at', '>=', sevenDaysAgo.toISOString())
      .orderBy('detected_at', 'desc')
      .limit(50)
      .get();
    
    const anomalyHistory = [];
    anomaliesSnapshot.forEach(doc => {
      anomalyHistory.push(doc.data());
    });
    
    // Cache for 1 hour
    await storeInCache(cacheKey, anomalyHistory, 1);
    
    return anomalyHistory;
  } catch (error) {
    console.error('Error getting anomaly history:', error);
    return [];
  }
}

/**
 * Analyze historical trends
 * @param {Object} currentMetrics - Current system metrics
 * @param {Array} historicalMetrics - Historical metrics
 * @returns {Object} Trend analysis
 */
function analyzeHistoricalTrends(currentMetrics, historicalMetrics) {
  try {
    if (historicalMetrics.length === 0) {
      return {
        trend_direction: 'UNKNOWN',
        trend_strength: 0,
        metrics_trend: {}
      };
    }
    
    // Calculate averages for last 7 days
    const historicalAverages = calculateHistoricalAverages(historicalMetrics);
    
    // Compare current metrics with historical averages
    const trends = {};
    
    // Success rate trend
    const successRateTrend = currentMetrics.interactions.success_rate - historicalAverages.interactions.success_rate;
    trends.success_rate = {
      current: currentMetrics.interactions.success_rate,
      historical_average: historicalAverages.interactions.success_rate,
      difference: successRateTrend,
      trend_direction: successRateTrend > 0 ? 'IMPROVING' : successRateTrend < 0 ? 'DECLINING' : 'STABLE',
      trend_strength: Math.abs(successRateTrend)
    };
    
    // Response time trend
    const responseTimeTrend = currentMetrics.interactions.avg_response_time - historicalAverages.interactions.avg_response_time;
    trends.response_time = {
      current: currentMetrics.interactions.avg_response_time,
      historical_average: historicalAverages.interactions.avg_response_time,
      difference: responseTimeTrend,
      trend_direction: responseTimeTrend < 0 ? 'IMPROVING' : responseTimeTrend > 0 ? 'DECLINING' : 'STABLE',
      trend_strength: Math.abs(responseTimeTrend)
    };
    
    // Cache efficiency trend
    const cacheEfficiencyTrend = currentMetrics.cache.cache_efficiency - historicalAverages.cache.cache_efficiency;
    trends.cache_efficiency = {
      current: currentMetrics.cache.cache_efficiency,
      historical_average: historicalAverages.cache.cache_efficiency,
      difference: cacheEfficiencyTrend,
      trend_direction: cacheEfficiencyTrend > 0 ? 'IMPROVING' : cacheEfficiencyTrend < 0 ? 'DECLINING' : 'STABLE',
      trend_strength: Math.abs(cacheEfficiencyTrend)
    };
    
    // Error rate trend
    const errorRateTrend = currentMetrics.errors.error_rate - historicalAverages.errors.error_rate;
    trends.error_rate = {
      current: currentMetrics.errors.error_rate,
      historical_average: historicalAverages.errors.error_rate,
      difference: errorRateTrend,
      trend_direction: errorRateTrend < 0 ? 'IMPROVING' : errorRateTrend > 0 ? 'DECLINING' : 'STABLE',
      trend_strength: Math.abs(errorRateTrend)
    };
    
    // Confidence score trend
    const confidenceScoreTrend = currentMetrics.interactions.avg_confidence_score - historicalAverages.interactions.avg_confidence_score;
    trends.confidence_score = {
      current: currentMetrics.interactions.avg_confidence_score,
      historical_average: historicalAverages.interactions.avg_confidence_score,
      difference: confidenceScoreTrend,
      trend_direction: confidenceScoreTrend > 0 ? 'IMPROVING' : confidenceScoreTrend < 0 ? 'DECLINING' : 'STABLE',
      trend_strength: Math.abs(confidenceScoreTrend)
    };
    
    // Determine overall trend direction and strength
    const positiveTrends = Object.values(trends).filter(t => t.trend_direction === 'IMPROVING').length;
    const negativeTrends = Object.values(trends).filter(t => t.trend_direction === 'DECLINING').length;
    const stableTrends = Object.values(trends).filter(t => t.trend_direction === 'STABLE').length;
    
    let trendDirection = 'STABLE';
    let trendStrength = 0;
    
    if (positiveTrends > negativeTrends && positiveTrends > stableTrends) {
      trendDirection = 'IMPROVING';
      trendStrength = positiveTrends / Object.keys(trends).length;
    } else if (negativeTrends > positiveTrends && negativeTrends > stableTrends) {
      trendDirection = 'DECLINING';
      trendStrength = negativeTrends / Object.keys(trends).length;
    }
    
    return {
      trend_direction: trendDirection,
      trend_strength: trendStrength,
      metrics_trend: trends
    };
  } catch (error) {
    console.error('Error analyzing historical trends:', error);
    return {
      trend_direction: 'UNKNOWN',
      trend_strength: 0,
      metrics_trend: {}
    };
  }
}

/**
 * Calculate historical averages
 * @param {Array} historicalMetrics - Historical metrics
 * @returns {Object} Historical averages
 */
function calculateHistoricalAverages(historicalMetrics) {
  try {
    if (historicalMetrics.length === 0) {
      return {
        interactions: {
          success_rate: 0,
          avg_response_time: 0,
          avg_confidence_score: 0
        },
        cache: {
          cache_efficiency: 0
        },
        errors: {
          error_rate: 0
        }
      };
    }
    
    // Calculate averages for each metric
    let totalSuccessRate = 0;
    let totalResponseTime = 0;
    let totalConfidenceScore = 0;
    let totalCacheEfficiency = 0;
    let totalErrorRate = 0;
    
    historicalMetrics.forEach(metric => {
      totalSuccessRate += metric.interactions.success_rate || 0;
      totalResponseTime += metric.interactions.avg_response_time || 0;
      totalConfidenceScore += metric.interactions.avg_confidence_score || 0;
      totalCacheEfficiency += metric.cache.cache_efficiency || 0;
      totalErrorRate += metric.errors.error_rate || 0;
    });
    
    const count = historicalMetrics.length;
    
    return {
      interactions: {
        success_rate: totalSuccessRate / count,
        avg_response_time: totalResponseTime / count,
        avg_confidence_score: totalConfidenceScore / count
      },
      cache: {
        cache_efficiency: totalCacheEfficiency / count
      },
      errors: {
        error_rate: totalErrorRate / count
      }
    };
  } catch (error) {
    console.error('Error calculating historical averages:', error);
    return {
      interactions: {
        success_rate: 0,
        avg_response_time: 0,
        avg_confidence_score: 0
      },
      cache: {
        cache_efficiency: 0
      },
      errors: {
        error_rate: 0
      }
    };
  }
}

/**
 * Generate recommendations based on metrics and trends
 * @param {Object} currentMetrics - Current system metrics
 * @param {Array} historicalMetrics - Historical metrics
 * @param {Array} anomalyHistory - Anomaly history
 * @returns {Array} Recommendations
 */
function generateRecommendations(currentMetrics, historicalMetrics, anomalyHistory) {
  try {
    const recommendations = [];
    
    // Recommendation 1: Based on success rate
    if (currentMetrics.interactions.success_rate < 85) {
      recommendations.push({
        priority: 'HIGH',
        category: 'SUCCESS_RATE',
        recommendation: 'Investigate causes of low success rate',
        action: 'Review recent interactions and error logs to identify failure patterns',
        impact: 'High impact on user experience'
      });
    }
    
    // Recommendation 2: Based on response time
    if (currentMetrics.interactions.avg_response_time > 3.0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'RESPONSE_TIME',
        recommendation: 'Optimize query performance',
        action: 'Review slow queries and consider adding indexes or optimizing cache strategies',
        impact: 'High impact on user experience'
      });
    }
    
    // Recommendation 3: Based on cache efficiency
    if (currentMetrics.cache.cache_efficiency < 70) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'CACHE_EFFICIENCY',
        recommendation: 'Improve cache hit rate',
        action: 'Analyze cache misses and optimize cache warming strategies',
        impact: 'Medium impact on performance and costs'
      });
    }
    
    // Recommendation 4: Based on error rate
    if (currentMetrics.errors.error_rate > 5.0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'ERROR_RATE',
        recommendation: 'Address high error rate',
        action: 'Prioritize fixing the most common error types',
        impact: 'High impact on user experience and system reliability'
      });
    }
    
    // Recommendation 5: Based on confidence score
    if (currentMetrics.interactions.avg_confidence_score < 0.7) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'CONFIDENCE_SCORE',
        recommendation: 'Improve query interpretation accuracy',
        action: 'Review low confidence queries and refine pattern matching',
        impact: 'Medium impact on user experience'
      });
    }
    
    // Recommendation 6: Based on anomaly history
    if (anomalyHistory.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'ANOMALY_HISTORY',
        recommendation: 'Implement proactive monitoring',
        action: 'Set up alerts for recurring anomaly patterns',
        impact: 'Medium impact on system reliability'
      });
    }
    
    // Recommendation 7: Based on historical trends (declining)
    const trends = analyzeHistoricalTrends(currentMetrics, historicalMetrics);
    if (trends.trend_direction === 'DECLINING' && trends.trend_strength > 0.5) {
      recommendations.push({
        priority: 'HIGH',
        category: 'TRENDS',
        recommendation: 'Address declining performance trends',
        action: 'Investigate root causes of declining metrics',
        impact: 'High impact on system health'
      });
    }
    
    // Recommendation 8: Based on historical trends (stable)
    if (trends.trend_direction === 'STABLE' && trends.trend_strength < 0.2) {
      recommendations.push({
        priority: 'LOW',
        category: 'TRENDS',
        recommendation: 'Optimize stable performance',
        action: 'Consider incremental improvements for stable metrics',
        impact: 'Low impact on immediate health'
      });
    }
    
    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
}

// Export functions
module.exports = {
  monitorSearchSystem,
  getSystemMetrics,
  calculateOverallHealth,
  detectAnomalies,
  sendAlertsIfNecessary,
  sendCriticalAlert,
  sendWarningAlert,
  storeMetricsInFirestore,
  generateHealthReport,
  getHistoricalMetrics,
  getAnomalyHistory,
  analyzeHistoricalTrends,
  calculateHistoricalAverages,
  generateRecommendations
};