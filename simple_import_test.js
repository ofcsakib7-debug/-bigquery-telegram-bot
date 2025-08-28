// simple_import_test.js
console.log('Testing payment module import...');
try {
  const payment = require('./functions/payment');
  console.log('✅ Payment module imported successfully');
  console.log('Module keys:', Object.keys(payment).slice(0, 5)); // Show first 5 keys
} catch (error) {
  console.log('❌ Payment module import failed:', error.message);
}