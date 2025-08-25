// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 1
// Component: bigquery_microbatching
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 12:45 UTC
// Next Step: Implement batch flushing mechanism
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

// Batch storage
const batchStorage = new Map();

// Batch size limit (max 100 records per insert as per requirements)
const BATCH_SIZE_LIMIT = 100;

// Flush interval (in milliseconds)
const FLUSH_INTERVAL = 5000; // 5 seconds

/**
 * Add a record to the batch for a specific table
 * @param {string} datasetId - Dataset ID
 * @param {string} tableId - Table ID
 * @param {Object} record - Record to insert
 */
function addToBatch(datasetId, tableId, record) {
  try {
    const batchKey = `${datasetId}.${tableId}`;
    
    // Initialize batch if it doesn't exist
    if (!batchStorage.has(batchKey)) {
      batchStorage.set(batchKey, []);
    }
    
    const batch = batchStorage.get(batchKey);
    
    // Add record to batch
    batch.push(record);
    
    // If batch is full, flush it immediately
    if (batch.length >= BATCH_SIZE_LIMIT) {
      flushBatch(datasetId, tableId);
    }
    
  } catch (error) {
    console.error(`Error adding record to batch for ${tableId}:`, error);
  }
}

/**
 * Flush a specific batch to BigQuery
 * @param {string} datasetId - Dataset ID
 * @param {string} tableId - Table ID
 */
async function flushBatch(datasetId, tableId) {
  try {
    const batchKey = `${datasetId}.${tableId}`;
    
    // Check if batch exists
    if (!batchStorage.has(batchKey)) {
      return;
    }
    
    const batch = batchStorage.get(batchKey);
    
    // If batch is empty, nothing to do
    if (batch.length === 0) {
      return;
    }
    
    console.log(`Flushing batch for ${tableId} with ${batch.length} records`);
    
    // Insert records into BigQuery
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);
    
    await table.insert(batch);
    
    // Clear the batch
    batchStorage.set(batchKey, []);
    
    console.log(`Successfully flushed batch for ${tableId}`);
    
  } catch (error) {
    console.error(`Error flushing batch for ${tableId}:`, error);
    // In a production environment, we might want to send to a dead letter queue
  }
}

/**
 * Flush all batches to BigQuery
 */
async function flushAllBatches() {
  try {
    // Get all batch keys
    const batchKeys = Array.from(batchStorage.keys());
    
    // Flush each batch
    for (const batchKey of batchKeys) {
      const [datasetId, tableId] = batchKey.split('.');
      await flushBatch(datasetId, tableId);
    }
    
  } catch (error) {
    console.error('Error flushing all batches:', error);
  }
}

/**
 * Start the automatic batch flushing interval
 */
function startBatchFlushing() {
  setInterval(async () => {
    try {
      await flushAllBatches();
    } catch (error) {
      console.error('Error in batch flushing interval:', error);
    }
  }, FLUSH_INTERVAL);
}

/**
 * Insert a record into BigQuery with micro-batching
 * @param {string} datasetId - Dataset ID
 * @param {string} tableId - Table ID
 * @param {Object} record - Record to insert
 */
function insertRecord(datasetId, tableId, record) {
  try {
    // Add timestamp if not present
    if (!record.created_at) {
      record.created_at = new Date().toISOString();
    }
    
    if (!record.updated_at) {
      record.updated_at = new Date().toISOString();
    }
    
    // Add to batch
    addToBatch(datasetId, tableId, record);
    
  } catch (error) {
    console.error(`Error inserting record into ${tableId}:`, error);
  }
}

// Start automatic batch flushing
startBatchFlushing();

/**
 * Clear all batches (for testing purposes)
 */
function clearAllBatches() {
  batchStorage.clear();
}

// Export functions
module.exports = {
  insertRecord,
  flushBatch,
  flushAllBatches,
  clearAllBatches
};