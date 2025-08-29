// Global test setup and cleanup
const { BigQuery } = require('@google-cloud/bigquery');

// Global setup before all tests
beforeAll(() => {
  console.log('DEBUG: Setting up test environment');
});

// Global cleanup after all tests
afterAll(async () => {
  console.log('DEBUG: Cleaning up after tests');
  
  // Close any open BigQuery connections
  try {
    const bigquery = new BigQuery();
    await bigquery.close();
    console.log('DEBUG: BigQuery connections closed');
  } catch (error) {
    console.error('DEBUG: Error closing BigQuery connections:', error.message);
  }
  
  // Add any other cleanup here
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
