const testModuleImport = (moduleName, modulePath) => {
  try {
    // Use relative paths directly since we run from project root
    const module = require(modulePath);
    console.log(`? ${moduleName} module imports successfully`);
    return true;
  } catch (error) {
    console.log(`? ${moduleName} module error:`, error.message);
    return false;
  }
};

// Test all modules
const paymentSuccess = testModuleImport('Payment', './functions/payment');
const snoozeSuccess = testModuleImport('Snooze', './functions/snooze');
const cacheSuccess = testModuleImport('Cache', './bigquery/cache');

// Exit with appropriate code
if (paymentSuccess && snoozeSuccess && cacheSuccess) {
  console.log('? All module imports successful');
  process.exit(0);
} else {
  console.log('? Some module imports failed');
  process.exit(1);
}
