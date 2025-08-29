const { cleanupBigQuery } = require('../bigquery_helper');
// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Testing
// Phase: 1
// Component: microbatching_tests
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 18:15 UTC
// Next Step: Implement tests for batch flushing
// =============================================

// Mock BigQuery
jest.mock('@google-cloud/bigquery');
const { BigQuery } = require('@google-cloud/bigquery');
const mockBigQuery = {
  dataset: jest.fn().mockReturnThis(),
  table: jest.fn().mockReturnThis(),
  insert: jest.fn()
};
BigQuery.mockImplementation(() => mockBigQuery);

const { insertRecord, flushBatch, flushAllBatches } = require('../../bigquery/microbatching');

describe('Microbatching Functionality', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock dataset and table methods
    mockBigQuery.dataset.mockReturnThis();
    mockBigQuery.table.mockReturnThis();
    mockBigQuery.insert.mockResolvedValue();
    
    // Clear batch storage to ensure clean state for each test
    const microbatching = require('../../bigquery/microbatching');
    microbatching.clearAllBatches();
  });

  describe('insertRecord', () => {
    test('should add record to batch with timestamps', async () => {
      // Mock Date for consistent timestamps
      const now = new Date('2023-11-05T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const testRecord = { id: 'test123', name: 'Test Record' };
      insertRecord('test_dataset', 'test_table', testRecord);

      // Verify that timestamps were added
      expect(testRecord.created_at).toBe(now.toISOString());
      expect(testRecord.updated_at).toBe(now.toISOString());

      // Restore real timers
      jest.useRealTimers();
    });

    test('should not overwrite existing timestamps', async () => {
      const existingTimestamp = '2023-11-05T09:00:00Z';
      const testRecord = { 
        id: 'test123', 
        name: 'Test Record',
        created_at: existingTimestamp,
        updated_at: existingTimestamp
      };
      
      insertRecord('test_dataset', 'test_table', testRecord);

      // Verify that existing timestamps were not overwritten
      expect(testRecord.created_at).toBe(existingTimestamp);
      expect(testRecord.updated_at).toBe(existingTimestamp);
    });
  });

  describe('flushBatch', () => {
    test('should insert batch records into BigQuery', async () => {
      // Mock Date for consistent timestamps
      const now = new Date('2023-11-05T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      // Add some records to the batch first
      const testRecord1 = { id: 'test1', name: 'Test Record 1' };
      const testRecord2 = { id: 'test2', name: 'Test Record 2' };
      
      insertRecord('test_dataset', 'test_table', testRecord1);
      insertRecord('test_dataset', 'test_table', testRecord2);

      // Flush the batch
      await flushBatch('test_dataset', 'test_table');

      // Verify BigQuery insert was called with properly timestamped records
      expect(mockBigQuery.dataset).toHaveBeenCalledWith('test_dataset');
      expect(mockBigQuery.table).toHaveBeenCalledWith('test_table');
      
      // Get the actual call arguments
      const insertCall = mockBigQuery.insert.mock.calls[0][0];
      expect(insertCall).toHaveLength(2);
      expect(insertCall[0]).toMatchObject({ 
        id: 'test1', 
        name: 'Test Record 1',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      });
      expect(insertCall[1]).toMatchObject({ 
        id: 'test2', 
        name: 'Test Record 2',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      });

      // Restore real timers
      jest.useRealTimers();
    });

    test('should handle empty batch gracefully', async () => {
      // Try to flush an empty batch
      await flushBatch('test_dataset', 'nonexistent_table');

      // Verify BigQuery insert was not called
      expect(mockBigQuery.insert).not.toHaveBeenCalled();
    });

    test('should handle BigQuery insert errors', async () => {
      // Mock BigQuery insert to throw an error
      mockBigQuery.insert.mockRejectedValue(new Error('BigQuery insert failed'));

      // Add a record to the batch
      const testRecord = { id: 'test1', name: 'Test Record 1' };
      insertRecord('test_dataset', 'test_table', testRecord);

      // Flush the batch - should not throw
      await expect(flushBatch('test_dataset', 'test_table')).resolves.not.toThrow();

      // Verify BigQuery insert was called
      expect(mockBigQuery.insert).toHaveBeenCalled();
    });
  });

  describe('flushAllBatches', () => {
    test('should flush all batches', async () => {
      // Add records to multiple batches
      const testRecord1 = { id: 'test1', name: 'Test Record 1' };
      const testRecord2 = { id: 'test2', name: 'Test Record 2' };
      const testRecord3 = { id: 'test3', name: 'Test Record 3' };
      
      insertRecord('test_dataset', 'test_table1', testRecord1);
      insertRecord('test_dataset', 'test_table1', testRecord2);
      insertRecord('test_dataset', 'test_table2', testRecord3);

      // Flush all batches
      await flushAllBatches();

      // Verify BigQuery insert was called for each table
      expect(mockBigQuery.table).toHaveBeenCalledWith('test_table1');
      expect(mockBigQuery.table).toHaveBeenCalledWith('test_table2');
    });
  });
});
// Cleanup after each test

// Clean up microbatching timers
afterEach(() => {
  // Clear any remaining intervals
  const highestId = setInterval(() => {}, 0);
  for (let i = 0; i < highestId; i++) {
    clearInterval(i);
  }
});
afterEach(async () => {
  await cleanupBigQuery();
});
