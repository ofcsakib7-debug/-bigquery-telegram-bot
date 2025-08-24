#!/usr/bin/env node

/**
 * Environment check script for GitHub Actions
 * This script verifies that the environment is properly set up for testing
 */

console.log('=== GitHub Actions Environment Check ===\n');

// Check Node.js version
console.log('1. Checking Node.js version...');
console.log(`  ✅ Node.js version: ${process.version}`);

// Check required environment variables
console.log('\n2. Checking environment variables...');
const requiredEnvVars = [
  'NODE_ENV',
  'GOOGLE_CLOUD_PROJECT',
  'BIGQUERY_DATASET_ID'
];

let allEnvVarsPresent = true;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`  ✅ ${envVar}: ${process.env[envVar]}`);
  } else {
    console.log(`  ⚠️  ${envVar}: Not set (may be optional)`);
  }
});

// Check that required modules can be imported without hanging
console.log('\n3. Checking module imports...');
let allModulesImported = true;

// Test importing core modules
const coreModules = [
  { name: 'fs', path: 'fs' },
  { name: 'path', path: 'path' },
  { name: 'crypto', path: 'crypto' }
];

coreModules.forEach(module => {
  try {
    require(module.path);
    console.log(`  ✅ ${module.name}: Module imported successfully`);
  } catch (error) {
    console.log(`  ❌ ${module.name}: Failed to import - ${error.message}`);
    allModulesImported = false;
  }
});

// Test importing our project modules
console.log('\n4. Checking project modules...');
const projectModules = [
  { name: 'BigQuery Cache', path: './bigquery/cache' },
  { name: 'Payment Functions', path: './functions/payment' },
  { name: 'Snooze Functions', path: './functions/snooze' },
  { name: 'Error Handling', path: './functions/error_handling' },
  { name: 'Security Functions', path: './functions/security' },
  { name: 'Microbatching', path: './bigquery/microbatching' }
];

projectModules.forEach(module => {
  try {
    console.time(`${module.name} Import`);
    require(module.path);
    console.timeEnd(`${module.name} Import`);
    console.log(`  ✅ ${module.name}: Module imported successfully`);
  } catch (error) {
    console.log(`  ❌ ${module.name}: Failed to import - ${error.message}`);
    allModulesImported = false;
  }
});

// Summary
console.log('\n=== Environment Check Summary ===');
console.log(`Node.js: ✅ ${process.version}`);
console.log(`Core Modules: ${allModulesImported ? '✅' : '❌'} All imported`);
console.log(`Project Modules: ${allModulesImported ? '✅' : '❌'} All imported`);

if (allModulesImported) {
  console.log('\n🎉 Environment check passed! Ready for testing.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some modules failed to import. Check the errors above.');
  process.exit(1);
}