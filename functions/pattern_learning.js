// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: search_pattern_learning
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 16:30 UTC
// Next Step: Implement search system documentation
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
 * Learn new search patterns from user interactions
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.learnSearchPatterns = async (req, res) => {
  try {
    console.log('Starting search pattern learning process...');
    
    const bigqueryClient = getBigQuery();
    const firestoreClient = getFirestore();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Discover new patterns from recent interactions
    const newPatterns = await discoverNewPatterns(bigqueryClient, datasetId);
    
    // Validate discovered patterns
    const validatedPatterns = await validateNewPatterns(newPatterns);
    
    // Rank patterns by learning potential
    const rankedPatterns = await rankPatternsByLearningPotential(validatedPatterns);
    
    // Store high-potential patterns
    const storedPatterns = await storeHighPotentialPatterns(rankedPatterns, bigqueryClient, datasetId);
    
    // Update pattern learning analytics
    await updatePatternLearningAnalytics(storedPatterns, firestoreClient);
    
    // Generate learning report
    const learningReport = {
      timestamp: new Date().toISOString(),
      patterns_discovered: newPatterns.length,
      patterns_validated: validatedPatterns.length,
      patterns_ranked: rankedPatterns.length,
      patterns_stored: storedPatterns.length,
      top_patterns: storedPatterns.slice(0, 5).map(p => ({
        pattern: p.pattern,
        department_id: p.department_id,
        learning_potential: p.learning_potential,
        usage_count: p.usage_count
      }))
    };
    
    console.log('Search pattern learning process completed');
    
    res.status(200).json(learningReport);
  } catch (error) {
    console.error('Error in search pattern learning:', error);
    res.status(500).json({ error: 'Error in search pattern learning' });
  }
};

/**
 * Discover new search patterns from recent interactions
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Array} Discovered patterns
 */
async function discoverNewPatterns(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('learning', 'discovered_patterns', 'current');
    const cachedPatterns = await getFromCache(cacheKey);
    
    if (cachedPatterns) {
      console.log('Using cached discovered patterns');
      return cachedPatterns;
    }
    
    // Discover patterns that are frequently used but not in our intention patterns
    const query = `
      WITH recent_interactions AS (
        SELECT
          department_id,
          input_text,
          interpreted_query,
          query_type,
          confidence_score,
          successful_completion,
          COUNT(*) as usage_count,
          COUNT(DISTINCT user_id) as distinct_users,
          MIN(timestamp) as first_used,
          MAX(timestamp) as last_used
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY
          department_id, input_text, interpreted_query, query_type, confidence_score, successful_completion
        HAVING
          usage_count >= 3  -- Used at least 3 times
      ),
      existing_patterns AS (
        SELECT DISTINCT
          department_id,
          pattern
        FROM
          \`${datasetId}.search_intention_patterns\`
      )
      SELECT
        ri.department_id,
        ri.input_text as pattern,
        ri.interpreted_query as expanded_query,
        ri.query_type,
        AVG(ri.confidence_score) as avg_confidence_score,
        AVG(IF(ri.successful_completion, 1.0, 0.0)) as success_rate,
        SUM(ri.usage_count) as total_usage,
        COUNT(ri.distinct_users) as unique_users,
        MIN(ri.first_used) as first_used,
        MAX(ri.last_used) as last_used
      FROM
        recent_interactions ri
      LEFT JOIN
        existing_patterns ep
      ON
        ri.department_id = ep.department_id
        AND ri.input_text = ep.pattern
      WHERE
        ep.pattern IS NULL  -- Not already in our patterns
        AND LENGTH(ri.input_text) <= 20  -- Reasonable pattern length
        AND LENGTH(ri.input_text) >= 2    -- Minimum pattern length
      GROUP BY
        ri.department_id, ri.input_text, ri.interpreted_query, ri.query_type
      HAVING
        AVG(ri.confidence_score) >= 0.6  -- Minimum confidence
        AND AVG(IF(ri.successful_completion, 1.0, 0.0)) >= 0.7  -- Minimum success rate
      ORDER BY
        total_usage DESC,
        success_rate DESC
      LIMIT 100
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const discoveredPatterns = rows.map(row => ({
      department_id: row.department_id,
      pattern: row.pattern,
      expanded_query: row.expanded_query,
      query_type: row.query_type,
      avg_confidence_score: parseFloat(row.avg_confidence_score),
      success_rate: parseFloat(row.success_rate),
      usage_count: parseInt(row.total_usage),
      unique_users: parseInt(row.unique_users),
      first_used: row.first_used ? row.first_used.value : null,
      last_used: row.last_used ? row.last_used.value : null,
      discovered_at: new Date().toISOString()
    }));
    
    // Cache for 2 hours
    await storeInCache(cacheKey, discoveredPatterns, 2);
    
    console.log(`Discovered ${discoveredPatterns.length} new patterns`);
    
    return discoveredPatterns;
  } catch (error) {
    console.error('Error discovering new patterns:', error);
    return [];
  }
}

/**
 * Validate newly discovered patterns
 * @param {Array} patterns - Array of discovered patterns
 * @returns {Array} Validated patterns
 */
async function validateNewPatterns(patterns) {
  try {
    const validatedPatterns = [];
    
    for (const pattern of patterns) {
      try {
        // Validate pattern format
        if (!isValidPatternFormat(pattern.pattern)) {
          console.log(`Skipping invalid pattern format: ${pattern.pattern}`);
          continue;
        }
        
        // Validate expanded query
        if (!pattern.expanded_query || pattern.expanded_query.length === 0) {
          console.log(`Skipping pattern with empty expanded query: ${pattern.pattern}`);
          continue;
        }
        
        // Validate department
        if (!isValidDepartment(pattern.department_id)) {
          console.log(`Skipping pattern with invalid department: ${pattern.department_id}`);
          continue;
        }
        
        // Validate query type
        if (!isValidQueryType(pattern.query_type)) {
          console.log(`Skipping pattern with invalid query type: ${pattern.query_type}`);
          continue;
        }
        
        // Validate confidence score
        if (pattern.avg_confidence_score < 0.0 || pattern.avg_confidence_score > 1.0) {
          console.log(`Skipping pattern with invalid confidence score: ${pattern.avg_confidence_score}`);
          continue;
        }
        
        // Validate success rate
        if (pattern.success_rate < 0.0 || pattern.success_rate > 1.0) {
          console.log(`Skipping pattern with invalid success rate: ${pattern.success_rate}`);
          continue;
        }
        
        // Validate usage count
        if (pattern.usage_count < 0) {
          console.log(`Skipping pattern with negative usage count: ${pattern.usage_count}`);
          continue;
        }
        
        // Validate unique users
        if (pattern.unique_users < 0) {
          console.log(`Skipping pattern with negative unique users: ${pattern.unique_users}`);
          continue;
        }
        
        // Add to validated patterns
        validatedPatterns.push({
          ...pattern,
          validated: true,
          validated_at: new Date().toISOString()
        });
        
      } catch (patternError) {
        console.error(`Error validating pattern ${pattern.pattern}:`, patternError);
      }
    }
    
    console.log(`Validated ${validatedPatterns.length}/${patterns.length} patterns`);
    
    return validatedPatterns;
  } catch (error) {
    console.error('Error validating new patterns:', error);
    return [];
  }
}

/**
 * Check if pattern format is valid
 * @param {string} pattern - Pattern text
 * @returns {boolean} True if valid format
 */
function isValidPatternFormat(pattern) {
  try {
    // Pattern should be 2-20 characters
    if (pattern.length < 2 || pattern.length > 20) {
      return false;
    }
    
    // Pattern should contain only lowercase letters, numbers, spaces, and {variables}
    const validPattern = /^[a-z0-9\s{}]+$/;
    return validPattern.test(pattern);
  } catch (error) {
    console.error('Error validating pattern format:', error);
    return false;
  }
}

/**
 * Check if department is valid
 * @param {string} departmentId - Department ID
 * @returns {boolean} True if valid department
 */
function isValidDepartment(departmentId) {
  try {
    const validDepartments = [
      'ACCOUNTING', 'MARKETING', 'INVENTORY', 'SERVICE', 'SALES', 'HR', 'MANAGEMENT'
    ];
    return validDepartments.includes(departmentId);
  } catch (error) {
    console.error('Error validating department:', error);
    return false;
  }
}

/**
 * Check if query type is valid
 * @param {string} queryType - Query type
 * @returns {boolean} True if valid query type
 */
function isValidQueryType(queryType) {
  try {
    const validQueryTypes = [
      'PAYMENT', 'CHALLAN', 'STOCK', 'VISIT', 'EXPENSE', 'REPORT', 'QUANTITY_STOCK',
      'CUSTOMER', 'ORDER', 'DELIVERY', 'SERVICE', 'MAINTENANCE', 'TECHNICIAN',
      'QUOTATION', 'LEAD', 'CAMPAIGN', 'INVOICE', 'RECEIPT', 'BALANCE', 'SUMMARY'
    ];
    return validQueryTypes.includes(queryType);
  } catch (error) {
    console.error('Error validating query type:', error);
    return false;
  }
}

/**
 * Rank patterns by learning potential
 * @param {Array} patterns - Array of validated patterns
 * @returns {Array} Ranked patterns
 */
async function rankPatternsByLearningPotential(patterns) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('learning', 'ranked_patterns', 'current');
    const cachedRankedPatterns = await getFromCache(cacheKey);
    
    if (cachedRankedPatterns) {
      console.log('Using cached ranked patterns');
      return cachedRankedPatterns;
    }
    
    // Rank patterns by learning potential score
    const rankedPatterns = patterns.map(pattern => {
      const learningPotential = calculateLearningPotentialScore(pattern);
      return {
        ...pattern,
        learning_potential: learningPotential
      };
    }).sort((a, b) => b.learning_potential - a.learning_potential);
    
    // Cache for 3 hours
    await storeInCache(cacheKey, rankedPatterns, 3);
    
    console.log(`Ranked ${rankedPatterns.length} patterns by learning potential`);
    
    return rankedPatterns;
  } catch (error) {
    console.error('Error ranking patterns by learning potential:', error);
    return patterns.map(pattern => ({
      ...pattern,
      learning_potential: 0.5 // Default middle score
    })).sort((a, b) => b.learning_potential - a.learning_potential);
  }
}

/**
 * Calculate learning potential score for a pattern
 * @param {Object} pattern - Pattern object
 * @returns {number} Learning potential score (0.0-1.0)
 */
function calculateLearningPotentialScore(pattern) {
  try {
    // Weighted calculation:
    // 30% usage count (normalized)
    // 25% success rate
    // 20% unique users (normalized)
    // 15% confidence score
    // 10% time since first use (normalized)
    
    // Normalize usage count (assume max 100 for normalization)
    const normalizedUsage = Math.min(pattern.usage_count / 100, 1.0);
    
    // Normalize unique users (assume max 20 for normalization)
    const normalizedUsers = Math.min(pattern.unique_users / 20, 1.0);
    
    // Calculate time since first use (in days)
    const firstUsed = pattern.first_used ? new Date(pattern.first_used) : new Date();
    const daysSinceFirstUse = Math.max(1, (new Date() - firstUsed) / (1000 * 60 * 60 * 24));
    
    // Normalize time since first use (assume max 30 days for normalization)
    const normalizedTime = Math.min(daysSinceFirstUse / 30, 1.0);
    
    const learningPotential =
      (normalizedUsage * 0.3) +
      (pattern.success_rate * 0.25) +
      (normalizedUsers * 0.2) +
      (pattern.avg_confidence_score * 0.15) +
      (normalizedTime * 0.1);
    
    // Ensure score is between 0.0 and 1.0
    return Math.max(0.0, Math.min(1.0, learningPotential));
  } catch (error) {
    console.error('Error calculating learning potential score:', error);
    return 0.5; // Default middle score
  }
}

/**
 * Store high-potential patterns in the database
 * @param {Array} patterns - Array of ranked patterns
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Array} Stored patterns
 */
async function storeHighPotentialPatterns(patterns, bigqueryClient, datasetId) {
  try {
    // Filter for high-potential patterns (learning potential > 0.7)
    const highPotentialPatterns = patterns.filter(pattern => pattern.learning_potential > 0.7);
    
    if (highPotentialPatterns.length === 0) {
      console.log('No high-potential patterns to store');
      return [];
    }
    
    console.log(`Storing ${highPotentialPatterns.length} high-potential patterns...`);
    
    // Generate pattern IDs and prepare for insertion
    const patternsToInsert = highPotentialPatterns.map(pattern => {
      const patternId = `PATTERN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      
      return {
        pattern_id: patternId,
        department_id: pattern.department_id,
        pattern: pattern.pattern,
        expanded_query: pattern.expanded_query,
        query_type: pattern.query_type,
        priority_score: pattern.learning_potential, // Use learning potential as initial priority
        usage_count: pattern.usage_count,
        last_used: pattern.last_used,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    // Insert patterns in batches
    const batchSize = 10;
    const storedPatterns = [];
    
    for (let i = 0; i < patternsToInsert.length; i += batchSize) {
      const batch = patternsToInsert.slice(i, i + batchSize);
      
      try {
        // Prepare INSERT query
        const values = batch.map((_, index) => 
          `(@patternId${index}, @departmentId${index}, @pattern${index}, @expandedQuery${index}, @queryType${index}, @priorityScore${index}, @usageCount${index}, @lastUsed${index}, @createdAt${index}, @updatedAt${index})`
        ).join(', ');
        
        const query = `
          INSERT INTO \`${datasetId}.search_intention_patterns\`
          (pattern_id, department_id, pattern, expanded_query, query_type, priority_score, usage_count, last_used, created_at, updated_at)
          VALUES
          ${values}
        `;
        
        // Prepare parameters
        const params = {};
        batch.forEach((pattern, index) => {
          params[`patternId${index}`] = pattern.pattern_id;
          params[`departmentId${index}`] = pattern.department_id;
          params[`pattern${index}`] = pattern.pattern;
          params[`expandedQuery${index}`] = pattern.expanded_query;
          params[`queryType${index}`] = pattern.query_type;
          params[`priorityScore${index}`] = pattern.priority_score;
          params[`usageCount${index}`] = pattern.usage_count;
          params[`lastUsed${index}`] = pattern.last_used;
          params[`createdAt${index}`] = pattern.created_at;
          params[`updatedAt${index}`] = pattern.updated_at;
        });
        
        const options = {
          query: query,
          location: 'us-central1',
          params: params
        };
        
        await bigqueryClient.query(options);
        
        // Add to stored patterns
        storedPatterns.push(...batch);
        
        console.log(`Stored batch of ${batch.length} patterns`);
        
      } catch (batchError) {
        console.error(`Error storing batch of patterns:`, batchError);
      }
    }
    
    console.log(`Successfully stored ${storedPatterns.length} high-potential patterns`);
    
    return storedPatterns;
  } catch (error) {
    console.error('Error storing high-potential patterns:', error);
    return [];
  }
}

/**
 * Update pattern learning analytics
 * @param {Array} storedPatterns - Array of stored patterns
 * @param {Object} firestoreClient - Firestore client
 */
async function updatePatternLearningAnalytics(storedPatterns, firestoreClient) {
  try {
    if (storedPatterns.length === 0) {
      console.log('No patterns to update analytics for');
      return;
    }
    
    // Update learning analytics in Firestore
    const analyticsDoc = firestoreClient.collection('pattern_learning_analytics').doc('current');
    
    // Get current analytics
    const analyticsSnapshot = await analyticsDoc.get();
    const currentAnalytics = analyticsSnapshot.data() || {
      total_patterns_learned: 0,
      patterns_by_department: {},
      patterns_by_type: {},
      learning_events: [],
      last_updated: new Date().toISOString()
    };
    
    // Update analytics
    const updatedAnalytics = {
      total_patterns_learned: currentAnalytics.total_patterns_learned + storedPatterns.length,
      patterns_by_department: { ...currentAnalytics.patterns_by_department },
      patterns_by_type: { ...currentAnalytics.patterns_by_type },
      learning_events: [...currentAnalytics.learning_events],
      last_updated: new Date().toISOString()
    };
    
    // Update department counts
    storedPatterns.forEach(pattern => {
      if (!updatedAnalytics.patterns_by_department[pattern.department_id]) {
        updatedAnalytics.patterns_by_department[pattern.department_id] = 0;
      }
      updatedAnalytics.patterns_by_department[pattern.department_id]++;
    });
    
    // Update type counts
    storedPatterns.forEach(pattern => {
      if (!updatedAnalytics.patterns_by_type[pattern.query_type]) {
        updatedAnalytics.patterns_by_type[pattern.query_type] = 0;
      }
      updatedAnalytics.patterns_by_type[pattern.query_type]++;
    });
    
    // Add learning events
    storedPatterns.forEach(pattern => {
      updatedAnalytics.learning_events.push({
        pattern_id: pattern.pattern_id,
        department_id: pattern.department_id,
        pattern: pattern.pattern,
        query_type: pattern.query_type,
        learning_potential: pattern.priority_score,
        usage_count: pattern.usage_count,
        learned_at: new Date().toISOString()
      });
    });
    
    // Keep only last 100 learning events
    if (updatedAnalytics.learning_events.length > 100) {
      updatedAnalytics.learning_events = updatedAnalytics.learning_events.slice(-100);
    }
    
    // Store updated analytics
    await analyticsDoc.set(updatedAnalytics);
    
    console.log(`Updated pattern learning analytics with ${storedPatterns.length} new patterns`);
  } catch (error) {
    console.error('Error updating pattern learning analytics:', error);
  }
}

/**
 * Get pattern learning analytics
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.getPatternLearningAnalytics = async (req, res) => {
  try {
    console.log('Getting pattern learning analytics...');
    
    const firestoreClient = getFirestore();
    
    // Get learning analytics from Firestore
    const analyticsDoc = firestoreClient.collection('pattern_learning_analytics').doc('current');
    const analyticsSnapshot = await analyticsDoc.get();
    const analytics = analyticsSnapshot.data() || {
      total_patterns_learned: 0,
      patterns_by_department: {},
      patterns_by_type: {},
      learning_events: [],
      last_updated: new Date().toISOString()
    };
    
    console.log('Pattern learning analytics retrieved');
    
    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error getting pattern learning analytics:', error);
    res.status(500).json({ error: 'Error getting pattern learning analytics' });
  }
};

/**
 * Get recently learned patterns
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.getRecentlyLearnedPatterns = async (req, res) => {
  try {
    console.log('Getting recently learned patterns...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get recently learned patterns (last 7 days)
    const query = `
      SELECT
        pattern_id,
        department_id,
        pattern,
        expanded_query,
        query_type,
        priority_score,
        usage_count,
        created_at
      FROM
        \`${datasetId}.search_intention_patterns\`
      WHERE
        DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      ORDER BY
        created_at DESC
      LIMIT 20
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const recentlyLearnedPatterns = rows.map(row => ({
      pattern_id: row.pattern_id,
      department_id: row.department_id,
      pattern: row.pattern,
      expanded_query: row.expanded_query,
      query_type: row.query_type,
      priority_score: parseFloat(row.priority_score),
      usage_count: parseInt(row.usage_count),
      created_at: row.created_at ? row.created_at.value : null
    }));
    
    console.log(`Retrieved ${recentlyLearnedPatterns.length} recently learned patterns`);
    
    res.status(200).json(recentlyLearnedPatterns);
  } catch (error) {
    console.error('Error getting recently learned patterns:', error);
    res.status(500).json({ error: 'Error getting recently learned patterns' });
  }
};

/**
 * Get learning potential insights
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.getLearningPotentialInsights = async (req, res) => {
  try {
    console.log('Getting learning potential insights...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get learning potential insights
    const query = `
      SELECT
        department_id,
        query_type,
        COUNT(*) as pattern_count,
        AVG(priority_score) as avg_learning_potential,
        MAX(priority_score) as max_learning_potential,
        MIN(priority_score) as min_learning_potential,
        SUM(usage_count) as total_usage
      FROM
        \`${datasetId}.search_intention_patterns\`
      GROUP BY
        department_id, query_type
      ORDER BY
        avg_learning_potential DESC
      LIMIT 20
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const insights = rows.map(row => ({
      department_id: row.department_id,
      query_type: row.query_type,
      pattern_count: parseInt(row.pattern_count),
      avg_learning_potential: parseFloat(row.avg_learning_potential),
      max_learning_potential: parseFloat(row.max_learning_potential),
      min_learning_potential: parseFloat(row.min_learning_potential),
      total_usage: parseInt(row.total_usage)
    }));
    
    console.log(`Retrieved ${insights.length} learning potential insights`);
    
    res.status(200).json(insights);
  } catch (error) {
    console.error('Error getting learning potential insights:', error);
    res.status(500).json({ error: 'Error getting learning potential insights' });
  }
};

// Export functions
module.exports = {
  learnSearchPatterns,
  getPatternLearningAnalytics,
  getRecentlyLearnedPatterns,
  getLearningPotentialInsights
};