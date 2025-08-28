// dependency_test.js
console.log('Testing dependencies...');

// Test core Node.js modules first
try {
  const fs = require('fs');
  console.log('✅ fs module loaded');
} catch (error) {
  console.log('❌ fs module failed:', error.message);
}

// Test Google Cloud dependencies
try {
  const { Firestore } = require('@google-cloud/firestore');
  console.log('✅ @google-cloud/firestore loaded');
} catch (error) {
  console.log('❌ @google-cloud/firestore failed:', error.message);
}

try {
  const { insertRecord } = require('./bigquery/microbatching');
  console.log('✅ microbatching module loaded');
} catch (error) {
  console.log('❌ microbatching module failed:', error.message);
}

console.log('Dependency test complete.');