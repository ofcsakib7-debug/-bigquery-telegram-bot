const path = require('path');

console.log('=== Unified System Integration Test ===');

// Get the project root directory
const projectRoot = path.join(__dirname, '..');

// Test modules with absolute paths
try {
  const payment = require(path.join(projectRoot, 'functions/payment'));
  if (typeof payment.validateChallanNumbers === 'function') {
    console.log('✅ Payment module loaded and validateChallanNumbers available');
  } else {
    console.log('❌ Payment module loaded but validateChallanNumbers missing');
  }
} catch (error) {
  console.log('❌ Cannot import functions/payment:', error.message);
}

try {
  const snooze = require(path.join(projectRoot, 'functions/snooze'));
  if (typeof snooze.calculateSnoozeUntil === 'function') {
    console.log('✅ Snooze module loaded and calculateSnoozeUntil available');
  } else {
    console.log('❌ Snooze module loaded but calculateSnoozeUntil missing');
  }
} catch (error) {
  console.log('❌ Cannot import functions/snooze:', error.message);
}

try {
  const cache = require(path.join(projectRoot, 'bigquery/cache'));
  if (typeof cache.generateCacheKey === 'function') {
    console.log('✅ Cache module loaded and generateCacheKey available');
  } else {
    console.log('❌ Cache module loaded but generateCacheKey missing');
  }
} catch (error) {
  console.log('❌ Cannot import bigquery/cache:', error.message);
}

try {
  const searchValidation = require(path.join(projectRoot, 'functions/search_validation'));
  if (typeof searchValidation.validate_search_query === 'function') {
    console.log('✅ Search validation module loaded and validate_search_query available');
  } else {
    console.log('❌ Search validation module loaded but validate_search_query missing');
  }
} catch (error) {
  console.log('❌ Cannot import functions/search_validation:', error.message);
}

try {
  const errorDetection = require(path.join(projectRoot, 'functions/error_detection'));
  if (typeof errorDetection.detectLogicalError === 'function') {
    console.log('✅ Error detection module loaded and detectLogicalError available');
  } else {
    console.log('❌ Error detection module loaded but detectLogicalError missing');
  }
} catch (error) {
  console.log('❌ Cannot import functions/error_detection:', error.message);
}

try {
  const adminManagement = require(path.join(projectRoot, 'functions/admin_management'));
  console.log('✅ Admin management module loaded');
} catch (error) {
  console.log('❌ Cannot import functions/admin_management:', error.message);
}

try {
  const contextualActions = require(path.join(projectRoot, 'functions/contextual_actions'));
  console.log('✅ Contextual actions module loaded');
} catch (error) {
  console.log('❌ Cannot import functions/contextual_actions:', error.message);
}

try {
  const multiInputProcessor = require(path.join(projectRoot, 'functions/multi_input_processor'));
  console.log('✅ Multi input processor module loaded');
} catch (error) {
  console.log('❌ Cannot import functions/multi_input_processor:', error.message);
}

try {
  const departmentValidations = require(path.join(projectRoot, 'functions/department_validations'));
  console.log('✅ Department validations module loaded');
} catch (error) {
  console.log('❌ Cannot import functions/department_validations:', error.message);
}

try {
  const quotaSaving = require(path.join(projectRoot, 'bigquery/quota_saving'));
  console.log('✅ Quota saving module loaded');
} catch (error) {
  console.log('❌ Cannot import bigquery/quota_saving:', error.message);
}

try {
  const scheduledQueries = require(path.join(projectRoot, 'bigquery/scheduled_queries'));
  console.log('✅ Scheduled queries module loaded');
} catch (error) {
  console.log('❌ Cannot import bigquery/scheduled_queries:', error.message);
}

try {
  const design8Schemas = require(path.join(projectRoot, 'bigquery/design8_schemas'));
  console.log('✅ Design 8 schemas module loaded');
} catch (error) {
  console.log('❌ Cannot import bigquery/design8_schemas:', error.message);
}

try {
  const design9Schemas = require(path.join(projectRoot, 'bigquery/design9_schemas'));
  console.log('✅ Design 9 schemas module loaded');
} catch (error) {
  console.log('❌ Cannot import bigquery/design9_schemas:', error.message);
}

try {
  const design10Schemas = require(path.join(projectRoot, 'bigquery/design10_schemas'));
  console.log('✅ Design 10 schemas module loaded');
} catch (error) {
  console.log('❌ Cannot import bigquery/design10_schemas:', error.message);
}

try {
  const design11Schemas = require(path.join(projectRoot, 'bigquery/design11_schemas'));
  console.log('✅ Design 11 schemas module loaded');
} catch (error) {
  console.log('❌ Cannot import bigquery/design11_schemas:', error.message);
}

try {
  const design12Schemas = require(path.join(projectRoot, 'bigquery/design12_schemas'));
  console.log('✅ Design 12 schemas module loaded');
} catch (error) {
  console.log('❌ Cannot import bigquery/design12_schemas:', error.message);
}

console.log('=== Unified System Test Summary ===');
// Add your test result summary logic here