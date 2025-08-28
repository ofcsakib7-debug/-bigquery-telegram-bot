// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Testing
// Phase: 1
// Component: security_tests
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 18:30 UTC
// Next Step: Implement tests for input validation
// =============================================

// Mock KMS client
jest.mock('@google-cloud/kms');
const { KeyManagementServiceClient } = require('@google-cloud/kms');
const mockKmsClient = {
  cryptoKeyPath: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn()
};
KeyManagementServiceClient.mockImplementation(() => mockKmsClient);

const { 
  encryptSensitiveData, 
  decryptSensitiveData, 
  validateInputPattern,
  sanitizeCallbackData 
} = require('../../../functions/security');

describe('Security Functionality', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Set up environment variable for testing
    process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'test-project';
    
    // Set up KMS client mocks with values that match the implementation
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    mockKmsClient.cryptoKeyPath.mockReturnValue(`projects/${projectId}/locations/global/keyRings/business-operations/cryptoKeys/sensitive-data-key`);
    mockKmsClient.encrypt.mockResolvedValue([{ ciphertext: Buffer.from('encrypted-data') }]);
    mockKmsClient.decrypt.mockResolvedValue([{ plaintext: Buffer.from('decrypted-data') }]);
  });

  describe('encryptSensitiveData', () => {
    test('should encrypt data using KMS', async () => {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'test-project';
      const plaintext = 'sensitive-information';
      const result = await encryptSensitiveData(plaintext);

      // Verify KMS methods were called correctly
      expect(mockKmsClient.cryptoKeyPath).toHaveBeenCalledWith(
        projectId, 
        'global', 
        'business-operations', 
        'sensitive-data-key'
      );
      
      expect(mockKmsClient.encrypt).toHaveBeenCalledWith({
        name: `projects/${projectId}/locations/global/keyRings/business-operations/cryptoKeys/sensitive-data-key`,
        plaintext: Buffer.from(plaintext)
      });

      // Verify result is base64 encoded
      expect(result).toBe('ZW5jcnlwdGVkLWRhdGE=');
    });

    test('should handle encryption errors', async () => {
      // Mock KMS encrypt to throw an error
      mockKmsClient.encrypt.mockRejectedValue(new Error('KMS encryption failed'));

      await expect(encryptSensitiveData('test-data')).rejects.toThrow('KMS encryption failed');
    });
  });

  describe('decryptSensitiveData', () => {
    test('should decrypt data using KMS', async () => {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'test-project';
      const ciphertext = 'ZW5jcnlwdGVkLWRhdGE=';
      const result = await decryptSensitiveData(ciphertext);

      // Verify KMS methods were called correctly
      expect(mockKmsClient.cryptoKeyPath).toHaveBeenCalledWith(
        projectId, 
        'global', 
        'business-operations', 
        'sensitive-data-key'
      );
      
      expect(mockKmsClient.decrypt).toHaveBeenCalledWith({
        name: `projects/${projectId}/locations/global/keyRings/business-operations/cryptoKeys/sensitive-data-key`,
        ciphertext: Buffer.from(ciphertext, 'base64')
      });

      // Verify result
      expect(result).toBe('decrypted-data');
    });

    test('should handle decryption errors', async () => {
      // Mock KMS decrypt to throw an error
      mockKmsClient.decrypt.mockRejectedValue(new Error('KMS decryption failed'));

      await expect(decryptSensitiveData('test-data')).rejects.toThrow('KMS decryption failed');
    });
  });

  describe('validateInputPattern', () => {
    test('should validate correct input pattern', () => {
      const result = validateInputPattern('CH-2023-1001', '^(CH|INV)-\\d{4}-\\d{3,5}$');
      expect(result).toBe(true);
    });

    test('should reject incorrect input pattern', () => {
      const result = validateInputPattern('INVALID-FORMAT', '^(CH|INV)-\\d{4}-\\d{3,5}$');
      expect(result).toBe(false);
    });

    test('should handle invalid regex pattern', () => {
      const result = validateInputPattern('test', '['); // Invalid regex
      expect(result).toBe(false);
    });
  });

  describe('sanitizeCallbackData', () => {
    test('should remove sensitive information from callback data', () => {
      const callbackData = 'action:record_payment:user_id:12345:customer_id:67890';
      const result = sanitizeCallbackData(callbackData);
      expect(result).toBe('action:record_payment:user_id:REDACTED:customer_id:REDACTED');
    });

    test('should handle callback data without sensitive information', () => {
      const callbackData = 'action:record_payment:view_reports';
      const result = sanitizeCallbackData(callbackData);
      expect(result).toBe('action:record_payment:view_reports');
    });

    test('should handle empty callback data', () => {
      const result = sanitizeCallbackData('');
      expect(result).toBe('');
    });
  });
});