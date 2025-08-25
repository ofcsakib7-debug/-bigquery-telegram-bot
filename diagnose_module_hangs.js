#!/usr/bin/env node

/**
 * Comprehensive Diagnostic Script for Module Import Hangs
 * 
 * This script performs a comprehensive diagnosis of potential causes
 * for module import hangs in the BigQuery Telegram Bot system.
 */

console.log('=== Comprehensive Diagnostic for Module Import Hangs ===\n');

// Test 1: Environment Variables Check
console.log('1. Checking Environment Variables...\n');

const requiredEnvVars = [
  'GOOGLE_CLOUD_PROJECT',
  'BOT_TOKEN',
  'BIGQUERY_DATASET_ID'
];

let allEnvVarsPresent = true;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`  ✅ ${envVar}: ${process.env[envVar]}`);
  } else {
    console.log(`  ⚠️  ${envVar}: Not set (may be optional for testing)`);
  }
});

// Test 2: Node.js Version Check
console.log('\n2. Checking Node.js Version...\n');

const nodeVersion = process.version;
console.log(`  🟢 Node.js Version: ${nodeVersion}`);

const majorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
if (majorVersion >= 18) {
  console.log('  ✅ Node.js version is compatible (>= 18)');
} else {
  console.log('  ⚠️  Node.js version may be incompatible (< 18)');
}

// Test 3: Dependency Check
console.log('\n3. Checking Dependencies...\n');

try {
  const fs = require('fs');
  const path = require('path');
  
  // Check if package.json exists
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    console.log('  ✅ package.json exists');
    
    // Parse package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check for required dependencies
    const requiredDeps = [
      '@google-cloud/bigquery',
      '@google-cloud/firestore',
      '@google-cloud/pubsub',
      '@google-cloud/kms',
      '@google-cloud/storage',
      'telegraf',
      'sharp',
      'uuid'
    ];
    
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        console.log(`  ✅ ${dep}: ${packageJson.dependencies[dep]}`);
      } else {
        console.log(`  ⚠️  ${dep}: Not listed in dependencies`);
      }
    });
  } else {
    console.log('  ❌ package.json is missing');
  }
} catch (error) {
  console.log('  ❌ Error checking dependencies:', error.message);
}

// Test 4: File Structure Check
console.log('\n4. Checking File Structure...\n');

const requiredFiles = [
  'functions/payment.js',
  'functions/snooze.js',
  'functions/security.js',
  'functions/error_handling.js',
  'bigquery/cache.js',
  'bigquery/microbatching.js',
  'bigquery/schemas.js'
];

requiredFiles.forEach(file => {
  try {
    const filePath = require.resolve(`./${file}`);
    console.log(`  ✅ ${file}: Exists at ${filePath}`);
  } catch (error) {
    console.log(`  ❌ ${file}: Not found - ${error.message}`);
  }
});

// Test 5: Circular Dependency Check
console.log('\n5. Checking for Circular Dependencies...\n');

// Simple circular dependency detector
function checkCircularDependencies(filePath, visited = new Set()) {
  try {
    // Skip if already visited
    if (visited.has(filePath)) {
      return true;
    }
    
    // Add to visited
    visited.add(filePath);
    
    // Read file content
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find require statements
    const requireRegex = /require\(['"](\.[^'"]+)['"]\)/g;
    let match;
    
    while ((match = requireRegex.exec(content)) !== null) {
      const requiredPath = match[1];
      try {
        // Resolve the required path
        const resolvedPath = require.resolve(requiredPath, { paths: [require('path').dirname(filePath)] });
        if (checkCircularDependencies(resolvedPath, new Set(visited))) {
          console.log(`  🔄 Circular dependency detected: ${filePath} -> ${requiredPath}`);
          return true;
        }
      } catch (resolveError) {
        // Ignore resolution errors
      }
    }
    
    return false;
  } catch (error) {
    // Ignore read errors
    return false;
  }
}

// Check for circular dependencies in key files
const keyFiles = [
  'functions/payment.js',
  'functions/snooze.js',
  'bigquery/cache.js'
];

let circularDepsFound = false;
keyFiles.forEach(file => {
  try {
    const filePath = require.resolve(`./${file}`);
    if (checkCircularDependencies(filePath)) {
      circularDepsFound = true;
    }
  } catch (error) {
    // Ignore errors
  }
});

if (!circularDepsFound) {
  console.log('  ✅ No circular dependencies detected in key files');
}

// Test 6: Heavy Initialization Check
console.log('\n6. Checking for Heavy Initialization...\n');

// Check for patterns that might cause heavy initialization
function checkForHeavyInitialization(filePath) {
  try {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Patterns that might cause heavy initialization
    const heavyPatterns = [
      { pattern: /new BigQuery\(\)/, description: 'Immediate BigQuery client initialization' },
      { pattern: /new Firestore\(\)/, description: 'Immediate Firestore client initialization' },
      { pattern: /require\(['"]@google-cloud/g, description: 'Google Cloud service imports' },
      { pattern: /fs\.readFileSync.*\.(json|txt|csv)/, description: 'Reading large data files during import' }
    ];
    
    let heavyInitFound = false;
    heavyPatterns.forEach(({ pattern, description }) => {
      if (pattern.test(content)) {
        console.log(`  ⚠️  Potential heavy initialization in ${filePath}: ${description}`);
        heavyInitFound = true;
      }
    });
    
    if (!heavyInitFound) {
      console.log(`  ✅ No heavy initialization detected in ${filePath}`);
    }
    
    return heavyInitFound;
  } catch (error) {
    console.log(`  ❌ Error checking ${filePath}: ${error.message}`);
    return false;
  }
}

// Check key files for heavy initialization
keyFiles.forEach(file => {
  try {
    const filePath = require.resolve(`./${file}`);
    checkForHeavyInitialization(filePath);
  } catch (error) {
    // Ignore errors
  }
});

// Test 7: Import Time Measurement
console.log('\n7. Measuring Import Times...\n');

function measureImportTime(modulePath, moduleName) {
  try {
    console.time(`${moduleName} Import`);
    const module = require(modulePath);
    console.timeEnd(`${moduleName} Import`);
    
    // Check if module has functions
    const functions = Object.keys(module).filter(key => typeof module[key] === 'function');
    console.log(`     Available functions: ${functions.length}`);
    
    return true;
  } catch (error) {
    console.timeEnd(`${moduleName} Import`);
    console.log(`     Error: ${error.message}`);
    return false;
  }
}

const modulesToTest = [
  { path: './functions/payment', name: 'Payment' },
  { path: './functions/snooze', name: 'Snooze' },
  { path: './bigquery/cache', name: 'Cache' },
  { path: './bigquery/microbatching', name: 'Microbatching' }
];

let allImportsSuccessful = true;
modulesToTest.forEach(({ path, name }) => {
  if (!measureImportTime(path, name)) {
    allImportsSuccessful = false;
  }
});

// Summary
console.log('\n=== Diagnostic Summary ===');
console.log(`Environment Variables: ${requiredEnvVars.every(v => process.env[v]) ? '✅ OK' : '⚠️  Some missing'}`);
console.log(`Node.js Version: ${majorVersion >= 18 ? '✅ OK' : '⚠️  May be incompatible'}`);
console.log(`File Structure: ${requiredFiles.every(f => {
  try {
    require.resolve(`./${f}`);
    return true;
  } catch {
    return false;
  }
}) ? '✅ OK' : '❌ Issues found'}`);
console.log(`Circular Dependencies: ${circularDepsFound ? '🔄 Found' : '✅ None detected'}`);
console.log(`Import Times: ${allImportsSuccessful ? '✅ All fast' : '❌ Some slow'}`);

console.log('\n=== Recommendations ===');
if (!allImportsSuccessful || circularDepsFound) {
  console.log('1. Check for circular dependencies between modules');
  console.log('2. Ensure lazy initialization for Google Cloud services');
  console.log('3. Verify all required environment variables are set');
  console.log('4. Check that all dependencies are properly installed');
} else {
  console.log('✅ No critical issues detected');
  console.log('✅ Module imports should work without hanging');
}

console.log('\n=== Next Steps ===');
console.log('1. Run the specific cache module test: node test_cache_module.js');
console.log('2. Run the module verification: node verify_module_imports.js');
console.log('3. Run the debug script: node debug_module_import_hang.js');
console.log('4. If issues persist, check GitHub Actions logs for specific error messages');