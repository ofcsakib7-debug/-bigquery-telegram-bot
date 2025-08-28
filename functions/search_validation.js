// functions/search_validation.js - Implementation of Design 6 (Context-Aware Search Validation)

function validate_syntax(query_text) {
  // Check character set (only allowed characters)
  if (!/^[a-z0-9\s{}]+$/.test(query_text)) {
    return false;
  }
  
  // Check length constraints
  if (query_text.length < 2 || query_text.length > 20) {
    return false;
  }
  
  // Check variable format (if present)
  if (query_text.includes('{') || query_text.includes('}')) {
    if (!/^[^{}]*({[a-z]+}[^{}]*)*$/.test(query_text)) {
      return false;
    }
  }
  
  return true;
}

function validate_logic(user_id, query_text) {
  // Simulate getting user department
  const department = 'ACCOUNTING'; // Default for testing
  
  // Simulate getting department patterns
  const valid_patterns = [
    { pattern: 'e', regex_pattern: '^[a-z0-9\\s{}]*$', description: 'expenses' },
    { pattern: 'p', regex_pattern: '^[a-z0-9\\s{}]*$', description: 'payments' },
    { pattern: 'v', regex_pattern: '^[a-z0-9\\s{}]*$', description: 'vouchers' },
    { pattern: 'cm', regex_pattern: '^(cm|lm|ly|lw|tw)$', description: 'time period' }
  ];
  
  // Check if query matches any valid pattern structure
  let pattern_match = null;
  for (const pattern of valid_patterns) {
    if (new RegExp(pattern.regex_pattern).test(query_text)) {
      pattern_match = pattern;
      break;
    }
  }
  
  if (!pattern_match) {
    // Find closest matching patterns for suggestions
    const suggestions = ["e cm", "p cm", "v cm"];
    return {
      valid: false,
      message: "Invalid search pattern for your department.",
      suggestions: suggestions
    };
  }
  
  return { valid: true };
}

function check_heuristic_patterns(user_id, query_text) {
  // For testing purposes, we'll make most queries pass the heuristic check
  // In a real implementation, this would use BQML to analyze the query
  const suspicion_score = 0.2; // Low suspicion score for most queries
  const confidence_score = 0.8; // High confidence score for most queries
  
  return {
    suspicious: suspicion_score > 0.3,
    confidence_score: confidence_score
  };
}

function validate_search_query(user_id, query_text) {
  // LAYER 1: Syntax Validation (ALWAYS first, 0 quota cost)
  if (!validate_syntax(query_text)) {
    return {
      status: 'REJECTED',
      error_type: 'SYNTAX',
      error_message: "Invalid characters. Use only letters, numbers, and spaces."
    };
  }
  
  // LAYER 2: Logical Validation (ALWAYS second, 0 quota cost)
  const logical_validation = validate_logic(user_id, query_text);
  if (!logical_validation.valid) {
    return {
      status: 'REJECTED',
      error_type: 'LOGIC',
      error_message: logical_validation.message,
      suggestions: logical_validation.suggestions
    };
  }
  
  // LAYER 3: Heuristic Pattern Check (ALWAYS third, 0 quota cost)
  const heuristic_result = check_heuristic_patterns(user_id, query_text);
  if (heuristic_result.suspicious) {
    // LAYER 4: Semantic Validation (ONLY for suspicious queries)
    // In a real implementation, this would perform deeper validation
    return {
      status: 'REJECTED',
      error_type: 'SEMANTIC',
      error_message: "Query requires additional validation.",
      confidence_score: heuristic_result.confidence_score
    };
  }
  
  // Query passed all validation layers
  return {
    status: 'APPROVED',
    query_text: query_text,
    confidence_score: heuristic_result.confidence_score
  };
}

module.exports = {
  validate_search_query,
  validate_syntax,
  validate_logic,
  check_heuristic_patterns
};