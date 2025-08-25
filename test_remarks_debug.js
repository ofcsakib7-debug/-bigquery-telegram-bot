// Simple test script to check what extractRemarks actually returns
const fs = require('fs');
const path = require('path');

// Read the remarks.js file and extract the extractRemarks function
const remarksFile = fs.readFileSync(path.join(__dirname, 'functions', 'remarks.js'), 'utf8');

// Extract just the function body
const functionMatch = remarksFile.match(/function extractRemarks\(input\) \{([\s\S]*?)\n\}/);
if (!functionMatch) {
  console.log('Could not extract function');
  process.exit(1);
}

// Create the function dynamically
const extractRemarks = new Function('input', `
  ${functionMatch[1]}
  return extractRemarks(input);
`);

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