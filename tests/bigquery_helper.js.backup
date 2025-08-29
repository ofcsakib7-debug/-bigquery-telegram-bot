// BigQuery test helper for cleanup
const { BigQuery } = require('@google-cloud/bigquery');

// Cleanup function for BigQuery tests
async function cleanupBigQuery() {
  try {
    const bigquery = new BigQuery();
    await bigquery.close();
    console.log('DEBUG: BigQuery connections closed in test cleanup');
  } catch (error) {
    console.error('DEBUG: Error in BigQuery cleanup:', error.message);
  }
}

module.exports = { cleanupBigQuery };
