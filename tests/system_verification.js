#!/usr/bin/env node

const path = require('path');

// Get absolute paths to avoid relative path issues
const projectRoot = path.join(__dirname, '..');

// Safe import function with detailed error logging
function safeImport(modulePath) {
    try {
        // Convert to absolute path
        const absolutePath = path.resolve(projectRoot, modulePath);
        return require(absolutePath);
    } catch (error) {
        console.error(`? Module import failed: ${modulePath}`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        return null;
    }
}

// System Verification Script
console.log('=== BigQuery Telegram Bot - System Verification ===');

// 1. Test Module Imports
console.log('1. Testing Module Imports with Detailed Error Logging...');

// Use absolute paths for all imports
const payment = safeImport('functions/payment');
const snooze = safeImport('functions/snooze');
const cache = safeImport('bigquery/cache');
const searchValidation = safeImport('functions/search_validation');
const errorDetection = safeImport('functions/error_detection');

const importResults = {
    payment: payment !== null,
    snooze: snooze !== null,
    cache: cache !== null,
    searchValidation: searchValidation !== null,
    errorDetection: errorDetection !== null
};

const importSummary = Object.values(importResults).every(result => result === true);
console.log(`Import Summary: ${importSummary ? '? All modules imported successfully' : '? Some modules failed to import'}`);

// 2. Test Function Accessibility
console.log('\n2. Testing Function Accessibility with Detailed Error Logging...');

function testFunction(module, functionName, testArgs, description) {
    if (!module) {
        console.log(`??  Skipping ${functionName} test - module failed to import`);
        return false;
    }
    
    try {
        if (typeof module[functionName] === 'function') {
            console.log(`? ${functionName} function accessible`);
            
            // Test the function
            const result = module[functionName](...testArgs);
            
            if (result && typeof result === 'object' && result.toISOString) {
                console.log(`? Function execution result:`, result.toISOString());
            } else {
                console.log(`? Function execution result:`, JSON.stringify(result));
            }
            
            return true;
        } else {
            console.log(`? ${functionName} function not accessible`);
            return false;
        }
    } catch (error) {
        console.log(`? ${functionName} function error:`, error.message);
        return false;
    }
}

const functionTests = [
    {
        module: payment,
        functionName: 'validateChallanNumbers',
        testArgs: ['CH-2023-1001'],
        description: 'Payment validation'
    },
    {
        module: cache,
        functionName: 'generateCacheKey',
        testArgs: ['test', 'user123', 'context'],
        description: 'Cache key generation'
    },
    {
        module: snooze,
        functionName: 'calculateSnoozeUntil',
        testArgs: ['1h'],
        description: 'Snooze calculation'
    },
    {
        module: searchValidation,
        functionName: 'validate_search_query',
        testArgs: ['user123', 'e cm'],
        description: 'Search validation'
    },
    {
        module: errorDetection,
        functionName: 'detectLogicalError',
        testArgs: [{
            department: 'FINANCE',
            payment_date: new Date('2023-01-15'),
            transaction_date: new Date('2023-01-10'),
            amount: 1000
        }],
        description: 'Error detection'
    }
];

const functionResults = functionTests.map(test => 
    testFunction(test.module, test.functionName, test.testArgs, test.description)
);

const functionSummary = functionResults.every(result => result === true);
console.log(`Function Accessibility Summary: ${functionSummary ? '? All functions accessible' : '? Some functions not accessible'}`);

// 3. Test Function Execution
console.log('\n3. Testing Function Execution with Detailed Error Logging...');

// This section is already covered in the function accessibility tests

// 4. Test File Structure
console.log('\n4. Testing File Structure...');

const requiredFiles = [
    'functions/payment.js',
    'functions/snooze.js',
    'bigquery/cache.js',
    'functions/search_validation.js',
    'functions/error_detection.js',
    'cloudbuild.yaml',
    'package.json',
    'README.md'
];

const fileResults = requiredFiles.map(filePath => {
    const fullPath = path.join(projectRoot, filePath);
    const exists = require('fs').existsSync(fullPath);
    console.log(`${exists ? '?' : '?'} ${filePath} exists`);
    return exists;
});

const fileSummary = fileResults.every(result => result === true);
console.log(`File Structure Summary: ${fileSummary ? '? All required files exist' : '? Some required files missing'}`);

// 5. Test Package.json Configuration
console.log('\n5. Testing Package.json Configuration...');

let packageJsonResult = false;
try {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = require(packageJsonPath);
    
    console.log('? package.json parsed successfully');
    
    // Define required and optional scripts
    const requiredScripts = ['test:unit', 'test:integration'];
    const optionalScripts = ['test:e2e', 'verify'];
    
    // Check required scripts
    console.log('Checking required scripts:');
    const requiredResults = requiredScripts.map(script => {
        const exists = !!(packageJson.scripts && packageJson.scripts[script]);
        console.log(`${exists ? '?' : '?'} ${script} script ${exists ? 'exists' : 'is missing'}`);
        return exists;
    });
    
    // Check optional scripts
    console.log('Checking optional scripts:');
    const optionalResults = optionalScripts.map(script => {
        const exists = !!(packageJson.scripts && packageJson.scripts[script]);
        console.log(`${exists ? '?' : '?'} ${script} script ${exists ? 'exists' : 'is missing'}`);
        return exists;
    });
    
    // Package.json passes if ALL required scripts are present
    packageJsonResult = requiredResults.every(result => result === true);
    console.log(`Required scripts check: ${packageJsonResult ? 'PASS' : 'FAIL'}`);
    console.log(`Required results: [${requiredResults.join(', ')}]`);
    console.log(`Required scripts check: ${packageJsonResult ? 'PASS' : 'FAIL'}`);
    
    // Additional info
    const totalScripts = Object.keys(packageJson.scripts || {}).length;
    console.log(`Total scripts found: ${totalScripts}`);
    
} catch (error) {
    console.log(`? package.json error: ${error.message}`);
    console.log('Error details:', error);
}

console.log(`Package.json Configuration Summary: ${packageJsonResult ? '? PASS' : '? FAIL'}`);

// Final Summary

// Integrate Design 8-12 verification
console.log('\n=== Running Design 8-12 Verification ===');
const designResults = [];
for (const num of [8,9,10,11,12]) {
    try {
        const mod = safeImport(`verify_design${num}.js`);
        if (mod && typeof mod.runVerification === 'function') {
            console.log(`\nRunning Design ${num} Verification...`);
            mod.runVerification();
            designResults.push(true);
        } else {
            console.log(`  Skipped Design ${num} (module or function not available)`);
            designResults.push(false);
        }
    } catch (e) {
        console.log(`  Error loading Design ${num} verification: ${e.message}`);
        designResults.push(false);
    }
}

console.log('\n=== System Verification Summary ===');
console.log(`  moduleImports: ${importSummary ? '? PASS' : '? FAIL'}`);
console.log(`  functionAccessibility: ${functionSummary ? '? PASS' : '? FAIL'}`);
console.log(`  fileStructure: ${fileSummary ? '? PASS' : '? FAIL'}`);
console.log(`  packageJson: ${packageJsonResult ? '? PASS' : '? FAIL'}`);
console.log(`  design8-12: ${designResults.every(Boolean) ? '? PASS' : '? FAIL'}`);

const overallStatus = importSummary && functionSummary && fileSummary && packageJsonResult && designResults.every(Boolean);
console.log(`\nOverall System Status: ${overallStatus ? '? ALL TESTS PASSED' : '? ISSUES FOUND'}`);

if (!overallStatus) {
        console.log('\n?? Recommended Actions:');
        if (!importSummary) console.log('  - Check module import errors above');
        if (!functionSummary) console.log('  - Check function accessibility errors above');
        if (!fileSummary) console.log('  - Check file structure errors above');
        if (!packageJsonResult) console.log('  - Check package.json scripts configuration');
        if (!designResults.every(Boolean)) console.log('  - Check Design 8-12 verification output above');
}

console.log('\n=== Verification Complete ===');
process.exit(overallStatus ? 0 : 1);
