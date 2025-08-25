#!/usr/bin/env node

/**
 * Debug Script for Module Import Hang Issues
 * 
 * This script helps identify the exact cause of module import hangs by:
 * 1. Adding timeout protection
 * 2. Providing verbose logging
 * 3. Detecting circular dependencies
 * 4. Measuring import times
 * 5. Identifying heavy initialization
 */

console.log('=== Module Import Hang Debug Script ===\n');

// Set a global timeout to prevent indefinite hanging
const TIMEOUT_MS = 30000; // 30 seconds timeout

// Function to safely import a module with timeout and detailed logging
async function safeImportWithTimeout(modulePath, moduleName) {
  console.log(`🔍 Attempting to import ${moduleName} from ${modulePath}...`);
  console.time(`${moduleName} Import`);
  
  return new Promise((resolve, reject) => {
    // Set timeout
    const timeout = setTimeout(() => {
      console.log(`⏰ Timeout reached for ${moduleName} import (${TIMEOUT_MS}ms)`);
      reject(new Error(`Import timeout for ${moduleName}`));
    }, TIMEOUT_MS);
    
    try {
      // Try to import the module
      console.log(`  📦 Loading module ${moduleName}...`);
      const module = require(modulePath);
      console.log(`  ✅ Module ${moduleName} loaded successfully`);
      
      clearTimeout(timeout);
      console.timeEnd(`${moduleName} Import`);
      resolve(module);
    } catch (error) {
      console.log(`  ❌ Error importing ${moduleName}: ${error.message}`);
      clearTimeout(timeout);
      console.timeEnd(`${moduleName} Import`);
      reject(error);
    }
  });
}

// Function to detect circular dependencies
function detectCircularDependencies(modulePath, visited = new Set(), path = []) {
  try {
    // If we've already visited this module, we have a cycle
    if (visited.has(modulePath)) {
      console.log(`🌀 Circular dependency detected: ${path.join(' -> ')} -> ${modulePath}`);
      return true;
    }
    
    // Mark as visited
    visited.add(modulePath);
    path.push(modulePath);
    
    // Read the module file
    const fs = require('fs');
    const pathModule = require('path');
    
    // Resolve the full path
    const fullPath = require.resolve(modulePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Look for require statements
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    
    while ((match = requireRegex.exec(content)) !== null) {
      const requiredPath = match[1];
      
      // Skip built-in modules and relative paths that are hard to resolve
      if (requiredPath.startsWith('.') || requiredPath.startsWith('/')) {
        // Try to resolve relative paths
        try {
          const resolvedPath = require.resolve(requiredPath, { paths: [pathModule.dirname(fullPath)] });
          if (detectCircularDependencies(resolvedPath, new Set(visited), [...path])) {
            return true;
          }
        } catch (error) {
          // Ignore resolution errors for now
          console.log(`  ⚠️  Could not resolve: ${requiredPath}`);
        }
      }
    }
    
    return false;
  } catch (error) {
    console.log(`  ⚠️  Error analyzing ${modulePath}: ${error.message}`);
    return false;
  }
}

// Function to check for heavy initialization
function checkForHeavyInitialization(modulePath) {
  try {
    const fs = require('fs');
    const content = fs.readFileSync(require.resolve(modulePath), 'utf8');
    
    // Look for patterns that might cause heavy initialization
    const heavyPatterns = [
      { pattern: /new BigQuery\(\)/, description: 'Immediate BigQuery client initialization' },
      { pattern: /new Firestore\(\)/, description: 'Immediate Firestore client initialization' },
      { pattern: /new PubSub\(\)/, description: 'Immediate PubSub client initialization' },
      { pattern: /require\(['"]@google-cloud/g, description: 'Google Cloud service imports' },
      { pattern: /fs\.readFileSync.*large/, description: 'Large file reading during import' },
      { pattern: /model\.load\(/, description: 'ML model loading during import' }
    ];
    
    console.log(`  🔍 Checking ${modulePath} for heavy initialization...`);
    
    heavyPatterns.forEach(({ pattern, description }) => {
      if (pattern.test(content)) {
        console.log(`  ⚠️  Potential heavy initialization: ${description}`);
      }
    });
  } catch (error) {
    console.log(`  ⚠️  Error checking heavy initialization in ${modulePath}: ${error.message}`);
  }
}

// Main debug function
async function debugModuleImports() {
  console.log('🚀 Starting module import debugging...\n');
  
  // List of modules to check
  const modulesToCheck = [
    { path: './functions/payment', name: 'Payment Functions' },
    { path: './functions/snooze', name: 'Snooze Functions' },
    { path: './functions/security', name: 'Security Functions' },
    { path: './functions/error_handling', name: 'Error Handling Functions' },
    { path: './bigquery/cache', name: 'BigQuery Cache' },
    { path: './bigquery/microbatching', name: 'Microbatching System' },
    { path: './bigquery/schemas', name: 'BigQuery Schemas' }
  ];
  
  // Check each module
  for (const module of modulesToCheck) {
    try {
      // Check for heavy initialization
      checkForHeavyInitialization(module.path);
      
      // Try to import with timeout
      await safeImportWithTimeout(module.path, module.name);
      
      console.log('');
    } catch (error) {
      console.log(`  ❌ Failed to import ${module.name}: ${error.message}\n`);
    }
  }
  
  // Check for circular dependencies in key modules
  console.log('🔁 Checking for circular dependencies...\n');
  modulesToCheck.forEach(module => {
    try {
      detectCircularDependencies(module.path);
    } catch (error) {
      console.log(`  ❌ Error checking circular dependencies for ${module.name}: ${error.message}\n`);
    }
  });
  
  console.log('✅ Module import debugging completed!\n');
  
  // Summary
  console.log('=== Debug Summary ===');
  console.log('If you see this message, the debug script completed successfully.');
  console.log('Check the output above for any warnings or errors that might indicate');
  console.log('the cause of the import hang.');
}

// Run the debug script
if (require.main === module) {
  debugModuleImports().catch(error => {
    console.error('🚨 Unexpected error in debug script:', error);
    process.exit(1);
  });
}

module.exports = {
  safeImportWithTimeout,
  detectCircularDependencies,
  checkForHeavyInitialization,
  debugModuleImports
};