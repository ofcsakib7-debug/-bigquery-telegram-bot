// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Testing
// Phase: 3
// Component: system_verification
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 20:00 UTC
// Next Step: Run verification tests
// =============================================

console.log('=== BigQuery Telegram Bot System Verification ===');

// ---------- Helper: safe loader ----------
function safeLoad(modulePath) {
  try {
    return require(modulePath);
  } catch (e) {
    console.error(`  ❌  Cannot load module "${modulePath}": ${e.message}`);
    return null;
  }
}

// ---------- Test 1 ----------
function testChallanValidation() {
  console.log('\n1. Testing Challan Number Validation...');
  const mod = safeLoad('./functions/payment');
  if (!mod || typeof mod.validateChallanNumbers !== 'function') {
    console.log('  Skipped (module not available)');
    return false;
  }

  const { validateChallanNumbers } = mod;
  const testCases = [
    { input: 'CH-2023-1001',          expected: true,  desc: 'Valid challan format' },
    { input: 'INV-2023-12345',        expected: true,  desc: 'Valid invoice format' },
    { input: 'CH-2023-1001 CH-2023-1002', expected: true,  desc: 'Multiple valid challans' },
    { input: '',                      expected: false, desc: 'Empty input' },
    { input: 'INVALID-FORMAT',        expected: false, desc: 'Invalid format' }
  ];

  let passed = 0;
  testCases.forEach((t, i) => {
    try {
      const result = validateChallanNumbers(t.input);
      const ok = result.valid === t.expected;
      console.log(`  ${i + 1}. ${t.desc}: ${ok ? 'PASS' : 'FAIL'}`);
      if (!ok) console.log(`     Expected ${t.expected}, got ${result.valid}`);
      else passed++;
    } catch (e) {
      console.log(`  ${i + 1}. ${t.desc}: ERROR – ${e.message}`);
    }
  });
  console.log(`  Result: ${passed}/${testCases.length} tests passed`);
  return passed === testCases.length;
}

// ---------- Test 2 ----------
function testSnoozeCalculations() {
  console.log('\n2. Testing Snooze Calculations...');
  const mod = safeLoad('./functions/snooze');
  if (!mod || typeof mod.calculateSnoozeUntil !== 'function') {
    console.log('  Skipped (module not available)');
    return false;
  }
  const { calculateSnoozeUntil } = mod;

  const mockNow = new Date('2023-11-05T10:00:00Z');
  const OriginalDate = global.Date;
  global.Date = class extends OriginalDate {
    constructor(...a) { return a.length ? new OriginalDate(...a) : mockNow; }
  };

  const testCases = [
    { input: '30m',      expected: new Date('2023-11-05T10:30:00Z'), desc: '30 minutes snooze' },
    { input: '1h',       expected: new Date('2023-11-05T11:00:00Z'), desc: '1 hour snooze' },
    { input: 'work_end', expected: new Date('2023-11-05T17:00:00Z'), desc: 'Work end snooze' }
  ];

  let passed = 0;
  testCases.forEach((t, i) => {
    try {
      const ok = calculateSnoozeUntil(t.input).getTime() === t.expected.getTime();
      console.log(`  ${i + 1}. ${t.desc}: ${ok ? 'PASS' : 'FAIL'}`);
      if (!ok) console.log(`     Expected ${t.expected.toISOString()}`);
      else passed++;
    } catch (e) {
      console.log(`  ${i + 1}. ${t.desc}: ERROR – ${e.message}`);
    }
  });
  global.Date = OriginalDate;
  console.log(`  Result: ${passed}/${testCases.length} tests passed`);
  return passed === testCases.length;
}

// ---------- Test 3 ----------
function testCacheKeyGeneration() {
  console.log('\n3. Testing Cache Key Generation...');
  const mod = safeLoad('./bigquery/cache');
  if (!mod || typeof mod.generateCacheKey !== 'function') {
    console.log('  Skipped (module not available)');
    return false;
  }
  const { generateCacheKey } = mod;

  const testCases = [
    { args: ['department_options','user123','finance'],  expected: 'department_options:user123:finance' },
    { args: ['bank_accounts','branch456','active'],      expected: 'bank_accounts:branch456:active' }
  ];

  let passed = 0;
  testCases.forEach((t, i) => {
    try {
      const out = generateCacheKey(...t.args);
      const ok = out === t.expected;
      console.log(`  ${i + 1}. Cache key generation: ${ok ? 'PASS' : 'FAIL'}`);
      if (!ok) console.log(`     Expected ${t.expected}, got ${out}`);
      else passed++;
    } catch (e) {
      console.log(`  ${i + 1}. ERROR – ${e.message}`);
    }
  });
  console.log(`  Result: ${passed}/${testCases.length} tests passed`);
  return passed === testCases.length;
}

// ---------- Run everything ----------
console.log('Starting system verification...\n');
const results = [ testChallanValidation(), testSnoozeCalculations(), testCacheKeyGeneration() ];
const passed  = results.filter(Boolean).length;
console.log('\n=== Verification Summary ===');
console.log(`Passed: ${passed}/${results.length} test suites`);
console.log(`Overall Result: ${passed === results.length ? 'SUCCESS' : 'FAILURE'}`);