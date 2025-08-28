# Design 6 & Design 7 Integration

This document describes the integration of Design 6 (Context-Aware Search Validation) and Design 7 (Logical Error Detection) into the BigQuery Telegram Bot system.

## Overview

### Design 6: Context-Aware Search Validation
- Implements a 4-layer validation funnel for search queries
- Provides real-time typo correction and intent refinement
- Operates within Google Cloud free tier limits
- Department-specific validation rules

### Design 7: Logical Error Detection
- Implements a 4-layer logical error detection system
- Prevents department-specific logical inconsistencies
- Uses BQML for pattern recognition
- Operates within Google Cloud free tier limits

## Implementation Details

### Files Created

1. `functions/search_validation.js` - Implementation of Design 6
2. `functions/error_detection.js` - Implementation of Design 7
3. `tests/unit/search_validation.test.js` - Unit tests for Design 6
4. `tests/unit/error_detection.test.js` - Unit tests for Design 7
5. `tests/integration/design6_design7.test.js` - Integration tests
6. `tests/test_design6_design7.js` - Comprehensive tests
7. `.github/workflows/design6-design7-test.yml` - GitHub Actions workflow

### Key Features

#### Design 6 Features:
- Multi-layered validation funnel (syntax, logic, heuristic, semantic)
- Department-specific pattern validation
- Typo correction system with BQML-powered suggestions
- Auto-correction training system
- Validation audit workflow

#### Design 7 Features:
- Department-specific logical error patterns
- Error detection events tracking
- BQML training data infrastructure
- Error pattern recognition model
- Department-specific error cache tables
- Scheduled reconciliation system

## Testing

### Unit Tests
```bash
npm run test:design6
npm run test:design7
```

### Integration Tests
```bash
npm run test:integration
```

### Comprehensive Tests
```bash
npm run test:design6-design7
```

## GitHub Actions

The system includes GitHub Actions workflows that automatically test both Design 6 and Design 7 components on every push or pull request.

### Workflows:
1. `test.yml` - Main test workflow including Design 6 & 7 tests
2. `design6-design7-test.yml` - Dedicated workflow for Design 6 & 7
3. `verify-system.yml` - System verification including Design 6 & 7

## Verification

The system verification script (`tests/system_verification.js`) has been updated to include tests for both Design 6 and Design 7 components.

Run verification with:
```bash
npm run test:verification
```

## Usage

Both systems can be used independently or together:

```javascript
// Design 6: Search validation
const { validate_search_query } = require('./functions/search_validation');
const searchResult = validate_search_query('user123', 'e cm');

// Design 7: Error detection
const { detectLogicalError } = require('./functions/error_detection');
const errorResult = detectLogicalError({
  department: 'FINANCE',
  payment_date: new Date('2023-01-15'),
  transaction_date: new Date('2023-01-10'),
  amount: 1000
});
```

## Performance

Both systems are designed to operate within Google Cloud free tier limits:
- 90% of search queries pass through LAYER 3 without needing deeper validation
- 95% of typo corrections come from the common_corrections cache
- 85% of error detection happens in Layer 1 (zero BigQuery quota)
- 95% of remaining detection happens in Layer 2 (Firestore only)

## Error Handling

Both systems include comprehensive error handling:
- Never show technical error messages to users
- Always provide actionable next steps
- Always fall back to cached results if validation fails
- Always log validation errors to audit workflows