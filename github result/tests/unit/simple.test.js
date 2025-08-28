// Simple test to verify the setup
const { validateChallanNumbers } = require('../../functions/payment');

test('validateChallanNumbers should work correctly', () => {
  const result = validateChallanNumbers('CH-2023-1001');
  expect(result.valid).toBe(true);
});