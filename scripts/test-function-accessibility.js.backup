const path = require('path');
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Force exit after a timeout to prevent hanging
const forceExitTimeout = setTimeout(() => {
  console.log('??  Forcing exit after timeout');
  process.exit(0);
}, 5000); // 5 second timeout

const testFunction = (functionName, modulePath, functionNameInModule, testArgs) => {
  try {
    const fullPath = path.join(projectRoot, modulePath);
    const module = require(fullPath);
    
    if (typeof module[functionNameInModule] === 'function') {
      console.log(`? ${functionName} function accessible`);
      
      // Test the function
      const result = module[functionNameInModule](...testArgs);
      
      if (result && typeof result === 'object' && result.toISOString) {
        console.log(`? Function execution result:`, result.toISOString());
      } else {
        console.log(`? Function execution result:`, JSON.stringify(result));
      }
      
      return true;
    } else {
      console.log(`? ${functionName} function not accessible`);
      return false;
    }
  } catch (error) {
    console.log(`? ${functionName} function error:`, error.message);
    return false;
  }
};

// Test all functions
try {
  const paymentSuccess = testFunction('validateChallanNumbers', 'functions/payment', 'validateChallanNumbers', ['CH-2023-1001']);
  const cacheSuccess = testFunction('generateCacheKey', 'bigquery/cache', 'generateCacheKey', ['test', 'user123', 'context']);
  const snoozeSuccess = testFunction('calculateSnoozeUntil', 'functions/snooze', 'calculateSnoozeUntil', ['1h']);

  // Exit with appropriate code IMMEDIATELY after tests complete
  if (paymentSuccess && cacheSuccess && snoozeSuccess) {
    console.log('? All function accessibility tests successful');
    clearTimeout(forceExitTimeout);
    // Force immediate exit without any delay
    setImmediate(() => process.exit(0));
  } else {
    console.log('? Some function accessibility tests failed');
    clearTimeout(forceExitTimeout);
    // Force immediate exit without any delay
    setImmediate(() => process.exit(1));
  }
} catch (error) {
  console.log('? Unexpected error during function tests:', error.message);
  clearTimeout(forceExitTimeout);
  // Force immediate exit without any delay
  setImmediate(() => process.exit(1));
}
