// simple_test.js
console.log('=== Simple Test for Design 6 & Design 7 ===\n');

// Test Design 6 (Context-Aware Search Validation)
console.log('1. Testing Design 6: Context-Aware Search Validation\n');

try {
  const { validate_search_query } = require('./functions/search_validation');
  console.log('✅ Search Validation module imported successfully');
  
  // Test valid query
  const result1 = validate_search_query('user123', 'e cm');
  console.log('  Valid query test:', result1.status);
  
  // Test invalid query
  const result2 = validate_search_query('user123', 'invalid@query');
  console.log('  Invalid query test:', result2.status);
  
  console.log('✅ Design 6 tests completed successfully\n');
} catch (error) {
  console.log('❌ Design 6 test failed:', error.message, '\n');
}

// Test Design 7 (Logical Error Detection)
console.log('2. Testing Design 7: Logical Error Detection\n');

try {
  const { detectLogicalError } = require('./functions/error_detection');
  console.log('✅ Error Detection module imported successfully');
  
  // Test valid finance transaction
  const result1 = detectLogicalError({
    department: 'FINANCE',
    payment_date: new Date('2023-01-15'),
    transaction_date: new Date('2023-01-10'),
    amount: 1000
  });
  console.log('  Valid finance transaction test:', result1.hasError ? 'ERROR' : 'NO ERROR');
  
  // Test invalid finance transaction
  const result2 = detectLogicalError({
    department: 'FINANCE',
    payment_date: new Date('2023-01-05'),
    transaction_date: new Date('2023-01-10'),
    amount: 1000
  });
  console.log('  Invalid finance transaction test:', result2.hasError ? 'ERROR' : 'NO ERROR');
  
  console.log('✅ Design 7 tests completed successfully\n');
} catch (error) {
  console.log('❌ Design 7 test failed:', error.message, '\n');
}

console.log('=== Simple Test Complete ===');