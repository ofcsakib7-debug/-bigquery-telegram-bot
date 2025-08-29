// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Token Budget Management
// Phase: 1
// Component: aggressive_compression_protocol
// Status: IN_PROGRESS
// Last Modified: 2025-08-29 10:30 UTC
// Next Step: Implement auto-save and recovery protocols
// =============================================

/**
 * Aggressive Compression Protocol
 * Implements extreme memory optimization when token usage is critical
 */

const { Firestore } = require('@google-cloud/firestore');
const { BigQuery } = require('@google-cloud/bigquery');
const { getFromCache, storeInCache, generateCacheKey } = require('./bigquery/cache');
const { withErrorHandling } = require('./functions/error_handling');

// Lazy initialization of clients
let firestore = null;
let bigquery = null;

function getFirestore() {
  if (!firestore) {
    firestore = new Firestore();
  }
  return firestore;
}

function getBigQuery() {
  if (!bigquery) {
    bigquery = new BigQuery();
  }
  return bigquery;
}

/**
 * Apply aggressive compression when token usage reaches critical levels
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.applyAggressiveCompression = async (req, res) => {
  try {
    console.log('🌪️ Applying aggressive compression...');
    
    const firestoreClient = getFirestore();
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // 1. Summarize all accomplishments (retain only essential information)
    await summarizeAccomplishments(firestoreClient, datasetId);
    
    // 2. Discard ALL implementation details immediately
    await discardAllImplementationDetails(firestoreClient, datasetId);
    
    // 3. Retain only interfaces and major architectural decisions
    await preserveOnlyInterfacesAndArchitecture(firestoreClient, datasetId);
    
    // 4. Apply extreme data compression
    await applyExtremeDataCompression(bigqueryClient, datasetId);
    
    // 5. Optimize cache usage
    await optimizeCacheUsage(firestoreClient, bigqueryClient, datasetId);
    
    // 6. Clean up temporary data
    await cleanupTemporaryData(firestoreClient, bigqueryClient, datasetId);
    
    console.log('🌪️ Aggressive compression applied successfully');
    
    res.status(200).send('Aggressive compression applied successfully');
  } catch (error) {
    console.error('Error applying aggressive compression:', error);
    res.status(500).send('Error applying aggressive compression');
  }
};

/**
 * Summarize all accomplishments
 * @param {Object} firestoreClient - Firestore client
 * @param {string} datasetId - Dataset ID
 */
async function summarizeAccomplishments(firestoreClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log('📝 Summarizing accomplishments...');
      
      // Check cache first
      const cacheKey = generateCacheKey('compression', 'accomplishments_summary', 'current');
      const cachedSummary = await getFromCache(cacheKey);
      
      if (cachedSummary) {
        console.log('Using cached accomplishments summary');
        return;
      }
      
      // Get recent accomplishments from Firestore
      const accomplishmentsSnapshot = await firestoreClient
        .collection('development_accomplishments')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
      
      const accomplishments = [];
      accomplishmentsSnapshot.forEach(doc => {
        const data = doc.data();
        accomplishments.push({
          id: doc.id,
          title: data.title,
          component: data.component,
          phase: data.phase,
          design: data.design,
          timestamp: data.timestamp
        });
      });
      
      // Create summary
      const summary = {
        total_accomplishments: accomplishments.length,
        designs_completed: [...new Set(accomplishments.map(a => a.design))].length,
        phases_completed: [...new Set(accomplishments.map(a => a.phase))].length,
        components_completed: [...new Set(accomplishments.map(a => a.component))].length,
        latest_accomplishment: accomplishments.length > 0 ? accomplishments[0].title : null,
        timestamp: new Date().toISOString()
      };
      
      // Store summary in Firestore
      await firestoreClient.collection('accomplishments_summary').doc('current').set(summary);
      
      console.log('Accomplishments summarized:', JSON.stringify(summary, null, 2));
      
      // Cache for 4 hours
      await storeInCache(cacheKey, summary, 4);
      
    } catch (error) {
      console.error('Error summarizing accomplishments:', error);
    }
  })();
}

/**
 * Discard all implementation details
 * @param {Object} firestoreClient - Firestore client
 * @param {string} datasetId - Dataset ID
 */
async function discardAllImplementationDetails(firestoreClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log('🗑️ Discarding all implementation details...');
      
      // Check cache first
      const cacheKey = generateCacheKey('compression', 'implementation_discard', 'current');
      const cachedDiscard = await getFromCache(cacheKey);
      
      if (cachedDiscard) {
        console.log('Implementation details already discarded');
        return;
      }
      
      // Delete implementation details collections
      const implementationCollections = [
        'implementation_details',
        'code_snippets',
        'function_implementations',
        'schema_definitions',
        'test_implementations'
      ];
      
      for (const collectionName of implementationCollections) {
        try {
          const collectionRef = firestoreClient.collection(collectionName);
          const snapshot = await collectionRef.limit(100).get();
          
          const batch = firestoreClient.batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          
          if (snapshot.size > 0) {
            await batch.commit();
            console.log(`Deleted ${snapshot.size} documents from ${collectionName}`);
          }
        } catch (collectionError) {
          console.error(`Error deleting from ${collectionName}:`, collectionError);
        }
      }
      
      console.log('All implementation details discarded');
      
      // Cache for 6 hours
      await storeInCache(cacheKey, { status: 'discarded' }, 6);
      
    } catch (error) {
      console.error('Error discarding implementation details:', error);
    }
  })();
}

/**
 * Preserve only interfaces and major architectural decisions
 * @param {Object} firestoreClient - Firestore client
 * @param {string} datasetId - Dataset ID
 */
async function preserveOnlyInterfacesAndArchitecture(firestoreClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log('🏛️ Preserving only interfaces and architecture...');
      
      // Check cache first
      const cacheKey = generateCacheKey('compression', 'interfaces_architecture_preserve', 'current');
      const cachedPreserve = await getFromCache(cacheKey);
      
      if (cachedPreserve) {
        console.log('Interfaces and architecture already preserved');
        return;
      }
      
      // Preserve key architectural information
      const architectureInfo = {
        core_principles: [
          '"Don\'t Type, Tap" philosophy',
          'Quota Zero Impact requirement',
          'Partitioning is Non-Negotiable',
          'Cluster for Performance',
          'Use Appropriate Data Types',
          'Nest and Repeat for Efficiency',
          'Never query raw_events or journal tables in user-facing requests',
          'Check the master_cache first for pre-computed results',
          'Use BQML for prediction instead of complex business logic',
          'LOOP PREVENTION: Never reprocess previously completed work'
        ],
        interfaces: [
          'Telegram Bot API integration',
          'Cloud Functions webhook interface',
          'Pub/Sub message processing',
          'BigQuery table schemas',
          'Firestore user state management',
          'KMS encryption interface'
        ],
        major_components: [
          'Payment recording workflow',
          'Snooze functionality',
          'Master cache system',
          'Microbatching for BigQuery writes',
          'Security and encryption',
          'Error handling and retry logic'
        ],
        preserved_at: new Date().toISOString()
      };
      
      // Store in Firestore
      await firestoreClient.collection('preserved_architecture').doc('current').set(architectureInfo);
      
      console.log('Interfaces and architecture preserved');
      
      // Cache for 12 hours
      await storeInCache(cacheKey, architectureInfo, 12);
      
    } catch (error) {
      console.error('Error preserving interfaces and architecture:', error);
    }
  })();
}

/**
 * Apply extreme data compression
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function applyExtremeDataCompression(bigqueryClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log('🧨 Applying extreme data compression...');
      
      // Check cache first
      const cacheKey = generateCacheKey('compression', 'extreme_data_compression', 'current');
      const cachedCompression = await getFromCache(cacheKey);
      
      if (cachedCompression) {
        console.log('Extreme data compression already applied');
        return;
      }
      
      // Compress cache tables by removing old entries
      const cacheTables = [
        'master_cache',
        'ui_interaction_patterns',
        'search_intention_patterns'
      ];
      
      for (const tableName of cacheTables) {
        try {
          const query = `
            DELETE FROM \`${datasetId}.${tableName}\`
            WHERE expires_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
          `;
          
          const options = {
            query: query,
            location: 'us-central1'
          };
          
          await bigqueryClient.query(options);
          
          console.log(`Compressed ${tableName} by removing expired entries`);
        } catch (tableError) {
          console.error(`Error compressing ${tableName}:`, tableError);
        }
      }
      
      console.log('Extreme data compression applied');
      
      // Cache for 3 hours
      await storeInCache(cacheKey, { status: 'compressed' }, 3);
      
    } catch (error) {
      console.error('Error applying extreme data compression:', error);
    }
  })();
}

/**
 * Optimize cache usage
 * @param {Object} firestoreClient - Firestore client
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function optimizeCacheUsage(firestoreClient, bigqueryClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log('⚡ Optimizing cache usage...');
      
      // Check cache first
      const cacheKey = generateCacheKey('compression', 'cache_optimization', 'current');
      const cachedOptimization = await getFromCache(cacheKey);
      
      if (cachedOptimization) {
        console.log('Cache usage already optimized');
        return;
      }
      
      // Optimize Firestore cache documents
      try {
        const cacheSnapshot = await firestoreClient.collection('master_cache').limit(1000).get();
        
        const batch = firestoreClient.batch();
        let batchSize = 0;
        
        cacheSnapshot.forEach(doc => {
          const data = doc.data();
          
          // Remove old cache entries (older than 30 minutes)
          if (data.expires_at && new Date(data.expires_at) < new Date(Date.now() - 30 * 60 * 1000)) {
            batch.delete(doc.ref);
            batchSize++;
            
            // Commit in batches of 500
            if (batchSize >= 500) {
              await batch.commit();
              console.log(`Deleted ${batchSize} old cache entries`);
              batchSize = 0;
              batch = firestoreClient.batch();
            }
          }
        });
        
        // Commit remaining batch
        if (batchSize > 0) {
          await batch.commit();
          console.log(`Deleted ${batchSize} old cache entries`);
        }
      } catch (firestoreError) {
        console.error('Error optimizing Firestore cache:', firestoreError);
      }
      
      // Optimize BigQuery cache tables
      try {
        const query = `
          DELETE FROM \`${datasetId}.master_cache\`
          WHERE expires_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 MINUTE)
        `;
        
        const options = {
          query: query,
          location: 'us-central1'
        };
        
        await bigqueryClient.query(options);
        
        console.log('Optimized BigQuery cache by removing old entries');
      } catch (bigqueryError) {
        console.error('Error optimizing BigQuery cache:', bigqueryError);
      }
      
      console.log('Cache usage optimized');
      
      // Cache for 2 hours
      await storeInCache(cacheKey, { status: 'optimized' }, 2);
      
    } catch (error) {
      console.error('Error optimizing cache usage:', error);
    }
  })();
}

/**
 * Clean up temporary data
 * @param {Object} firestoreClient - Firestore client
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function cleanupTemporaryData(firestoreClient, bigqueryClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log('🧹 Cleaning up temporary data...');
      
      // Check cache first
      const cacheKey = generateCacheKey('compression', 'temporary_data_cleanup', 'current');
      const cachedCleanup = await getFromCache(cacheKey);
      
      if (cachedCleanup) {
        console.log('Temporary data already cleaned up');
        return;
      }
      
      // Clean up temporary Firestore collections
      const tempCollections = [
        'temp_processing_data',
        'debug_logs',
        'test_data',
        'development_snapshots'
      ];
      
      for (const collectionName of tempCollections) {
        try {
          const collectionRef = firestoreClient.collection(collectionName);
          const snapshot = await collectionRef.limit(100).get();
          
          const batch = firestoreClient.batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          
          if (snapshot.size > 0) {
            await batch.commit();
            console.log(`Cleaned up ${snapshot.size} documents from ${collectionName}`);
          }
        } catch (collectionError) {
          console.error(`Error cleaning up ${collectionName}:`, collectionError);
        }
      }
      
      // Clean up temporary BigQuery tables
      try {
        const query = `
          SELECT table_name
          FROM \`${datasetId}.INFORMATION_SCHEMA.TABLES\`
          WHERE table_name LIKE 'temp_%'
          AND DATE(creation_time) < DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
        `;
        
        const options = {
          query: query,
          location: 'us-central1'
        };
        
        const [rows] = await bigqueryClient.query(options);
        
        for (const row of rows) {
          try {
            const dropQuery = `DROP TABLE \`${datasetId}.${row.table_name}\``;
            const dropOptions = {
              query: dropQuery,
              location: 'us-central1'
            };
            
            await bigqueryClient.query(dropOptions);
            console.log(`Dropped temporary table: ${row.table_name}`);
          } catch (dropError) {
            console.error(`Error dropping temporary table ${row.table_name}:`, dropError);
          }
        }
      } catch (schemaError) {
        console.error('Error cleaning up temporary BigQuery tables:', schemaError);
      }
      
      console.log('Temporary data cleaned up');
      
      // Cache for 8 hours
      await storeInCache(cacheKey, { status: 'cleaned' }, 8);
      
    } catch (error) {
      console.error('Error cleaning up temporary data:', error);
    }
  })();
}

// Export functions
module.exports = {
  applyAggressiveCompression,
  summarizeAccomplishments,
  discardAllImplementationDetails,
  preserveOnlyInterfacesAndArchitecture,
  applyExtremeDataCompression,
  optimizeCacheUsage,
  cleanupTemporaryData
};