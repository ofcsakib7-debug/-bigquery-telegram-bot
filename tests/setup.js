// Global test setup and cleanup

// Store original setInterval and setTimeout to restore later
const originalSetInterval = global.setInterval;
const originalSetTimeout = global.setTimeout;

// Track all intervals and timeouts
const intervals = new Set();
const timeouts = new Set();

// Override setInterval to track intervals
global.setInterval = (callback, delay, ...args) => {
  const id = originalSetInterval(callback, delay, ...args);
  intervals.add(id);
  return id;
};

// Override setTimeout to track timeouts
global.setTimeout = (callback, delay, ...args) => {
  const id = originalSetTimeout(callback, delay, ...args);
  timeouts.add(id);
  return id;
};

// Global setup before all tests
beforeAll(() => {
  console.log('DEBUG: Setting up test environment');
});

// Global cleanup after all tests
afterAll(async () => {
  console.log('DEBUG: Cleaning up after tests');
  
  // Clear all intervals
  intervals.forEach(id => {
    clearInterval(id);
    console.log('DEBUG: Cleared interval');
  });
  intervals.clear();
  
  // Clear all timeouts
  timeouts.forEach(id => {
    clearTimeout(id);
    console.log('DEBUG: Cleared timeout');
  });
  timeouts.clear();
  
  // Restore original functions
  global.setInterval = originalSetInterval;
  global.setTimeout = originalSetTimeout;
  
  console.log('DEBUG: All timers cleared');
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
