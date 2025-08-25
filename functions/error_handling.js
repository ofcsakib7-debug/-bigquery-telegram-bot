// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 1
// Component: error_handling_retry
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 16:15 UTC
// Next Step: Implement exponential backoff for retries
// =============================================

/**
 * Implement error handling and retry logic for Cloud Functions
 */

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
function withErrorHandling(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in ${fn.name}:`, error);
      
      // Log error details
      logErrorDetails(error, args);
      
      // Return a user-friendly error response
      return {
        success: false,
        error: 'An error occurred while processing your request. Please try again.'
      };
    }
  };
}

/**
 * Log error details for debugging
 * @param {Error} error - Error object
 * @param {Array} args - Function arguments
 */
function logErrorDetails(error, args) {
  try {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      errorMessage: error.message,
      errorStack: error.stack,
      functionName: error.functionName || 'unknown',
      arguments: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      )
    };
    
    console.error('Error details:', JSON.stringify(errorInfo, null, 2));
  } catch (logError) {
    console.error('Error logging error details:', logError);
  }
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Function result
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    jitter = true
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay
      let delay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay);
      
      // Add jitter if requested
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      
      // Wait for the calculated delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Generate user-friendly error message
 * @param {string} errorCode - Error code
 * @param {Object} context - Error context
 * @returns {string} User-friendly error message
 */
function generateUserFriendlyErrorMessage(errorCode, context = {}) {
  const errorMessages = {
    'VALIDATION_ERROR': `❌ Invalid input
    
Please check your input and try again.

✅ *Tips*:
${context.tips || 'Make sure all required fields are filled correctly.'}`,
    
    'PERMISSION_DENIED': `❌ Access denied
    
You don't have permission to perform this action.

✅ *Next steps*:
- Contact your administrator if you believe this is an error
- Check that you're using the correct account`,
    
    'TIMEOUT_ERROR': `❌ Request timeout
    
The request took too long to process.

✅ *Next steps*:
- Try again in a few minutes
- Check your internet connection
- If the problem persists, contact support`,
    
    'RATE_LIMIT_EXCEEDED': `❌ Rate limit exceeded
    
You've made too many requests in a short period.

✅ *Next steps*:
- Wait a few minutes before trying again
- Try to reduce the frequency of your requests`,
    
    'INTERNAL_ERROR': `❌ Internal error
    
Something went wrong on our end.

✅ *Next steps*:
- Try again in a few minutes
- If the problem persists, contact support`
  };
  
  return errorMessages[errorCode] || `❌ An error occurred
    
Please try again later.`;
}

/**
 * Handle Telegram API errors
 * @param {Error} error - Telegram API error
 * @param {string} userId - User ID
 */
async function handleTelegramApiError(error, userId) {
  try {
    console.error(`Telegram API error for user ${userId}:`, error);
    
    // Extract error information
    const errorCode = error.response?.error_code;
    const errorMessage = error.response?.description;
    
    // Handle specific error codes
    switch (errorCode) {
      case 403:
        // Bot was blocked by the user
        console.log(`Bot blocked by user ${userId}`);
        break;
      case 429:
        // Too many requests
        console.log(`Rate limit exceeded for user ${userId}`);
        break;
      case 400:
        // Bad request
        console.log(`Bad request from user ${userId}: ${errorMessage}`);
        break;
      default:
        // Other errors
        console.log(`Unknown Telegram API error for user ${userId}: ${errorCode} - ${errorMessage}`);
    }
  } catch (handlerError) {
    console.error(`Error handling Telegram API error for user ${userId}:`, handlerError);
  }
}

/**
 * Implement circuit breaker pattern
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  /**
   * Execute function with circuit breaker
   * @param {Function} fn - Function to execute
   * @returns {Promise} Function result
   */
  async execute(fn) {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      // Check if reset timeout has passed
      if (this.lastFailureTime && (Date.now() - this.lastFailureTime) > this.resetTimeout) {
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
  
  /**
   * Get circuit breaker status
   * @returns {Object} Circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Export functions and classes
module.exports = {
  withErrorHandling,
  retryWithBackoff,
  generateUserFriendlyErrorMessage,
  handleTelegramApiError,
  CircuitBreaker
};