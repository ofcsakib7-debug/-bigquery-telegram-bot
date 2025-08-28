// tests/unit/ci_cd_verification.test.js
// Test to verify CI/CD components

describe('CI/CD Component Verification', () => {
  test('should import payment module successfully', () => {
    const payment = require('../functions/payment');
    expect(payment).toBeDefined();
  });

  test('should import snooze module successfully', () => {
    const snooze = require('../functions/snooze');
    expect(snooze).toBeDefined();
  });

  test('should import cache module successfully', () => {
    const cache = require('../bigquery/cache');
    expect(cache).toBeDefined();
  });

  test('should have validateChallanNumbers function accessible', () => {
    const payment = require('../functions/payment');
    expect(typeof payment.validateChallanNumbers).toBe('function');
  });

  test('should have generateCacheKey function accessible', () => {
    const cache = require('../bigquery/cache');
    expect(typeof cache.generateCacheKey).toBe('function');
  });

  test('should have calculateSnoozeUntil function accessible', () => {
    const snooze = require('../functions/snooze');
    expect(typeof snooze.calculateSnoozeUntil).toBe('function');
  });

  test('should have cloudbuild.yaml file', () => {
    const fs = require('fs');
    const path = require('path');
    const cloudbuildPath = path.join(__dirname, '../cloudbuild.yaml');
    expect(fs.existsSync(cloudbuildPath)).toBe(true);
  });

  test('should have required test scripts in package.json', () => {
    const packageJson = require('../package.json');
    const requiredScripts = ['test:unit', 'test:integration'];
    requiredScripts.forEach(script => {
      expect(packageJson.scripts[script]).toBeDefined();
    });
  });
});