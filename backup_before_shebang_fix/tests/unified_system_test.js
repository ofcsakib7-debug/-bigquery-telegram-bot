const path = require('path');

console.log('=== Unified System Integration Test ===');

// Get the project root directory
const projectRoot = path.join(__dirname, '..');

// Track test results
const results = {
  passed: 0,
  failed: 0,
  details: []
};

// Helper function to test a module
function testModule(name, modulePath, requiredFunction = null) {
  try {
    // Clear any module cache to ensure fresh import
    delete require.cache[require.resolve(path.join(projectRoot, modulePath))];
    
    const module = require(path.join(projectRoot, modulePath));
    
    if (requiredFunction && typeof module[requiredFunction] !== 'function') {
      results.failed++;
      results.details.push(`? ${name} module loaded but ${requiredFunction} missing`);
      return false;
    }
    
    results.passed++;
    results.details.push(`? ${name} module loaded` + (requiredFunction ? ` and ${requiredFunction} available` : ''));
    return true;
  } catch (error) {
    results.failed++;
    results.details.push(`? Cannot import ${name}: ${error.message}`);
    return false;
  }
}

// Test all modules
testModule('Payment', 'functions/payment', 'validateChallanNumbers');
testModule('Snooze', 'functions/snooze', 'calculateSnoozeUntil');
testModule('Cache', 'bigquery/cache', 'generateCacheKey');
testModule('Search validation', 'functions/search_validation', 'validate_search_query');
testModule('Error detection', 'functions/error_detection', 'detectLogicalError');
testModule('Admin management', 'functions/admin_management');
testModule('Contextual actions', 'functions/contextual_actions');
testModule('Multi input processor', 'functions/multi_input_processor');
testModule('Department validations', 'functions/department_validations');
testModule('Quota saving', 'bigquery/quota_saving');
testModule('Scheduled queries', 'bigquery/scheduled_queries');
testModule('Design 8 schemas', 'bigquery/design8_schemas');
testModule('Design 9 schemas', 'bigquery/design9_schemas');
testModule('Design 10 schemas', 'bigquery/design10_schemas');
testModule('Design 11 schemas', 'bigquery/design11_schemas');
testModule('Design 12 schemas', 'bigquery/design12_schemas');

// Print all details
results.details.forEach(detail => console.log(detail));

// Print summary
console.log('\n=== Unified System Test Summary ===');
console.log(`Overall Status: ${results.failed === 0 ? '? ALL TESTS PASSED' : '? ISSUES FOUND'}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Total: ${results.passed + results.failed}`);

// Force exit after a short delay to ensure all output is flushed
setTimeout(() => {
  process.exit(results.failed === 0 ? 0 : 1);
}, 100);
