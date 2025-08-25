#!/usr/bin/env node

/**
 * Simple Module Import Verification
 * 
 * This script verifies that all modules can be imported without hanging
 * and reports the time taken for each import.
 */

console.log('=== Module Import Verification ===\n');

// Function to measure import time
function measureImport(modulePath, moduleName) {
  console.time(`${moduleName} Import`);
  
  try {
    const module = require(modulePath);
    console.timeEnd(`${moduleName} Import`);
    console.log(`  ✅ ${moduleName} imported successfully`);
    
    // Check if the module has functions
    const functions = Object.keys(module).filter(key => typeof module[key] === 'function');
    if (functions.length > 0) {
      console.log(`     Available functions: ${functions.slice(0, 5).join(', ')}${functions.length > 5 ? '...' : ''}`);
    }
    
    return { success: true, module };
  } catch (error) {
    console.timeEnd(`${moduleName} Import`);
    console.log(`  ❌ ${moduleName} import failed: ${error.message}`);
    return { success: false, error };
  }
}

// List of modules to verify
const modules = [
  { path: './functions/payment', name: 'Payment Functions' },
  { path: './functions/snooze', name: 'Snooze Functions' },
  { path: './functions/security', name: 'Security Functions' },
  { path: './functions/error_handling', name: 'Error Handling Functions' },
  { path: './bigquery/cache', name: 'BigQuery Cache' },
  { path: './bigquery/microbatching', name: 'Microbatching System' },
  { path: './bigquery/schemas', name: 'BigQuery Schemas' }
];

console.log('Testing module imports...\n');

let successCount = 0;
modules.forEach(({ path, name }) => {
  const result = measureImport(path, name);
  if (result.success) {
    successCount++;
  }
  console.log(''); // Empty line for spacing
});

console.log(`=== Import Verification Summary ===`);
console.log(`✅ Successfully imported: ${successCount}/${modules.length} modules`);
console.log(`❌ Failed imports: ${modules.length - successCount}/${modules.length} modules`);

if (successCount === modules.length) {
  console.log('\n🎉 All modules imported successfully!');
  console.log('The system should be ready for testing.');
} else {
  console.log('\n⚠️  Some modules failed to import.');
  console.log('Check the errors above to identify the issues.');
}

console.log('\nNext steps:');
console.log('1. Fix any failed imports');
console.log('2. Run the full test suite with: npm test');
console.log('3. Check GitHub Actions for automated testing');