// Simple module import test
console.log('Testing module imports...');

try {
  const payment = require('./functions/payment');
  console.log('✅ Payment module imported');
} catch (error) {
  console.log('❌ Payment module error:', error.message);
}

try {
  const snooze = require('./functions/snooze');
  console.log('✅ Snooze module imported');
} catch (error) {
  console.log('❌ Snooze module error:', error.message);
}

try {
  const cache = require('./bigquery/cache');
  console.log('✅ Cache module imported');
} catch (error) {
  console.log('❌ Cache module error:', error.message);
}

console.log('Import test complete');