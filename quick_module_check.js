#!/usr/bin/env node

/**
 * Quick Module Import Check
 * 
 * This script quickly checks if the most critical modules can be imported
 * without hanging, focusing on the ones that were previously causing issues.
 */

console.log('=== Quick Module Import Check ===\n');

// Function to safely import a module with timeout
function safeImport(modulePath, moduleName, timeoutMs = 5000) {
  return new Promise((resolve) => {
    console.log(`🔍 Checking ${moduleName}...`);
    console.time(`${moduleName} Import`);
    
    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.timeEnd(`${moduleName} Import`);
      console.log(`  ⚠️  ${moduleName} import timed out (>${timeoutMs}ms) - POSSIBLE HANG`);
      resolve({ success: false, timedOut: true });
    }, timeoutMs);
    
    try {
      const module = require(modulePath);
      clearTimeout(timeout);
      console.timeEnd(`${moduleName} Import`);
      console.log(`  ✅ ${moduleName} imported successfully`);
      resolve({ success: true, module });
    } catch (error) {
      clearTimeout(timeout);
      console.timeEnd(`${moduleName} Import`);
      console.log(`  ❌ ${moduleName} import failed: ${error.message}`);
      resolve({ success: false, error });
    }
  });
}

// Check the most critical modules that were previously causing hangs
async function checkCriticalModules() {
  const modules = [
    { path: './bigquery/cache', name: 'BigQuery Cache' },
    { path: './functions/payment', name: 'Payment Functions' },
    { path: './functions/snooze', name: 'Snooze Functions' },
    { path: './functions/security', name: 'Security Functions' },
    { path: './functions/error_handling', name: 'Error Handling' },
    { path: './bigquery/microbatching', name: 'Microbatching' }
  ];
  
  console.log('Checking critical modules that were previously causing hangs...\n');
  
  const results = [];
  for (const { path, name } of modules) {
    const result = await safeImport(path, name);
    results.push({ path, name, ...result });
    console.log(''); // Empty line for spacing
  }
  
  // Summary
  console.log('=== Import Check Summary ===');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success && !r.timedOut).length;
  const timedOut = results.filter(r => r.timedOut).length;
  
  console.log(`✅ Successful imports: ${successful}/${modules.length}`);
  console.log(`❌ Failed imports: ${failed}/${modules.length}`);
  console.log(`⏰ Timed out imports: ${timedOut}/${modules.length}`);
  
  if (timedOut > 0) {
    console.log('\n⚠️  WARNING: Some modules timed out during import!');
    console.log('   This indicates a potential hang issue that needs to be addressed.');
    console.log('   Check the modules that timed out for heavy initialization or circular dependencies.');
  }
  
  if (successful === modules.length) {
    console.log('\n🎉 All critical modules imported successfully!');
    console.log('   The hanging import issue appears to be resolved.');
  }
  
  return results;
}

// Run the check
if (require.main === module) {
  checkCriticalModules().then(results => {
    console.log('\n=== Quick Module Check Complete ===');
    
    // Additional recommendations
    console.log('\n💡 Recommendations:');
    const timedOutModules = results.filter(r => r.timedOut);
    if (timedOutModules.length > 0) {
      console.log('   1. Review the modules that timed out for potential issues:');
      timedOutModules.forEach(mod => {
        console.log(`      - ${mod.name} (${mod.path})`);
      });
      console.log('   2. Check for heavy initialization in these modules');
      console.log('   3. Look for circular dependencies');
      console.log('   4. Ensure lazy loading of Google Cloud services');
    } else {
      console.log('   No modules timed out - system appears to be working correctly!');
    }
  }).catch(error => {
    console.error('🚨 Unexpected error during module check:', error);
  });
}

module.exports = { safeImport, checkCriticalModules };