/**
 * Department-Specific Validation Patterns
 * 
 * This module implements department-specific validation patterns
 * as specified in Design 8.
 */

/**
 * Validate inventory segment
 * @param {string} segment - The segment to validate
 * @returns {Object} Validation result
 */
function validateInventorySegment(segment) {
  try {
    // Check model code format
    if (!/^[a-z0-9]{2,4}=\d{1,2}$/.test(segment)) {
      return {
        valid: false,
        errorType: 'INVALID_FORMAT',
        errorMessage: "Use format: a2b=2",
        suggestions: [
          "Format: model_code=quantity",
          "Example: a2b=2, e4s=3",
          "Model codes: 2-4 alphanumeric characters",
          "Quantities: 1-2 digit numbers"
        ]
      };
    }
    
    // Check quantity range
    const quantity = parseInt(segment.split('=')[1], 10);
    if (quantity < 1 || quantity > 99) {
      return {
        valid: false,
        errorType: 'INVALID_QUANTITY',
        errorMessage: "Quantity must be between 1-99",
        suggestions: [
          "Quantities must be numbers between 1-99",
          "Example: 1, 2, 15, 99",
          "No decimal points or special characters allowed"
        ]
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating inventory segment:', error);
    return {
      valid: false,
      errorType: 'VALIDATION_ERROR',
      errorMessage: "Error validating segment",
      suggestions: ["Try a different format"]
    };
  }
}

/**
 * Validate admin segment
 * @param {boolean} isAdminUser - Whether the user has admin privileges
 * @param {string} segment - The segment to validate
 * @returns {Object} Validation result
 */
function validateAdminSegment(isAdminUser, segment) {
  try {
    // Check if user has admin privileges
    if (!isAdminUser) {
      return {
        valid: false,
        errorType: 'UNAUTHORIZED',
        errorMessage: "You don't have permission to perform admin actions",
        suggestions: [
          "Contact your administrator for permissions",
          "Return to main menu",
          "Try a different action"
        ]
      };
    }
    
    // Check department name format
    if (segment.startsWith('adddept=')) {
      const deptName = segment.split('=')[1];
      if (!/^[a-zA-Z0-9]+$/.test(deptName)) {
        return {
          valid: false,
          errorType: 'INVALID_DEPT_NAME',
          errorMessage: "Department name must be alphanumeric",
          suggestions: [
            "Department names must be alphanumeric",
            "Example: HR, FINANCE, SALES",
            "No spaces or special characters allowed"
          ]
        };
      }
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating admin segment:', error);
    return {
      valid: false,
      errorType: 'VALIDATION_ERROR',
      errorMessage: "Error validating segment",
      suggestions: ["Try a different format"]
    };
  }
}

/**
 * Validate finance segment
 * @param {string} segment - The segment to validate
 * @returns {Object} Validation result
 */
function validateFinanceSegment(segment) {
  try {
    // Check payment amount format
    if (!/^p=\d{1,4}$/.test(segment)) {
      return {
        valid: false,
        errorType: 'INVALID_FORMAT',
        errorMessage: "Use format: p=5000",
        suggestions: [
          "Format: p=amount",
          "Example: p=5000, p=10000",
          "Amounts: 1-4 digit numbers",
          "No currency symbols or decimal points"
        ]
      };
    }
    
    // Check amount range
    const amount = parseInt(segment.split('=')[1], 10);
    if (amount < 1 || amount > 9999) {
      return {
        valid: false,
        errorType: 'INVALID_AMOUNT',
        errorMessage: "Amount must be between 1-9999",
        suggestions: [
          "Amounts must be numbers between 1-9999",
          "Example: 100, 5000, 9999",
          "No decimal points or special characters allowed"
        ]
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating finance segment:', error);
    return {
      valid: false,
      errorType: 'VALIDATION_ERROR',
      errorMessage: "Error validating segment",
      suggestions: ["Try a different format"]
    };
  }
}

/**
 * Validate service segment
 * @param {string} segment - The segment to validate
 * @returns {Object} Validation result
 */
function validateServiceSegment(segment) {
  try {
    // Check ticket reference format
    if (!/^t=\d{1,4}$/.test(segment)) {
      return {
        valid: false,
        errorType: 'INVALID_FORMAT',
        errorMessage: "Use format: t=123",
        suggestions: [
          "Format: t=ticket_number",
          "Example: t=123, t=4567",
          "Ticket numbers: 1-4 digit numbers",
          "No letters or special characters allowed"
        ]
      };
    }
    
    // Check ticket number range
    const ticketNumber = parseInt(segment.split('=')[1], 10);
    if (ticketNumber < 1 || ticketNumber > 9999) {
      return {
        valid: false,
        errorType: 'INVALID_TICKET',
        errorMessage: "Ticket number must be between 1-9999",
        suggestions: [
          "Ticket numbers must be between 1-9999",
          "Example: 123, 4567, 9999",
          "No letters or special characters allowed"
        ]
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating service segment:', error);
    return {
      valid: false,
      errorType: 'VALIDATION_ERROR',
      errorMessage: "Error validating segment",
      suggestions: ["Try a different format"]
    };
  }
}

/**
 * Validate sales segment
 * @param {string} segment - The segment to validate
 * @returns {Object} Validation result
 */
function validateSalesSegment(segment) {
  try {
    // Check customer and pricing patterns
    if (segment.startsWith('cust=')) {
      const custCode = segment.split('=')[1];
      if (!/^[a-zA-Z0-9]{1,10}$/.test(custCode)) {
        return {
          valid: false,
          errorType: 'INVALID_CUST_FORMAT',
          errorMessage: "Use format: cust=ABC",
          suggestions: [
            "Format: cust=customer_code",
            "Example: cust=ABC, cust=CUST123",
            "Customer codes: 1-10 alphanumeric characters",
            "No spaces or special characters allowed"
          ]
        };
      }
    } else if (segment.startsWith('price=')) {
      const price = parseInt(segment.split('=')[1], 10);
      if (isNaN(price) || price < 1 || price > 99999) {
        return {
          valid: false,
          errorType: 'INVALID_PRICE',
          errorMessage: "Price must be between 1-99999",
          suggestions: [
            "Prices must be numbers between 1-99999",
            "Example: price=250, price=5000",
            "No currency symbols or decimal points"
          ]
        };
      }
    } else {
      return {
        valid: false,
        errorType: 'INVALID_FORMAT',
        errorMessage: "Use format: cust=ABC or price=250",
        suggestions: [
          "Format: cust=customer_code or price=amount",
          "Example: cust=ABC, price=250",
          "Customer codes: 1-10 alphanumeric characters",
          "Prices: 1-5 digit numbers"
        ]
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating sales segment:', error);
    return {
      valid: false,
      errorType: 'VALIDATION_ERROR',
      errorMessage: "Error validating segment",
      suggestions: ["Try a different format"]
    };
  }
}

/**
 * Validate HR segment
 * @param {string} segment - The segment to validate
 * @returns {Object} Validation result
 */
function validateHrSegment(segment) {
  try {
    // Check staff and attendance patterns
    if (segment.startsWith('staff=')) {
      const staffId = segment.split('=')[1];
      if (!/^\d{1,5}$/.test(staffId)) {
        return {
          valid: false,
          errorType: 'INVALID_STAFF_FORMAT',
          errorMessage: "Use format: staff=123",
          suggestions: [
            "Format: staff=staff_id",
            "Example: staff=123, staff=4567",
            "Staff IDs: 1-5 digit numbers",
            "No letters or special characters allowed"
          ]
        };
      }
    } else if (segment.startsWith('att=')) {
      const attendance = segment.split('=')[1].toUpperCase();
      const validAttendance = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'];
      if (!validAttendance.includes(attendance)) {
        return {
          valid: false,
          errorType: 'INVALID_ATTENDANCE',
          errorMessage: "Use format: att=PRESENT",
          suggestions: [
            "Format: att=status",
            "Valid statuses: PRESENT, ABSENT, LATE, LEAVE",
            "Example: att=PRESENT, att=ABSENT",
            "Statuses must be in uppercase"
          ]
        };
      }
    } else {
      return {
        valid: false,
        errorType: 'INVALID_FORMAT',
        errorMessage: "Use format: staff=123 or att=PRESENT",
        suggestions: [
          "Format: staff=staff_id or att=status",
          "Example: staff=123, att=PRESENT",
          "Staff IDs: 1-5 digit numbers",
          "Valid statuses: PRESENT, ABSENT, LATE, LEAVE"
        ]
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating HR segment:', error);
    return {
      valid: false,
      errorType: 'VALIDATION_ERROR',
      errorMessage: "Error validating segment",
      suggestions: ["Try a different format"]
    };
  }
}

/**
 * Validate management segment
 * @param {string} segment - The segment to validate
 * @returns {Object} Validation result
 */
function validateManagementSegment(segment) {
  try {
    // Check reporting patterns
    if (segment.startsWith('rpt=')) {
      const reportType = segment.split('=')[1];
      const validReports = ['sales', 'finance', 'inventory', 'hr', 'service'];
      if (!validReports.includes(reportType)) {
        return {
          valid: false,
          errorType: 'INVALID_REPORT_TYPE',
          errorMessage: "Use format: rpt=sales",
          suggestions: [
            "Format: rpt=report_type",
            "Valid types: sales, finance, inventory, hr, service",
            "Example: rpt=sales, rpt=finance",
            "Report types must be in lowercase"
          ]
        };
      }
    } else if (segment.startsWith('period=')) {
      const period = segment.split('=')[1];
      const validPeriods = ['cm', 'lm', 'lw', 'tw', 'ly'];
      if (!validPeriods.includes(period)) {
        return {
          valid: false,
          errorType: 'INVALID_PERIOD',
          errorMessage: "Use format: period=cm",
          suggestions: [
            "Format: period=period_code",
            "Valid codes: cm, lm, lw, tw, ly",
            "cm = current month, lm = last month",
            "lw = last week, tw = this week, ly = last year"
          ]
        };
      }
    } else {
      return {
        valid: false,
        errorType: 'INVALID_FORMAT',
        errorMessage: "Use format: rpt=sales or period=cm",
        suggestions: [
          "Format: rpt=report_type or period=period_code",
          "Example: rpt=sales, period=cm",
          "Valid report types: sales, finance, inventory, hr, service",
          "Valid period codes: cm, lm, lw, tw, ly"
        ]
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating management segment:', error);
    return {
      valid: false,
      errorType: 'VALIDATION_ERROR',
      errorMessage: "Error validating segment",
      suggestions: ["Try a different format"]
    };
  }
}

// Export functions
module.exports = {
  validateInventorySegment,
  validateAdminSegment,
  validateFinanceSegment,
  validateServiceSegment,
  validateSalesSegment,
  validateHrSegment,
  validateManagementSegment
};