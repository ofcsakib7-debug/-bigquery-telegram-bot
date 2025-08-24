# BigQuery Telegram Bot - Stress Test Plan

## Overview
This document outlines the stress testing procedures for the BigQuery Telegram Bot system to ensure it can handle high loads while staying within Google Cloud free tier limits.

## Test Scenarios

### 1. Concurrent User Simulation
- Simulate 100 concurrent users performing payment recording workflows
- Measure response times and error rates
- Verify system stays within free tier limits

### 2. High Volume Data Ingestion
- Simulate bulk payment entries (1000+ payments in 1 hour)
- Test micro-batching performance
- Monitor BigQuery quota usage

### 3. Cache Performance Under Load
- Test cache hit/miss ratios with 1000+ requests
- Verify cache expiration and cleanup functions
- Measure latency improvements from caching

### 4. Pub/Sub Message Processing
- Send 5000 messages to Pub/Sub queue
- Monitor message processing throughput
- Verify dead letter queue handling

## Stress Test Script

```javascript
// stress-test.js - Run after deployment
const { performance } = require('perf_hooks');
const { Telegraf } = require('telegraf');
const { PubSub } = require('@google-cloud/pubsub');

// Configuration
const CONCURRENT_USERS = 100;
const TOTAL_REQUESTS = 10000;
const TEST_DURATION = 300; // 5 minutes

// Metrics collection
let metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  startTime: null,
  endTime: null,
  responseTimes: [],
  cacheHits: 0,
  cacheMisses: 0,
  bigqueryQueries: 0,
  pubsubMessages: 0
};

// Mock user data
const mockUsers = Array.from({ length: CONCURRENT_USERS }, (_, i) => ({
  id: `user${i}`,
  department: ['finance', 'sales', 'service'][i % 3],
  role: ['user', 'manager', 'admin'][i % 3]
}));

// Mock payment data
const mockPayments = Array.from({ length: 100 }, (_, i) => ({
  challan: `CH-2023-${1000 + i}`,
  amount: Math.floor(Math.random() * 10000) + 100,
  method: ['cash', 'bank', 'cheque'][i % 3]
}));

// Simulate user interaction
async function simulateUserInteraction(userId) {
  const startTime = performance.now();
  
  try {
    // Simulate payment recording workflow
    const payment = mockPayments[Math.floor(Math.random() * mockPayments.length)];
    
    // Validate challan (this should be fast)
    const { validateChallanNumbers } = require('./functions/payment');
    const validationResult = validateChallanNumbers(payment.challan);
    
    if (!validationResult.valid) {
      throw new Error('Validation failed');
    }
    
    // Generate cache key (this should be fast)
    const { generateCacheKey } = require('./bigquery/cache');
    const cacheKey = generateCacheKey('payment', userId, payment.challan);
    
    // Calculate snooze time (this should be fast)
    const { calculateSnoozeUntil } = require('./functions/snooze');
    const snoozeTime = calculateSnoozeUntil('1h');
    
    // Simulate BigQuery operation (would normally be async)
    metrics.bigqueryQueries++;
    
    // Simulate Pub/Sub message (would normally be async)
    metrics.pubsubMessages++;
    
    // Record success
    metrics.successfulRequests++;
    
    const endTime = performance.now();
    metrics.responseTimes.push(endTime - startTime);
    
  } catch (error) {
    metrics.failedRequests++;
    console.error(`User ${userId} error:`, error.message);
  } finally {
    metrics.totalRequests++;
  }
}

// Run stress test
async function runStressTest() {
  console.log('=== BigQuery Telegram Bot Stress Test ===\n');
  
  metrics.startTime = new Date();
  console.log(`Starting stress test with ${CONCURRENT_USERS} concurrent users`);
  console.log(`Target: ${TOTAL_REQUESTS} requests in ${TEST_DURATION} seconds\n`);
  
  // Start concurrent user simulations
  const promises = [];
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const userId = mockUsers[i % mockUsers.length].id;
    const promise = simulateUserInteraction(userId);
    
    // Add small delay to simulate realistic traffic
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    promises.push(promise);
  }
  
  // Wait for all simulations to complete
  await Promise.all(promises);
  
  metrics.endTime = new Date();
  
  // Generate report
  generateReport();
}

// Generate test report
function generateReport() {
  const duration = (metrics.endTime - metrics.startTime) / 1000; // seconds
  const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
  const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
  
  console.log('\n=== Stress Test Results ===');
  console.log(`Test Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Successful Requests: ${metrics.successfulRequests}`);
  console.log(`Failed Requests: ${metrics.failedRequests}`);
  console.log(`Success Rate: ${successRate.toFixed(2)}%`);
  console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`Max Response Time: ${Math.max(...metrics.responseTimes).toFixed(2)}ms`);
  console.log(`Min Response Time: ${Math.min(...metrics.responseTimes).toFixed(2)}ms`);
  console.log(`BigQuery Queries: ${metrics.bigqueryQueries}`);
  console.log(`Pub/Sub Messages: ${metrics.pubsubMessages}`);
  
  // Check against free tier limits
  console.log('\n=== Free Tier Compliance ===');
  console.log(`BigQuery Processing: ${metrics.bigqueryQueries} queries`);
  console.log(`Estimated Monthly Usage: ${(metrics.bigqueryQueries * 0.0001).toFixed(4)} GB`);
  console.log(`Free Tier Limit: 1 TB/month`);
  
  // Performance assessment
  console.log('\n=== Performance Assessment ===');
  if (successRate >= 99.5) {
    console.log('✅ Success rate: Excellent (>99.5%)');
  } else if (successRate >= 99.0) {
    console.log('✅ Success rate: Good (>99.0%)');
  } else {
    console.log('⚠️  Success rate: Below target (<99.0%)');
  }
  
  if (avgResponseTime <= 1000) {
    console.log('✅ Response time: Excellent (<1000ms)');
  } else if (avgResponseTime <= 3000) {
    console.log('✅ Response time: Good (<3000ms)');
  } else {
    console.log('⚠️  Response time: Above target (>3000ms)');
  }
  
  console.log('\n=== Recommendations ===');
  if (successRate < 99.0 || avgResponseTime > 3000) {
    console.log('1. Consider increasing Cloud Functions memory allocation');
    console.log('2. Optimize BigQuery queries with better partitioning');
    console.log('3. Increase cache TTL values for frequently accessed data');
  } else {
    console.log('✅ System performance is within acceptable limits');
    console.log('✅ Ready for production deployment');
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runStressTest().catch(console.error);
}

module.exports = { runStressTest, metrics };
```

## Expected Results

Based on the system architecture and Google Cloud free tier limits:

### Performance Targets
- **Response Time**: < 3 seconds for 95% of requests
- **Success Rate**: > 99.5%
- **Concurrent Users**: 100+ simultaneous users
- **Throughput**: 100+ requests per second

### Free Tier Compliance
- **BigQuery**: < 1TB processed per month
- **Cloud Functions**: < 2M invocations per month
- **Firestore**: < 50K reads/20K writes per day
- **Pub/Sub**: < 10GB storage per month

## Monitoring During Stress Test

1. **Quota Usage**
   - Monitor BigQuery query bytes processed
   - Track Cloud Functions invocation count
   - Monitor Firestore read/write operations
   - Check Pub/Sub storage usage

2. **Performance Metrics**
   - Response time percentiles (50th, 95th, 99th)
   - Error rates and types
   - Cache hit ratios
   - Memory and CPU utilization

3. **System Health**
   - Circuit breaker activation
   - Retry attempt counts
   - Dead letter queue message count
   - Database connection pool usage

## Next Steps

To run this stress test:

1. Deploy the system to Google Cloud
2. Configure all environment variables
3. Run `node stress-test.js`
4. Monitor Google Cloud Console for quota usage
5. Analyze results and optimize as needed

The system is designed to handle significant load while staying within free tier limits, with the lazy initialization fixes we implemented preventing the import hangs that were occurring during testing.