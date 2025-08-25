// Debug script to identify circular dependencies and heavy initialization issues
console.log('=== Module Import Debug Script ===\n');

// Function to safely import a module and measure time
async function safeImport(modulePath, moduleName) {
  try {
    console.time(`${moduleName} Import`);
    console.log(`\n🔍 Attempting to import ${moduleName} from ${modulePath}...`);
    
    // Dynamically import the module
    const module = await import(modulePath);
    
    console.timeEnd(`${moduleName} Import`);
    console.log(`✅ ${moduleName} imported successfully`);
    
    // Check for circular dependencies by examining the module structure
    const moduleKeys = Object.keys(module);
    console.log(`📦 ${moduleName} exports: ${moduleKeys.length} items`);
    
    // Log first few exports
    const firstExports = moduleKeys.slice(0, 5);
    firstExports.forEach(key => {
      const type = typeof module[key];
      console.log(`   - ${key}: ${type}`);
    });
    
    if (moduleKeys.length > 5) {
      console.log(`   ... and ${moduleKeys.length - 5} more exports`);
    }
    
    return { success: true, module };
  } catch (error) {
    console.timeEnd(`${moduleName} Import`);
    console.log(`❌ ${moduleName} import failed:`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    return { success: false, error };
  }
}

// Test importing core modules
async function testModuleImports() {
  console.log('🚀 Starting module import tests...\n');
  
  // Test core modules first
  const coreModules = [
    { path: './functions/payment.js', name: 'Payment' },
    { path: './functions/snooze.js', name: 'Snooze' },
    { path: './functions/security.js', name: 'Security' },
    { path: './functions/error_handling.js', name: 'Error Handling' },
    { path: './bigquery/cache.js', name: 'Cache' },
    { path: './bigquery/microbatching.js', name: 'Microbatching' },
    { path: './bigquery/schemas.js', name: 'BigQuery Schemas' }
  ];
  
  // Import modules one by one with timing
  for (const module of coreModules) {
    await safeImport(module.path, module.name);
    
    // Small delay between imports to prevent overwhelming
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n✅ Module import testing completed!');
}

// Run the test
testModuleImports().catch(error => {
  console.error('🚨 Unexpected error in module import test:', error);
});