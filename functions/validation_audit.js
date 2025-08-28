// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: validation_audit_workflow
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 16:30 UTC
// Next Step: Implement common corrections cache
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');

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
 * Validation Audit Workflow
 * Tracks validation and corrections with BQML integration
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.validationAuditWorkflow = async (req, res) => {
  try {
    console.log('Starting validation audit workflow...');
    
    const bigqueryClient = getBigQuery();
    const firestoreClient = getFirestore();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get audit parameters
    const { auditType, userId, departmentId, rawInput, inputType, validationStatus, finalValidationStatus, auditorId, correctedValue, autoSuggestionApplied } = req.body;
    
    // Validate required parameters
    if (!auditType || !userId || !departmentId || !rawInput || !inputType || !validationStatus || !finalValidationStatus) {
      return res.status(400).json({ error: 'Missing required audit parameters' });
    }
    
    // Generate audit ID
    const auditId = generateAuditId();
    
    // Create audit record
    const auditRecord = {
      audit_id: auditId,
      user_id: userId.toString(),
      department_id: departmentId.toString(),
      raw_input: rawInput.toString(),
      input_type: inputType.toString(),
      validation_status: validationStatus.toString(),
      final_validation_status: finalValidationStatus.toString(),
      auditor_id: auditorId ? auditorId.toString() : null,
      corrected_value: correctedValue ? correctedValue.toString() : null,
      auto_suggestion_applied: autoSuggestionApplied === true || autoSuggestionApplied === 'true',
      timestamp: new Date().toISOString()
    };
    
    // Store audit record in BigQuery
    await storeAuditRecordInBigQuery(auditRecord, bigqueryClient, datasetId);
    
    // Store audit record in Firestore for real-time access
    await storeAuditRecordInFirestore(auditRecord, firestoreClient);
    
    // Update correction usage statistics
    if (correctedValue && autoSuggestionApplied) {
      await updateCorrectionUsageStats(auditRecord, bigqueryClient, datasetId);
    }
    
    // Log audit workflow completion
    console.log(`Validation audit workflow completed for audit ID: ${auditId}`);
    
    res.status(200).json({
      success: true,
      audit_id: auditId,
      message: 'Validation audit workflow completed'
    });
  } catch (error) {
    console.error('Error in validation audit workflow:', error);
    res.status(500).json({ error: 'Error in validation audit workflow' });
  }
};

/**
 * Generate audit ID
 * @returns {string} Audit ID
 */
function generateAuditId() {
  try {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `AUDIT-${dateStr}-${randomStr}`;
  } catch (error) {
    console.error('Error generating audit ID:', error);
    return `AUDIT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-ABC`;
  }
}

/**
 * Store audit record in BigQuery
 * @param {Object} auditRecord - Audit record
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function storeAuditRecordInBigQuery(auditRecord, bigqueryClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Storing audit record in BigQuery: ${auditRecord.audit_id}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('audit', 'bigquery_store', auditRecord.audit_id);
      const cachedStore = await getFromCache(cacheKey);
      
      if (cachedStore) {
        console.log(`Audit record already stored in BigQuery: ${auditRecord.audit_id}`);
        return;
      }
      
      // Prepare INSERT query
      const query = `
        INSERT INTO \`${datasetId}.validation_audit_workflow\`
        (audit_id, user_id, department_id, raw_input, input_type, validation_status, final_validation_status, auditor_id, corrected_value, auto_suggestion_applied, timestamp)
        VALUES
        (@auditId, @userId, @departmentId, @rawInput, @inputType, @validationStatus, @finalValidationStatus, @auditorId, @correctedValue, @autoSuggestionApplied, @timestamp)
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: {
          auditId: auditRecord.audit_id,
          userId: auditRecord.user_id,
          departmentId: auditRecord.department_id,
          rawInput: auditRecord.raw_input,
          inputType: auditRecord.input_type,
          validationStatus: auditRecord.validation_status,
          finalValidationStatus: auditRecord.final_validation_status,
          auditorId: auditRecord.auditorId,
          correctedValue: auditRecord.corrected_value,
          autoSuggestionApplied: auditRecord.auto_suggestion_applied,
          timestamp: auditRecord.timestamp
        }
      };
      
      await bigqueryClient.query(options);
      
      console.log(`Audit record stored in BigQuery: ${auditRecord.audit_id}`);
      
      // Cache for 1 hour
      await storeInCache(cacheKey, { status: 'stored' }, 1);
      
    } catch (error) {
      console.error(`Error storing audit record in BigQuery for ${auditRecord.audit_id}:`, error);
      throw error;
    }
  })();
}

/**
 * Store audit record in Firestore
 * @param {Object} auditRecord - Audit record
 * @param {Object} firestoreClient - Firestore client
 */
async function storeAuditRecordInFirestore(auditRecord, firestoreClient) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Storing audit record in Firestore: ${auditRecord.audit_id}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('audit', 'firestore_store', auditRecord.audit_id);
      const cachedStore = await getFromCache(cacheKey);
      
      if (cachedStore) {
        console.log(`Audit record already stored in Firestore: ${auditRecord.audit_id}`);
        return;
      }
      
      // Store in Firestore
      await firestoreClient.collection('validation_audit_workflow').doc(auditRecord.audit_id).set(auditRecord);
      
      console.log(`Audit record stored in Firestore: ${auditRecord.audit_id}`);
      
      // Cache for 30 minutes
      await storeInCache(cacheKey, { status: 'stored' }, 0.5);
      
    } catch (error) {
      console.error(`Error storing audit record in Firestore for ${auditRecord.audit_id}:`, error);
      throw error;
    }
  })();
}

/**
 * Update correction usage statistics
 * @param {Object} auditRecord - Audit record
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function updateCorrectionUsageStats(auditRecord, bigqueryClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Updating correction usage stats for audit: ${auditRecord.audit_id}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('audit', 'correction_stats_update', auditRecord.audit_id);
      const cachedUpdate = await getFromCache(cacheKey);
      
      if (cachedUpdate) {
        console.log(`Correction usage stats already updated for audit: ${auditRecord.audit_id}`);
        return;
      }
      
      // Update usage count for this correction
      const query = `
        UPDATE \`${datasetId}.common_corrections\`
        SET 
          usage_count = usage_count + 1,
          last_used = CURRENT_TIMESTAMP()
        WHERE 
          department_id = @departmentId
          AND original_text = @originalText
          AND corrected_text = @correctedText
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: {
          departmentId: auditRecord.department_id,
          originalText: auditRecord.raw_input,
          correctedText: auditRecord.corrected_value
        }
      };
      
      await bigqueryClient.query(options);
      
      console.log(`Correction usage stats updated for audit: ${auditRecord.audit_id}`);
      
      // Cache for 2 hours
      await storeInCache(cacheKey, { status: 'updated' }, 2);
      
    } catch (error) {
      console.error(`Error updating correction usage stats for audit ${auditRecord.audit_id}:`, error);
      throw error;
    }
  })();
}

/**
 * Generate validation audit report
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.generateValidationAuditReport = async (req, res) => {
  try {
    console.log('Generating validation audit report...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get audit parameters
    const { startDate, endDate, departmentId, userId } = req.query;
    
    // Generate audit report
    const auditReport = await generateAuditReport(bigqueryClient, datasetId, startDate, endDate, departmentId, userId);
    
    console.log('Validation audit report generated');
    
    res.status(200).json(auditReport);
  } catch (error) {
    console.error('Error generating validation audit report:', error);
    res.status(500).json({ error: 'Error generating validation audit report' });
  }
};

/**
 * Generate audit report
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {string} departmentId - Department ID
 * @param {string} userId - User ID
 * @returns {Object} Audit report
 */
async function generateAuditReport(bigqueryClient, datasetId, startDate, endDate, departmentId, userId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Generating audit report for ${startDate} to ${endDate}...`);
      
      // Check cache first
      const cacheKey = generateCacheKey('audit', 'report', `${startDate}-${endDate}-${departmentId}-${userId}`);
      const cachedReport = await getFromCache(cacheKey);
      
      if (cachedReport) {
        console.log('Using cached audit report');
        return cachedReport;
      }
      
      // Build WHERE clause based on filters
      let whereClause = 'WHERE DATE(timestamp) >= @startDate AND DATE(timestamp) <= @endDate';
      const params = {
        startDate: startDate || '2023-01-01',
        endDate: endDate || new Date().toISOString().slice(0, 10)
      };
      
      if (departmentId) {
        whereClause += ' AND department_id = @departmentId';
        params.departmentId = departmentId.toString();
      }
      
      if (userId) {
        whereClause += ' AND user_id = @userId';
        params.userId = userId.toString();
      }
      
      // Query audit data
      const query = `
        SELECT
          audit_id,
          user_id,
          department_id,
          raw_input,
          input_type,
          validation_status,
          final_validation_status,
          auditor_id,
          corrected_value,
          auto_suggestion_applied,
          timestamp
        FROM \`${datasetId}.validation_audit_workflow\`
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT 1000
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: params
      };
      
      const [rows] = await bigqueryClient.query(options);
      
      // Process audit data
      const auditData = rows.map(row => ({
        audit_id: row.audit_id,
        user_id: row.user_id,
        department_id: row.department_id,
        raw_input: row.raw_input,
        input_type: row.input_type,
        validation_status: row.validation_status,
        final_validation_status: row.final_validation_status,
        auditor_id: row.auditor_id,
        corrected_value: row.corrected_value,
        auto_suggestion_applied: row.auto_suggestion_applied,
        timestamp: row.timestamp ? row.timestamp.value : null
      }));
      
      // Generate statistics
      const statistics = generateAuditStatistics(auditData);
      
      // Generate report
      const report = {
        report_id: `REPORT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
        period_start: startDate || '2023-01-01',
        period_end: endDate || new Date().toISOString().slice(0, 10),
        department_id: departmentId || 'ALL',
        user_id: userId || 'ALL',
        total_audits: auditData.length,
        audit_data: auditData,
        statistics: statistics,
        generated_at: new Date().toISOString()
      };
      
      // Cache for 4 hours
      await storeInCache(cacheKey, report, 4);
      
      return report;
    } catch (error) {
      console.error('Error generating audit report:', error);
      throw error;
    }
  })();
}

/**
 * Generate audit statistics
 * @param {Array} auditData - Audit data
 * @returns {Object} Audit statistics
 */
function generateAuditStatistics(auditData) {
  try {
    console.log(`Generating audit statistics for ${auditData.length} records...`);
    
    // Initialize counters
    const stats = {
      total_audits: auditData.length,
      validation_status_counts: {
        APPROVED: 0,
        REJECTED: 0,
        CORRECTED: 0
      },
      final_validation_status_counts: {
        APPROVED: 0,
        REJECTED: 0,
        CORRECTED: 0
      },
      auto_suggestion_applied_count: 0,
      department_breakdown: {},
      user_breakdown: {},
      input_type_breakdown: {},
      correction_rate: 0,
      approval_rate: 0
    };
    
    // Process audit data
    auditData.forEach(audit => {
      // Count validation statuses
      if (stats.validation_status_counts[audit.validation_status] !== undefined) {
        stats.validation_status_counts[audit.validation_status]++;
      }
      
      // Count final validation statuses
      if (stats.final_validation_status_counts[audit.final_validation_status] !== undefined) {
        stats.final_validation_status_counts[audit.final_validation_status]++;
      }
      
      // Count auto-suggestions applied
      if (audit.auto_suggestion_applied) {
        stats.auto_suggestion_applied_count++;
      }
      
      // Department breakdown
      if (!stats.department_breakdown[audit.department_id]) {
        stats.department_breakdown[audit.department_id] = 0;
      }
      stats.department_breakdown[audit.department_id]++;
      
      // User breakdown
      if (!stats.user_breakdown[audit.user_id]) {
        stats.user_breakdown[audit.user_id] = 0;
      }
      stats.user_breakdown[audit.user_id]++;
      
      // Input type breakdown
      if (!stats.input_type_breakdown[audit.input_type]) {
        stats.input_type_breakdown[audit.input_type] = 0;
      }
      stats.input_type_breakdown[audit.input_type]++;
    });
    
    // Calculate rates
    if (stats.total_audits > 0) {
      stats.correction_rate = (stats.validation_status_counts.CORRECTED / stats.total_audits) * 100;
      stats.approval_rate = (stats.final_validation_status_counts.APPROVED / stats.total_audits) * 100;
    }
    
    return stats;
  } catch (error) {
    console.error('Error generating audit statistics:', error);
    return {
      total_audits: auditData.length,
      validation_status_counts: {
        APPROVED: 0,
        REJECTED: 0,
        CORRECTED: 0
      },
      final_validation_status_counts: {
        APPROVED: 0,
        REJECTED: 0,
        CORRECTED: 0
      },
      auto_suggestion_applied_count: 0,
      department_breakdown: {},
      user_breakdown: {},
      input_type_breakdown: {},
      correction_rate: 0,
      approval_rate: 0
    };
  }
}

/**
 * Monitor validation audit workflow
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.monitorValidationAuditWorkflow = async (req, res) => {
  try {
    console.log('Monitoring validation audit workflow...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get monitoring data
    const monitoringData = await getAuditWorkflowMonitoringData(bigqueryClient, datasetId);
    
    console.log('Validation audit workflow monitoring completed');
    
    res.status(200).json(monitoringData);
  } catch (error) {
    console.error('Error monitoring validation audit workflow:', error);
    res.status(500).json({ error: 'Error monitoring validation audit workflow' });
  }
};

/**
 * Get audit workflow monitoring data
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} Monitoring data
 */
async function getAuditWorkflowMonitoringData(bigqueryClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log('Getting audit workflow monitoring data...');
      
      // Check cache first
      const cacheKey = generateCacheKey('audit', 'monitoring_data', 'current');
      const cachedData = await getFromCache(cacheKey);
      
      if (cachedData) {
        console.log('Using cached audit workflow monitoring data');
        return cachedData;
      }
      
      // Get audit workflow statistics
      const query = `
        SELECT
          COUNT(*) as total_audits,
          COUNTIF(validation_status = 'APPROVED') as approved_audits,
          COUNTIF(validation_status = 'REJECTED') as rejected_audits,
          COUNTIF(validation_status = 'CORRECTED') as corrected_audits,
          COUNTIF(auto_suggestion_applied = TRUE) as auto_suggestions_applied,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT department_id) as active_departments,
          MIN(timestamp) as first_audit,
          MAX(timestamp) as last_audit,
          COUNTIF(DATE(timestamp) = CURRENT_DATE()) as audits_today
        FROM \`${datasetId}.validation_audit_workflow\`
        WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      `;
      
      const options = {
        query: query,
        location: 'us-central1'
      };
      
      const [rows] = await bigqueryClient.query(options);
      
      const monitoringData = rows.length > 0 ? {
        total_audits: parseInt(rows[0].total_audits) || 0,
        approved_audits: parseInt(rows[0].approved_audits) || 0,
        rejected_audits: parseInt(rows[0].rejected_audits) || 0,
        corrected_audits: parseInt(rows[0].corrected_audits) || 0,
        auto_suggestions_applied: parseInt(rows[0].auto_suggestions_applied) || 0,
        unique_users: parseInt(rows[0].unique_users) || 0,
        active_departments: parseInt(rows[0].active_departments) || 0,
        first_audit: rows[0].first_audit ? rows[0].first_audit.value : null,
        last_audit: rows[0].last_audit ? rows[0].last_audit.value : null,
        audits_today: parseInt(rows[0].audits_today) || 0,
        period_days: 30,
        success_rate: rows[0].total_audits > 0 ? 
          (parseInt(rows[0].approved_audits) / parseInt(rows[0].total_audits) * 100) : 0,
        correction_rate: rows[0].total_audits > 0 ? 
          (parseInt(rows[0].corrected_audits) / parseInt(rows[0].total_audits) * 100) : 0,
        auto_suggestion_rate: rows[0].total_audits > 0 ? 
          (parseInt(rows[0].auto_suggestions_applied) / parseInt(rows[0].total_audits) * 100) : 0
      } : {
        total_audits: 0,
        approved_audits: 0,
        rejected_audits: 0,
        corrected_audits: 0,
        auto_suggestions_applied: 0,
        unique_users: 0,
        active_departments: 0,
        first_audit: null,
        last_audit: null,
        audits_today: 0,
        period_days: 30,
        success_rate: 0,
        correction_rate: 0,
        auto_suggestion_rate: 0
      };
      
      // Cache for 1 hour
      await storeInCache(cacheKey, monitoringData, 1);
      
      return monitoringData;
    } catch (error) {
      console.error('Error getting audit workflow monitoring data:', error);
      throw error;
    }
  })();
}

// Export functions
module.exports = {
  validationAuditWorkflow,
  generateAuditId,
  storeAuditRecordInBigQuery,
  storeAuditRecordInFirestore,
  updateCorrectionUsageStats,
  generateValidationAuditReport,
  generateAuditReport,
  generateAuditStatistics,
  monitorValidationAuditWorkflow,
  getAuditWorkflowMonitoringData
};