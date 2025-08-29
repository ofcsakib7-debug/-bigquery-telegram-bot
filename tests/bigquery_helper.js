// BigQuery test helper for cleanup

// Cleanup function for BigQuery tests
async function cleanupBigQuery() {
  console.log('DEBUG: BigQuery cleanup called');
  // Note: BigQuery client doesn't have a close method in the version we're using
  // The main cleanup is handled by clearing timers in setup.js
}

module.exports = { cleanupBigQuery };
