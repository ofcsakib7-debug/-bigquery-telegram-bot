// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Testing
// Phase: Enhancement
// Component: remarks_functionality_tests
// Status: IN_PROGRESS
// Last Modified: 2025-08-25 12:30 UTC
// Next Step: Implement tests for remarks extraction and storage
// =============================================

// Mock Firestore
jest.mock('@google-cloud/firestore');
const { Firestore } = require('@google-cloud/firestore');
const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  set: jest.fn().mockResolvedValue(),
  update: jest.fn().mockResolvedValue(),
  where: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({
    forEach: jest.fn(),
    docs: []
  })
};
Firestore.mockImplementation(() => mockFirestore);

const {
  extractRemarks,
  storeRemarksForReview,
  generateRemarksConfirmation,
  acknowledgeRemark,
  getPendingRemarksForManager,
  generateManagerReviewMessage
} = require('../../functions/remarks');

describe('Remarks Functionality', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock Firestore methods
    mockFirestore.collection.mockReturnThis();
    mockFirestore.doc.mockReturnThis();
    mockFirestore.set.mockResolvedValue();
    mockFirestore.update.mockResolvedValue();
    mockFirestore.where.mockReturnThis();
    mockFirestore.get.mockResolvedValue({
      forEach: jest.fn(),
      docs: []
    });
  });

  describe('extractRemarks', () => {
    test('should extract single remark from parentheses', () => {
      const input = 'CH-2023-1001 (Payment for urgent order)';
      const result = extractRemarks(input);
      
      expect(result.originalText).toBe(input);
      expect(result.cleanedText).toBe('CH-2023-1001');
      expect(result.remarks).toEqual(['Payment for urgent order']);
      expect(result.hasRemarks).toBe(true);
    });

    test('should extract multiple remarks from parentheses', () => {
      const input = 'CH-2023-1001 (Urgent delivery) CH-2023-1002 (Special discount) (Customer requested)';
      const result = extractRemarks(input);
      
      expect(result.originalText).toBe(input);
      expect(result.cleanedText).toBe('CH-2023-1001  CH-2023-1002');
      expect(result.remarks).toEqual(['Urgent delivery', 'Special discount', 'Customer requested']);
      expect(result.hasRemarks).toBe(true);
    });

    test('should handle input with no remarks', () => {
      const input = 'CH-2023-1001 CH-2023-1002';
      const result = extractRemarks(input);
      
      expect(result.originalText).toBe(input);
      expect(result.cleanedText).toBe(input);
      expect(result.remarks).toEqual([]);
      expect(result.hasRemarks).toBe(false);
    });

    test('should handle empty input', () => {
      const input = '';
      const result = extractRemarks(input);
      
      expect(result.originalText).toBe(input);
      expect(result.cleanedText).toBe(input);
      expect(result.remarks).toEqual([]);
      expect(result.hasRemarks).toBe(false);
    });

    test('should handle malformed parentheses', () => {
      const input = 'CH-2023-1001 (Incomplete remark CH-2023-1002 (Complete remark)';
      const result = extractRemarks(input);
      
      expect(result.originalText).toBe(input);
      expect(result.cleanedText).toBe('CH-2023-1001 (Incomplete remark CH-2023-1002');
      expect(result.remarks).toEqual(['Complete remark']);
      expect(result.hasRemarks).toBe(true);
    });
  });

  describe('storeRemarksForReview', () => {
    test('should store remarks in Firestore for admin review', async () => {
      const userId = '12345';
      const userName = 'Test User';
      const departmentId = 'finance';
      const remarks = ['Urgent delivery', 'Special discount'];
      const context = 'payment_recording';
      
      await storeRemarksForReview(userId, userName, departmentId, remarks, context);
      
      // Verify Firestore calls
      expect(mockFirestore.collection).toHaveBeenCalledWith('remarks_for_review');
      expect(mockFirestore.doc).toHaveBeenCalled();
      expect(mockFirestore.set).toHaveBeenCalledTimes(2);
    });

    test('should handle empty remarks array', async () => {
      const userId = '12345';
      const userName = 'Test User';
      const departmentId = 'finance';
      const remarks = [];
      const context = 'payment_recording';
      
      await storeRemarksForReview(userId, userName, departmentId, remarks, context);
      
      // Verify no Firestore calls were made
      expect(mockFirestore.collection).not.toHaveBeenCalled();
      expect(mockFirestore.doc).not.toHaveBeenCalled();
      expect(mockFirestore.set).not.toHaveBeenCalled();
    });

    test('should handle null remarks', async () => {
      const userId = '12345';
      const userName = 'Test User';
      const departmentId = 'finance';
      const remarks = null;
      const context = 'payment_recording';
      
      await storeRemarksForReview(userId, userName, departmentId, remarks, context);
      
      // Verify no Firestore calls were made
      expect(mockFirestore.collection).not.toHaveBeenCalled();
      expect(mockFirestore.doc).not.toHaveBeenCalled();
      expect(mockFirestore.set).not.toHaveBeenCalled();
    });
  });

  describe('generateRemarksConfirmation', () => {
    test('should generate confirmation message for remarks', () => {
      const remarks = ['Urgent delivery', 'Special discount'];
      const message = generateRemarksConfirmation(remarks);
      
      expect(message).toContain('Remarks Detected');
      expect(message).toContain('1. "Urgent delivery"');
      expect(message).toContain('2. "Special discount"');
      expect(message).toContain('These remarks will be reviewed by your manager(s)');
    });

    test('should return empty string for no remarks', () => {
      const remarks = [];
      const message = generateRemarksConfirmation(remarks);
      
      expect(message).toBe('');
    });

    test('should handle null remarks', () => {
      const remarks = null;
      const message = generateRemarksConfirmation(remarks);
      
      expect(message).toBe('');
    });
  });

  describe('acknowledgeRemark', () => {
    test('should update remark status to acknowledged', async () => {
      const remarkId = 'remark_12345_1234567890_test';
      const managerId = 'manager123';
      
      await acknowledgeRemark(remarkId, managerId);
      
      // Verify Firestore update calls
      expect(mockFirestore.collection).toHaveBeenCalledWith('remarks_for_review');
      expect(mockFirestore.doc).toHaveBeenCalledWith(remarkId);
      expect(mockFirestore.update).toHaveBeenCalledWith({
        status: 'acknowledged',
        acknowledged_at: expect.any(String),
        acknowledged_by: managerId.toString()
      });
    });
  });

  describe('getPendingRemarksForManager', () => {
    test('should retrieve pending remarks for manager', async () => {
      const managerId = 'manager123';
      
      // Mock Firestore response with pending remarks
      mockFirestore.get.mockResolvedValueOnce({
        forEach: (callback) => {
          callback({
            id: 'notification1',
            data: () => ({
              remark_id: 'remark1',
              user_id: 'user123',
              remark_text: 'Test remark',
              submitted_by: 'Test User',
              submitted_at: new Date().toISOString(),
              context: 'payment_recording',
              created_at: new Date().toISOString(),
              status: 'unread'
            })
          });
        },
        docs: [{
          id: 'notification1',
          data: () => ({
            remark_id: 'remark1',
            user_id: 'user123',
            remark_text: 'Test remark',
            submitted_by: 'Test User',
            submitted_at: new Date().toISOString(),
            context: 'payment_recording',
            created_at: new Date().toISOString(),
            status: 'unread'
          })
        }]
      });
      
      const pendingRemarks = await getPendingRemarksForManager(managerId);
      
      expect(pendingRemarks).toHaveLength(1);
      expect(pendingRemarks[0].remark_text).toBe('Test remark');
    });
  });

  describe('generateManagerReviewMessage', () => {
    test('should generate review message for pending remarks', () => {
      const pendingRemarks = [{
        remark_id: 'remark1',
        user_id: 'user123',
        remark_text: 'Test remark',
        submitted_by: 'Test User',
        submitted_at: new Date().toISOString(),
        context: 'payment_recording',
        created_at: new Date().toISOString(),
        status: 'unread'
      }];
      
      const result = generateManagerReviewMessage(pendingRemarks);
      
      expect(result.message).toContain('Pending Remarks for Review');
      expect(result.message).toContain('Test remark');
      expect(result.message).toContain('Test User');
      expect(result.keyboard).toBeDefined();
      expect(result.keyboard.inline_keyboard).toHaveLength(3); // 1 acknowledge button + 2 snooze options
    });

    test('should generate message for no pending remarks', () => {
      const pendingRemarks = [];
      
      const result = generateManagerReviewMessage(pendingRemarks);
      
      expect(result.message).toBe('✅ No pending remarks for review.');
      expect(result.keyboard).toBeNull();
    });
  });
});