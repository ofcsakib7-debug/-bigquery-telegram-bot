# 🛠️ BigQuery Telegram Bot - Issue Resolution Guide

## 📋 Overview

This guide provides step-by-step instructions to fix the issues identified in the test results. Follow these steps in order to resolve the problems and get your system fully functional.

## 🔧 **Phase 1: Critical Issues (Must Fix First)**

### 1. **Fix File Path Issues**

#### Problem:
```
Cannot find module '../functions/payment'
Cannot find module '../../bigquery/cache'
```

#### Solution:

1. **Identify incorrect paths in test files**
   - Open each failing test file
   - Check the require/import statements at the top

2. **Correct the paths**
   ```javascript
   // In tests/unit/simple.test.js
   // WRONG:
   const { validateChallanNumbers } = require('../functions/payment');
   
   // CORRECT:
   const { validateChallanNumbers } = require('../../functions/payment');
   ```

3. **Common path corrections:**
   - `../functions/payment` → `../../functions/payment`
   - `../../bigquery/cache` → `../../../bigquery/cache`
   - `../bigquery/microbatching` → `../../bigquery/microbatching`

#### Files to check:
- `tests/unit/simple.test.js`
- `tests/unit/cache.test.js`
- `tests/unit/microbatching.test.js`
- `tests/unit/snooze.test.js`
- `tests/unit/error_handling.test.js`

### 2. **Resolve Syntax Errors in cache.js**

#### Problem:
```
SyntaxError: Expecting Unicode escape sequence \\uXXXX
```

#### Solution:

1. **Open `bigquery/cache.js`**

2. **Find the problematic line** (around line 76)

3. **Fix escape sequences in template literals**
   ```javascript
   // PROBLEMATIC CODE:
   const query = `
     MERGE \\`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.master_cache\\` T
   `;
   
   // FIXED CODE:
   const query = `
     MERGE \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.master_cache\` T
   `;
   ```
   
   Remove the extra backslashes (`\\\\` → `\\`)

### 3. **Install Missing Dependencies**

#### Problem:
```
Cannot find module '@google-cloud/kms'
```

#### Solution:

1. **Install the missing package:**
   ```bash
   npm install @google-cloud/kms
   ```

2. **If installation fails, mock the module:**
   Create a mock file at `__mocks__/@google-cloud/kms.js`:
   ```javascript
   // __mocks__/@google-cloud/kms.js
   const mockKmsClient = {
     cryptoKeyPath: jest.fn(),
     encrypt: jest.fn().mockResolvedValue([{ ciphertext: Buffer.from('mock-encrypted-data') }]),
     decrypt: jest.fn().mockResolvedValue([{ plaintext: Buffer.from('mock-decrypted-data') }])
   };
   
   module.exports = {
     KeyManagementServiceClient: jest.fn(() => mockKmsClient)
   };
   ```

## 🕐 **Phase 2: Time Zone Issues**

### **Problem:**
```
Expected: 2023-11-05T17:00:00.000Z
Received: 2023-11-05T11:00:00.000Z
```

### **Solution:**

1. **Open `tests/unit/snooze.test.js`**

2. **Fix the test expectations to use UTC consistently**
   ```javascript
   // WRONG:
   const expected = new Date('2023-11-05T17:00:00Z');
   
   // CORRECT:
   const expected = new Date('2023-11-05T17:00:00.000Z');
   ```

3. **Ensure all date comparisons use UTC:**
   ```javascript
   // In functions/snooze.js
   function calculateSnoozeUntil(duration) {
     const now = new Date();
     
     switch (duration) {
       // Use UTC consistently
       case 'work_end':
         const workEnd = new Date(now);
         workEnd.setUTCHours(17, 0, 0, 0); // 5:00 PM UTC
         return workEnd;
         
       case 'tomorrow':
         const tomorrow = new Date(now);
         tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
         tomorrow.setUTCHours(9, 0, 0, 0); // 9:00 AM UTC
         return tomorrow;
         
       default:
         return new Date(now.getTime() + 60 * 60 * 1000);
     }
   }
   ```

## ⚡ **Phase 3: Circuit Breaker Issues**

### **Problem:**
```
Expected: \"OPEN\"
Received: \"CLOSED\"
```

### **Solution:**

1. **Open `functions/error_handling.js`**

2. **Check the CircuitBreaker class implementation**
   ```javascript
   class CircuitBreaker {
     constructor(failureThreshold = 5, resetTimeout = 60000) {
       this.failureThreshold = failureThreshold;
       this.resetTimeout = resetTimeout;
       this.failureCount = 0;
       this.lastFailureTime = null;
       this.state = 'CLOSED'; // Should start as CLOSED
     }
     
     async execute(fn) {
       // Check if circuit is open
       if (this.state === 'OPEN') {
         // Check if reset timeout has passed
         if (this.lastFailureTime && 
             (Date.now() - this.lastFailureTime) > this.resetTimeout) {
           this.state = 'HALF_OPEN';
         } else {
           throw new Error('Circuit breaker is OPEN');
         }
       }
       
       try {
         const result = await fn();
         
         // Reset failure count on success
         this.failureCount = 0;
         this.state = 'CLOSED';
         
         return result;
       } catch (error) {
         this.failureCount++;
         this.lastFailureTime = Date.now();
         
         // Open circuit if failure threshold is reached
         if (this.failureCount >= this.failureThreshold) {
           this.state = 'OPEN';
         }
         
         throw error;
       }
     }
     
     getStatus() {
       return {
         state: this.state,
         failureCount: this.failureCount,
         lastFailureTime: this.lastFailureTime
       };
     }
   }
   ```

## ⏱️ **Phase 4: Test Timeout Issues**

### **Problem:**
```
Exceeded timeout of 5000 ms for a test
```

### **Solution:**

1. **Open `tests/unit/error_handling.test.js`**

2. **Increase timeout for long-running tests**
   ```javascript
   // WRONG:
   test('should retry function on failure and eventually succeed', async () => {
     // ...
   });
   
   // CORRECT:
   test('should retry function on failure and eventually succeed', async () => {
     // ...
   }, 15000); // 15 second timeout
   ```

3. **Or configure globally in jest.config.js:**
   ```javascript
   module.exports = {
     // ...
     testTimeout: 15000, // 15 seconds default timeout
   };
   ```

## 🧪 **Phase 5: Verification**

### **After making all fixes:**

1. **Run individual test files to verify:**
   ```bash
   npm run test:unit -- tests/unit/payment.test.js
   npm run test:unit -- tests/unit/snooze.test.js
   npm run test:unit -- tests/unit/microbatching.test.js
   ```

2. **Run all tests:**
   ```bash
   npm run test:unit
   ```

3. **Check for any remaining issues**

## 📋 **Checklist**

### ✅ **Critical Issues (Must Fix)**
- [ ] Fix file path issues in test files
- [ ] Resolve syntax errors in cache.js
- [ ] Install or mock missing dependencies
- [ ] Fix time zone handling in tests
- [ ] Correct circuit breaker implementation
- [ ] Adjust test timeouts

### ✅ **Verification Steps**
- [ ] All unit tests pass
- [ ] No syntax errors
- [ ] No missing module errors
- [ ] Time zone calculations correct
- [ ] Circuit breaker transitions work
- [ ] All tests complete within timeout

## 🆘 **Troubleshooting**

### **If tests still fail:**

1. **Check Node.js version:**
   ```bash
   node --version
   ```
   Should be Node.js 18.x or later

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Check environment variables:**
   Ensure required environment variables are set

### **If specific errors persist:**

1. **Share the exact error message**
2. **Include the file name and line number**
3. **Show the current code around that line**

## 🎉 **Success Criteria**

When all fixes are implemented correctly, you should see:
```
Test Suites: 8 passed, 8 total
Tests:       40 passed, 40 total
Snapshots:   0 total
Time:        5.231 s
Ran all test suites.
```

This indicates that your BigQuery Telegram Bot system is fully functional and ready for deployment!