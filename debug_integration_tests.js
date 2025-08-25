// Debug script to see what extractRemarks actually returns for specific test cases
const { extractRemarks } = require('./functions/remarks');

// Test cases from integration tests
const testCases = [
  'Test input (Outer remark (nested) text) more text',
  'Test input (Incomplete remark more text (Complete remark)'
];

testCases.forEach((input, index) => {
  console.log(`\n=== Test Case ${index + 1} ===`);
  console.log('Input:', input);
  
  const result = extractRemarks(input);
  console.log('Result:');
  console.log('  originalText:', `"${result.originalText}"`);
  console.log('  cleanedText:', `"${result.cleanedText}"`);
  console.log('  hasRemarks:', result.hasRemarks);
  console.log('  remarks:', result.remarks);
});