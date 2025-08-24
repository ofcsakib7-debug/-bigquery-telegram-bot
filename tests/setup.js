// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Testing
// Phase: 1
// Component: test_setup
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 17:15 UTC
// Next Step: Implement unit tests for core functions
// =============================================

// Setup file for Jest tests
console.log('Setting up test environment...');

// Mock Google Cloud services
jest.mock('@google-cloud/bigquery');
jest.mock('@google-cloud/firestore');
jest.mock('@google-cloud/pubsub');
jest.mock('@google-cloud/storage');
jest.mock('@google-cloud/kms');
jest.mock('@google/cloud-errors');

// Mock environment variables
process.env.BOT_TOKEN = 'test-bot-token';
process.env.WEBHOOK_SECRET_TOKEN = 'test-webhook-secret';
process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
process.env.BIGQUERY_DATASET_ID = 'test_dataset';
process.env.PUBSUB_TOPIC_NAME = 'test-topic';

// Mock console.log to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock setTimeout for testing async functions
jest.useFakeTimers();

// Global test setup
beforeAll(() => {
  console.log('Starting test suite...');
});

// Global test teardown
afterAll(() => {
  console.log('Test suite completed.');
});

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset modules before each test
beforeEach(() => {
  jest.resetModules();
});