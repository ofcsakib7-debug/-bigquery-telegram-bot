// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 1
// Component: search_pattern_learning
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 14:45 UTC
// Next Step: Implement search system documentation
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');
const { validateInputPattern } = require('./security');

// Lazy initialization of BigQuery client
let bigquery = null;

function getBigQuery() {
  if (!bigquery) {
    bigquery = new BigQuery();
  }
  return bigquery;
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
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Discover new patterns from recent interactions
    const newPatterns = await discoverNewPatterns(bigqueryClient, datasetId);
    
    // Validate discovered patterns
    const validatedPatterns = await validateNewPatterns(newPatterns);
    
    // Store validated patterns
    await storeNewPatterns(validatedPatterns, bigqueryClient, datasetId);
    
    // Update pattern weights based on performance
    await updatePatternWeights(bigqueryClient, datasetId);
    
    // Generate learning report
    const learningReport = {
      timestamp: new Date().toISOString(),
      patterns_discovered: validatedPatterns.length,
      patterns_stored: validatedPatterns.filter(p => p.stored).length,
      learning_outcome: 'SUCCESS'
    };
    
    console.log('Search pattern learning completed');
    
    res.status(200).json(learningReport);
  } catch (error) {
    console.error('Error in search pattern learning:', error);
    res.status(500).json({ error: 'Error in search pattern learning' });
  }
};

/**
 * Discover new search patterns from user interactions
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
          COUNT(*) as usage_count
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
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
        ri.interpreted_query,
        ri.query_type,
        AVG(ri.confidence_score) as avg_confidence_score,
        AVG(IF(ri.successful_completion, 1.0, 0.0)) as success_rate,
        SUM(ri.usage_count) as total_usage,
        COUNT(*) as distinct_users
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
      LIMIT 50
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const discoveredPatterns = rows.map(row => ({
      department_id: row.department_id,
      pattern: row.pattern,
      expanded_query: row.interpreted_query,
      query_type: row.query_type,
      avg_confidence_score: parseFloat(row.avg_confidence_score),
      success_rate: parseFloat(row.success_rate),
      usage_count: parseInt(row.total_usage),
      distinct_users: parseInt(row.distinct_users),
      priority_score: calculateInitialPriorityScore(
        parseFloat(row.avg_confidence_score),
        parseFloat(row.success_rate),
        parseInt(row.total_usage),
        parseInt(row.distinct_users)
      ),
      discovered_at: new Date().toISOString()
    }));
    
    // Cache for 1 hour
    await storeInCache(cacheKey, discoveredPatterns, 1);
    
    return discoveredPatterns;
  } catch (error) {
    console.error('Error discovering new patterns:', error);
    return [];
  }
}

/**
 * Calculate initial priority score for a pattern
 * @param {number} avgConfidence - Average confidence score
 * @param {number} successRate - Success rate
 * @param {number} usageCount - Usage count
 * @param {number} distinctUsers - Number of distinct users
 * @returns {number} Priority score (0.0-1.0)
 */
function calculateInitialPriorityScore(avgConfidence, successRate, usageCount, distinctUsers) {
  try {
    // Weighted calculation:
    // 40% confidence score
    // 30% success rate
    // 20% usage count (normalized)
    // 10% distinct users (normalized)
    
    // Normalize usage count (assume max 100 for normalization)
    const normalizedUsage = Math.min(usageCount / 100, 1.0);
    
    // Normalize distinct users (assume max 20 for normalization)
    const normalizedUsers = Math.min(distinctUsers / 20, 1.0);
    
    const priorityScore = 
      (avgConfidence * 0.4) +
      (successRate * 0.3) +
      (normalizedUsage * 0.2) +
      (normalizedUsers * 0.1);
    
    // Ensure score is between 0.0 and 1.0
    return Math.max(0.0, Math.min(1.0, priorityScore));
  } catch (error) {
    console.error('Error calculating initial priority score:', error);
    return 0.5; // Default middle priority
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
        
        // Validate distinct users
        if (pattern.distinct_users < 0) {
          console.log(`Skipping pattern with negative distinct users: ${pattern.distinct_users}`);
          continue;
        }
        
        // Validate priority score
        if (pattern.priority_score < 0.0 || pattern.priority_score > 1.0) {
          console.log(`Skipping pattern with invalid priority score: ${pattern.priority_score}`);
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
 * Store validated patterns in the database
 * @param {Array} patterns - Array of validated patterns
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function storeNewPatterns(patterns, bigqueryClient, datasetId) {
  try {
    if (patterns.length === 0) {
      console.log('No patterns to store');
      return;
    }
    
    console.log(`Storing ${patterns.length} new patterns...`);
    
    // Generate pattern IDs and prepare for insertion
    const patternsToInsert = patterns.map(pattern => {
      const patternId = `PATTERN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      
      return {
        pattern_id: patternId,
        department_id: pattern.department_id,
        pattern: pattern.pattern,
        expanded_query: pattern.expanded_query,
        query_type: pattern.query_type,
        priority_score: pattern.priority_score,
        usage_count: 0, // Start with 0, let actual usage increment it
        last_used: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    // Insert patterns in batches
    const batchSize = 10;
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
        
        // Mark patterns as stored
        batch.forEach(pattern => {
          const originalPattern = patterns.find(p => p.pattern === pattern.pattern);
          if (originalPattern) {
            originalPattern.stored = true;
          }
        });
        
        console.log(`Stored batch of ${batch.length} patterns`);
        
      } catch (batchError) {
        console.error(`Error storing batch of patterns:`, batchError);
        // Continue with next batch
      }
    }
    
    console.log(`Successfully stored ${patternsToInsert.filter(p => p.stored).length} patterns`);
  } catch (error) {
    console.error('Error storing new patterns:', error);
  }
}

/**
 * Update pattern weights based on performance
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function updatePatternWeights(bigqueryClient, datasetId) {
  try {
    console.log('Updating pattern weights based on performance...');
    
    // Update priority scores for existing patterns based on recent performance
    const query = `
      UPDATE \`${datasetId}.search_intention_patterns\` orig
      SET
        priority_score = (
          CASE
            WHEN perf.avg_confidence IS NOT NULL AND perf.success_rate IS NOT NULL THEN
              (orig.priority_score * 0.7) + 
              (perf.avg_confidence * 0.2) + 
              (perf.success_rate * 0.1)
            ELSE
              orig.priority_score
          END
        ),
        usage_count = COALESCE(perf.usage_count, orig.usage_count),
        last_used = COALESCE(perf.last_used, orig.last_used),
        updated_at = CURRENT_TIMESTAMP()
      FROM (
        SELECT
          department_id,
          input_text as pattern,
          AVG(confidence_score) as avg_confidence,
          AVG(IF(successful_completion, 1.0, 0.0)) as success_rate,
          COUNT(*) as usage_count,
          MAX(timestamp) as last_used
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY
          department_id, input_text
      ) perf
      WHERE
        orig.department_id = perf.department_id
        AND orig.pattern = perf.pattern
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await bigqueryClient.query(options);
    
    console.log('Pattern weights updated successfully');
  } catch (error) {
    console.error('Error updating pattern weights:', error);
  }
}

/**
 * Analyze search pattern effectiveness
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.analyzePatternEffectiveness = async (req, res) => {
  try {
    console.log('Analyzing search pattern effectiveness...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get pattern effectiveness metrics
    const effectivenessMetrics = await getPatternEffectivenessMetrics(bigqueryClient, datasetId);
    
    // Get pattern evolution data
    const patternEvolution = await getPatternEvolutionData(bigqueryClient, datasetId);
    
    // Get user adoption rates
    const adoptionRates = await getUserAdoptionRates(bigqueryClient, datasetId);
    
    // Generate analysis report
    const analysisReport = {
      timestamp: new Date().toISOString(),
      effectiveness_metrics: effectivenessMetrics,
      pattern_evolution: patternEvolution,
      adoption_rates: adoptionRates
    };
    
    console.log('Search pattern effectiveness analysis completed');
    
    res.status(200).json(analysisReport);
  } catch (error) {
    console.error('Error analyzing pattern effectiveness:', error);
    res.status(500).json({ error: 'Error analyzing pattern effectiveness' });
  }
};

/**
 * Get pattern effectiveness metrics
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} Effectiveness metrics
 */
async function getPatternEffectivenessMetrics(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('analysis', 'effectiveness_metrics', 'current');
    const cachedMetrics = await getFromCache(cacheKey);
    
    if (cachedMetrics) {
      return cachedMetrics;
    }
    
    const query = `
      WITH pattern_performance AS (
        SELECT
          sip.department_id,
          sip.pattern,
          sip.priority_score,
          sip.usage_count,
          COUNT(si.input_text) as actual_usage,
          AVG(si.confidence_score) as avg_confidence,
          AVG(IF(si.successful_completion, 1.0, 0.0)) as success_rate,
          MAX(si.timestamp) as last_used
        FROM
          \`${datasetId}.search_intention_patterns\` sip
        LEFT JOIN
          \`${datasetId}.search_interactions\` si
        ON
          sip.department_id = si.department_id
          AND sip.pattern = si.input_text
          AND DATE(si.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY
          sip.department_id, sip.pattern, sip.priority_score, sip.usage_count
      )
      SELECT
        department_id,
        COUNT(*) as total_patterns,
        AVG(priority_score) as avg_priority_score,
        AVG(actual_usage) as avg_actual_usage,
        AVG(avg_confidence) as overall_avg_confidence,
        AVG(success_rate) as overall_success_rate,
        COUNTIF(actual_usage > 0) as actively_used_patterns,
        COUNTIF(actual_usage = 0) as unused_patterns
      FROM
        pattern_performance
      GROUP BY
        department_id
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const metrics = rows.map(row => ({
      department_id: row.department_id,
      total_patterns: parseInt(row.total_patterns),
      avg_priority_score: parseFloat(row.avg_priority_score),
      avg_actual_usage: parseFloat(row.avg_actual_usage),
      overall_avg_confidence: parseFloat(row.overall_avg_confidence),
      overall_success_rate: parseFloat(row.overall_success_rate),
      actively_used_patterns: parseInt(row.actively_used_patterns),
      unused_patterns: parseInt(row.unused_patterns),
      usage_percentage: row.total_patterns > 0 ? 
        (parseInt(row.actively_used_patterns) / parseInt(row.total_patterns) * 100) : 0
    }));
    
    // Cache for 2 hours
    await storeInCache(cacheKey, metrics, 2);
    
    return metrics;
  } catch (error) {
    console.error('Error getting pattern effectiveness metrics:', error);
    return [];
  }
}

/**
 * Get pattern evolution data
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Array} Pattern evolution data
 */
async function getPatternEvolutionData(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('analysis', 'pattern_evolution', 'current');
    const cachedEvolution = await getFromCache(cacheKey);
    
    if (cachedEvolution) {
      return cachedEvolution;
    }
    
    const query = `
      SELECT
        pattern,
        department_id,
        COUNT(*) as total_usage,
        DATE(MIN(timestamp)) as first_used,
        DATE(MAX(timestamp)) as last_used,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(confidence_score) as avg_confidence,
        AVG(IF(successful_completion, 1.0, 0.0)) as success_rate
      FROM
        \`${datasetId}.search_interactions\`
      WHERE
        DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
      GROUP BY
        pattern, department_id
      HAVING
        total_usage >= 5  -- At least 5 uses
      ORDER BY
        total_usage DESC
      LIMIT 100
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const evolutionData = rows.map(row => ({
      pattern: row.pattern,
      department_id: row.department_id,
      total_usage: parseInt(row.total_usage),
      first_used: row.first_used ? row.first_used.value : null,
      last_used: row.last_used ? row.last_used.value : null,
      unique_users: parseInt(row.unique_users),
      avg_confidence: parseFloat(row.avg_confidence),
      success_rate: parseFloat(row.success_rate),
      days_active: row.first_used && row.last_used ? 
        (new Date(row.last_used.value) - new Date(row.first_used.value)) / (1000 * 60 * 60 * 24) : 0
    }));
    
    // Cache for 4 hours
    await storeInCache(cacheKey, evolutionData, 4);
    
    return evolutionData;
  } catch (error) {
    console.error('Error getting pattern evolution data:', error);
    return [];
  }
}

/**
 * Get user adoption rates
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} Adoption rates
 */
async function getUserAdoptionRates(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('analysis', 'adoption_rates', 'current');
    const cachedRates = await getFromCache(cacheKey);
    
    if (cachedRates) {
      return cachedRates;
    }
    
    const query = `
      WITH user_search_stats AS (
        SELECT
          user_id,
          department_id,
          COUNT(*) as total_searches,
          COUNT(DISTINCT input_text) as unique_patterns_used,
          COUNTIF(successful_completion = TRUE) as successful_searches,
          AVG(confidence_score) as avg_confidence
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY
          user_id, department_id
      )
      SELECT
        department_id,
        COUNT(*) as total_users,
        COUNTIF(total_searches >= 10) as active_users,
        COUNTIF(total_searches >= 50) as power_users,
        AVG(total_searches) as avg_searches_per_user,
        AVG(unique_patterns_used) as avg_patterns_per_user,
        AVG(successful_searches) as avg_successful_searches,
        AVG(avg_confidence) as avg_user_confidence
      FROM
        user_search_stats
      GROUP BY
        department_id
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const adoptionRates = rows.map(row => ({
      department_id: row.department_id,
      total_users: parseInt(row.total_users),
      active_users: parseInt(row.active_users),
      power_users: parseInt(row.power_users),
      active_user_percentage: row.total_users > 0 ? 
        (parseInt(row.active_users) / parseInt(row.total_users) * 100) : 0,
      power_user_percentage: row.total_users > 0 ? 
        (parseInt(row.power_users) / parseInt(row.total_users) * 100) : 0,
      avg_searches_per_user: parseFloat(row.avg_searches_per_user),
      avg_patterns_per_user: parseFloat(row.avg_patterns_per_user),
      avg_successful_searches: parseFloat(row.avg_successful_searches),
      avg_user_confidence: parseFloat(row.avg_user_confidence)
    }));
    
    // Cache for 3 hours
    await storeInCache(cacheKey, adoptionRates, 3);
    
    return adoptionRates;
  } catch (error) {
    console.error('Error getting user adoption rates:', error);
    return [];
  }
}

/**
 * Generate pattern learning recommendations
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.generateLearningRecommendations = async (req, res) => {
  try {
    console.log('Generating pattern learning recommendations...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get recommendations for pattern improvement
    const improvementRecommendations = await getImprovementRecommendations(bigqueryClient, datasetId);
    
    // Get recommendations for new pattern discovery
    const discoveryRecommendations = await getDiscoveryRecommendations(bigqueryClient, datasetId);
    
    // Get recommendations for pattern pruning
    const pruningRecommendations = await getPruningRecommendations(bigqueryClient, datasetId);
    
    // Compile recommendations report
    const recommendationsReport = {
      timestamp: new Date().toISOString(),
      improvement_recommendations: improvementRecommendations,
      discovery_recommendations: discoveryRecommendations,
      pruning_recommendations: pruningRecommendations
    };
    
    console.log('Pattern learning recommendations generated');
    
    res.status(200).json(recommendationsReport);
  } catch (error) {
    console.error('Error generating learning recommendations:', error);
    res.status(500).json({ error: 'Error generating learning recommendations' });
  }
};

/**
 * Get recommendations for pattern improvement
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Array} Improvement recommendations
 */
async function getImprovementRecommendations(bigqueryClient, datasetId) {
  try {
    const query = `
      SELECT
        pattern,
        department_id,
        priority_score,
        usage_count,
        'Consider increasing priority score based on high usage' as recommendation
      FROM
        \`${datasetId}.search_intention_patterns\`
      WHERE
        usage_count > 50
        AND priority_score < 0.7
      UNION ALL
      SELECT
        pattern,
        department_id,
        priority_score,
        usage_count,
        'Pattern has low success rate, consider reviewing expanded query' as recommendation
      FROM
        \`${datasetId}.search_intention_patterns\`
      WHERE
        EXISTS (
          SELECT 1
          FROM \`${datasetId}.search_interactions\` si
          WHERE si.department_id = \`${datasetId}.search_intention_patterns\`.department_id
          AND si.input_text = \`${datasetId}.search_intention_patterns\`.pattern
          AND DATE(si.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
          AND si.successful_completion = FALSE
        )
        AND (
          SELECT AVG(IF(successful_completion, 1.0, 0.0))
          FROM \`${datasetId}.search_interactions\` si2
          WHERE si2.department_id = \`${datasetId}.search_intention_patterns\`.department_id
          AND si2.input_text = \`${datasetId}.search_intention_patterns\`.pattern
          AND DATE(si2.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        ) < 0.5
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    return rows.map(row => ({
      pattern: row.pattern,
      department_id: row.department_id,
      priority_score: parseFloat(row.priority_score),
      usage_count: parseInt(row.usage_count),
      recommendation: row.recommendation
    }));
  } catch (error) {
    console.error('Error getting improvement recommendations:', error);
    return [];
  }
}

/**
 * Get recommendations for new pattern discovery
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Array} Discovery recommendations
 */
async function getDiscoveryRecommendations(bigqueryClient, datasetId) {
  try {
    const query = `
      WITH potential_patterns AS (
        SELECT
          department_id,
          input_text as potential_pattern,
          interpreted_query,
          query_type,
          COUNT(*) as potential_usage,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(confidence_score) as avg_confidence
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
          AND input_text NOT IN (
            SELECT pattern
            FROM \`${datasetId}.search_intention_patterns\`
            WHERE department_id = \`${datasetId}.search_interactions\`.department_id
          )
        GROUP BY
          department_id, input_text, interpreted_query, query_type
        HAVING
          potential_usage >= 5
          AND unique_users >= 3
          AND avg_confidence >= 0.6
      )
      SELECT
        potential_pattern,
        department_id,
        interpreted_query,
        query_type,
        potential_usage,
        unique_users,
        avg_confidence,
        'Consider adding this pattern to improve search accuracy' as recommendation
      FROM
        potential_patterns
      ORDER BY
        potential_usage DESC,
        avg_confidence DESC
      LIMIT 20
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    return rows.map(row => ({
      pattern: row.potential_pattern,
      department_id: row.department_id,
      expanded_query: row.interpreted_query,
      query_type: row.query_type,
      potential_usage: parseInt(row.potential_usage),
      unique_users: parseInt(row.unique_users),
      avg_confidence: parseFloat(row.avg_confidence),
      recommendation: row.recommendation
    }));
  } catch (error) {
    console.error('Error getting discovery recommendations:', error);
    return [];
  }
}

/**
 * Get recommendations for pattern pruning
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Array} Pruning recommendations
 */
async function getPruningRecommendations(bigqueryClient, datasetId) {
  try {
    const query = `
      SELECT
        pattern,
        department_id,
        priority_score,
        usage_count,
        'Pattern has very low usage, consider removing' as recommendation
      FROM
        \`${datasetId}.search_intention_patterns\`
      WHERE
        usage_count < 3
        AND priority_score < 0.3
      UNION ALL
      SELECT
        pattern,
        department_id,
        priority_score,
        usage_count,
        'Pattern has not been used in over 90 days, consider archiving' as recommendation
      FROM
        \`${datasetId}.search_intention_patterns\`
      WHERE
        last_used < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
        OR last_used IS NULL
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    return rows.map(row => ({
      pattern: row.pattern,
      department_id: row.department_id,
      priority_score: parseFloat(row.priority_score),
      usage_count: parseInt(row.usage_count),
      recommendation: row.recommendation
    }));
  } catch (error) {
    console.error('Error getting pruning recommendations:', error);
    return [];
  }
}

// Export functions for use in other modules
module.exports = {
  // Learning functions would be exported here
};