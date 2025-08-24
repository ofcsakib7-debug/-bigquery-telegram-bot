// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 1
// Component: security_features
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 16:00 UTC
// Next Step: Implement KMS encryption for sensitive data
// =============================================

const { KeyManagementServiceClient } = require('@google-cloud/kms');
const { Firestore } = require('@google-cloud/firestore');

// Initialize KMS client
const kmsClient = new KeyManagementServiceClient();

// Initialize Firestore
const firestore = new Firestore();

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = 'global';
const KEY_RING = 'business-operations';
const KEY_NAME = 'sensitive-data-key';

/**
 * Encrypt sensitive data using Google Cloud KMS
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Encrypted data (base64 encoded)
 */
async function encryptSensitiveData(plaintext) {
  try {
    // Construct the key name
    const keyName = kmsClient.cryptoKeyPath(PROJECT_ID, LOCATION, KEY_RING, KEY_NAME);
    
    // Encrypt the plaintext
    const [result] = await kmsClient.encrypt({
      name: keyName,
      plaintext: Buffer.from(plaintext),
    });
    
    // Return base64 encoded encrypted data
    return result.ciphertext.toString('base64');
  } catch (error) {
    console.error('Error encrypting sensitive data:', error);
    throw error;
  }
}

/**
 * Decrypt sensitive data using Google Cloud KMS
 * @param {string} ciphertext - Encrypted data (base64 encoded)
 * @returns {string} Decrypted data
 */
async function decryptSensitiveData(ciphertext) {
  try {
    // Construct the key name
    const keyName = kmsClient.cryptoKeyPath(PROJECT_ID, LOCATION, KEY_RING, KEY_NAME);
    
    // Decrypt the ciphertext
    const [result] = await kmsClient.decrypt({
      name: keyName,
      ciphertext: Buffer.from(ciphertext, 'base64'),
    });
    
    // Return decrypted plaintext
    return result.plaintext.toString();
  } catch (error) {
    console.error('Error decrypting sensitive data:', error);
    throw error;
  }
}

/**
 * Validate user ID against current session
 * @param {string} userId - User ID from request
 * @param {Object} session - Current session data
 * @returns {boolean} True if user ID is valid
 */
function validateUserId(userId, session) {
  try {
    // In a real implementation, we would check against the session
    // For now, we'll just do a basic validation
    return userId && userId.length > 0 && userId === session.userId;
  } catch (error) {
    console.error('Error validating user ID:', error);
    return false;
  }
}

/**
 * Check if user has required role for an action
 * @param {string} userId - User ID
 * @param {string} requiredRole - Required role
 * @returns {boolean} True if user has required role
 */
async function checkUserRole(userId, requiredRole) {
  try {
    // Get user profile from Firestore
    const userDoc = await firestore.collection('user_profiles').doc(userId.toString()).get();
    const userProfile = userDoc.data();
    
    if (!userProfile) {
      return false;
    }
    
    // Check if user has required role or higher
    const userRole = userProfile.role;
    const roleHierarchy = ['user', 'manager', 'admin'];
    
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    
    return userRoleIndex >= requiredRoleIndex;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

/**
 * Sanitize callback data to prevent exposure of sensitive information
 * @param {string} callbackData - Raw callback data
 * @returns {string} Sanitized callback data
 */
function sanitizeCallbackData(callbackData) {
  try {
    // Remove any sensitive information from callback data
    // In a real implementation, we would have specific rules for sanitization
    return callbackData.replace(/(user_id|customer_id|account_number):\d+/g, '$1:REDACTED');
  } catch (error) {
    console.error('Error sanitizing callback data:', error);
    return callbackData;
  }
}

/**
 * Validate input against allowed patterns
 * @param {string} input - Input to validate
 * @param {string} pattern - Allowed pattern (regex)
 * @returns {boolean} True if input matches pattern
 */
function validateInputPattern(input, pattern) {
  try {
    const regex = new RegExp(pattern);
    return regex.test(input);
  } catch (error) {
    console.error('Error validating input pattern:', error);
    return false;
  }
}

/**
 * Get Firestore security rules for user
 * @param {string} userId - User ID
 * @returns {Object} Security rules
 */
async function getFirestoreSecurityRules(userId) {
  try {
    // Get user profile
    const userDoc = await firestore.collection('user_profiles').doc(userId.toString()).get();
    const userProfile = userDoc.data();
    
    if (!userProfile) {
      return {
        read: false,
        write: false,
        delete: false
      };
    }
    
    // Define security rules based on user role
    switch (userProfile.role) {
      case 'admin':
        return {
          read: true,
          write: true,
          delete: true
        };
      case 'manager':
        return {
          read: true,
          write: true,
          delete: false
        };
      case 'user':
      default:
        return {
          read: true,
          write: true,
          delete: false
        };
    }
  } catch (error) {
    console.error('Error getting Firestore security rules:', error);
    return {
      read: false,
      write: false,
      delete: false
    };
  }
}

// Export functions
module.exports = {
  encryptSensitiveData,
  decryptSensitiveData,
  validateUserId,
  checkUserRole,
  sanitizeCallbackData,
  validateInputPattern,
  getFirestoreSecurityRules
};