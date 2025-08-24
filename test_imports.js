// Module import test
console.log('=== Module Import Test ===');

console.log('\n1. Testing payment module import...');
try {
  const paymentModule = require('./functions/payment');
  console.log('  ✓ Payment module imported successfully');
  console.log('  ✓ Available functions:', Object.keys(paymentModule).join(', '));
} catch (error) {
  console.log('  ✗ Error importing payment module:', error.message);
}

console.log('\n2. Testing snooze module import...');
try {
  const snoozeModule = require('./functions/snooze');
  console.log('  ✓ Snooze module imported successfully');
  console.log('  ✓ Available functions:', Object.keys(snoozeModule).join(', '));
} catch (error) {
  console.log('  ✗ Error importing snooze module:', error.message);
}

console.log('\n3. Testing cache module import...');
try {
  const cacheModule = require('./bigquery/cache');
  console.log('  ✓ Cache module imported successfully');
  console.log('  ✓ Available functions:', Object.keys(cacheModule).join(', '));
} catch (error) {
  console.log('  ✗ Error importing cache module:', error.message);
}

console.log('\n=== Module Import Test Complete ===');