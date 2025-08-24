// Very simple test to check Node.js environment
console.log('=== Node.js Environment Test ===');

// Test basic JavaScript functionality
console.log('\n1. Basic JavaScript Tests...');
console.log('  ✓ String concatenation:', 'test' + 'ing');
console.log('  ✓ Math operations:', 2 + 3);
console.log('  ✓ Date creation:', new Date().toISOString());

// Test object creation
console.log('\n2. Object Creation Tests...');
const testObj = {
  name: 'test',
  value: 42,
  nested: {
    active: true
  }
};
console.log('  ✓ Object creation:', testObj.name);
console.log('  ✓ Nested property:', testObj.nested.active);

// Test array operations
console.log('\n3. Array Operations Tests...');
const testArray = [1, 2, 3, 4, 5];
console.log('  ✓ Array length:', testArray.length);
console.log('  ✓ Array mapping:', testArray.map(x => x * 2).join(','));

// Test function creation
console.log('\n4. Function Tests...');
function testFunction(a, b) {
  return a + b;
}
console.log('  ✓ Function execution:', testFunction(3, 4));

// Test regex
console.log('\n5. Regex Tests...');
const regex = /^(CH|INV)-\d{4}-\d{3,5}$/;
console.log('  ✓ Valid pattern test:', regex.test('CH-2023-1001'));
console.log('  ✓ Invalid pattern test:', regex.test('INVALID'));

console.log('\n=== Environment Test Complete ===');
console.log('Node.js environment is working correctly.');