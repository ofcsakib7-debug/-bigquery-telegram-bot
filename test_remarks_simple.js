// Simple test to verify extractRemarks function works correctly
const { extractRemarks } = require('./functions/remarks');

// Test cases
const testCases = [
  'CH-2023-1001 (Urgent delivery)',
  'CH-2023-1001 CH-2023-1002 (Special discount)',
  'CH-2023-1001 (Incomplete remark CH-2023-1002 (Complete remark)'
];

testCases.forEach((input, index) => {
  const result = extractRemarks(input);
  console.log(`\nTest Case ${index + 1}:`);
  console.log('Input:', input);
  console.log('Cleaned Text:', `"${result.cleanedText}"`);
  console.log('Remarks:', result.remarks);
  console.log('Has Remarks:', result.hasRemarks);
});