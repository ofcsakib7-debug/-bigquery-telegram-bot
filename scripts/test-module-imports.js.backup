const path = require('path');
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const testModuleImport = (moduleName, modulePath) => {
  try {
    const fullPath = path.join(projectRoot, modulePath);
    const module = require(fullPath);
    console.log(`? ${moduleName} module imports successfully`);
    return true;
  } catch (error) {
    console.log(`? ${moduleName} module error:`, error.message);
    return false;
  }
};

// Test all modules
const paymentSuccess = testModuleImport('Payment', 'functions/payment');
const snoozeSuccess = testModuleImport('Snooze', 'functions/snooze');
const cacheSuccess = testModuleImport('Cache', 'bigquery/cache');

// Exit with appropriate code
if (paymentSuccess && snoozeSuccess && cacheSuccess) {
  console.log('? All module imports successful');
  process.exit(0);
} else {
  console.log('? Some module imports failed');
  process.exit(1);
}
