# Design 8 Implementation

This directory contains the implementation of Design 8: Multi-Input Command System with Contextual Navigation Prompt for Qwen Coder.

## Overview

The implementation includes:

1. **Multi-Input Command Processing Engine** - Processes multiple data inputs in a single message
2. **Department-Specific Validation** - Validates inputs based on department context
3. **Contextual Action Suggestion Engine** - Provides intelligent navigation through tappable inline keyboards
4. **Admin Management System** - Department and user management functionality
5. **BQML Training Infrastructure** - Machine learning model training for contextual actions
6. **Quota-Saving Implementation** - Optimized BigQuery usage to minimize costs

## Key Components

### BigQuery Schemas
- `command_patterns` - Department-specific command patterns
- `prelisted_items` - Pre-listed items for department-specific input
- `contextual_actions` - Contextual action suggestions
- `admin_management` - Audit log for admin management actions
- `bqml_training_contextual_actions` - Training data for BQML models

### Functions
- `multi_input_processor.js` - Core multi-input command processing
- `contextual_actions.js` - Contextual action suggestion engine
- `admin_management.js` - Admin management functionality
- `department_validations.js` - Department-specific validation logic
- `quota_saving.js` - Quota-saving implementation
- `scheduled_queries.js` - Scheduled query definitions

## Department-Specific Requirements

### INVENTORY
- Multi-model quantity search patterns (e.g., "a2b=2 e4s=3")
- Model code validation (2-4 alphanumeric characters)
- Quantity validation (1-99)

### FINANCE
- Payment amount patterns (e.g., "p=5000")
- Amount validation (1-9999)

### SERVICE
- Ticket reference patterns (e.g., "t=123")
- Ticket number validation (1-9999)

### ADMIN
- Department management patterns (e.g., "adddept=HR")
- Admin privilege validation

### SALES
- Customer and pricing patterns (e.g., "cust=ABC", "price=250")
- Customer code and price validation

### HR
- Staff and attendance patterns (e.g., "staff=123", "att=PRESENT")
- Staff ID and attendance status validation

### MANAGEMENT
- Reporting patterns (e.g., "rpt=sales", "period=cm")
- Report type and period validation

## Implementation Details

### Processing Layers
1. **Layer 1 (Syntax Validation)** - Completes within 5ms, zero BigQuery quota
2. **Layer 2 (Logical Validation)** - Completes within 10ms, zero BigQuery quota
3. **Layer 3 (BQML Anomaly Detection)** - Completes within 200ms, uses pre-aggregated tables

### Inline Keyboard Requirements
- All suggestions presented as tappable inline keyboard options
- Maximum 2 buttons per row
- Callback data format: `ctx:{action_id}:{context_data}`
- 2-4 actionable suggestions per response
- Always include "?? Back to Main Menu" option
- Include snooze options for non-urgent actions

### Quota-Saving Measures
- Partitioning and clustering on all tables
- Approximate functions where exact counts aren't needed
- Limit data scan to 100MB per query
- Scheduled queries with partition filters
- Data expiration policies for all tables

## Scheduled Queries

1. **BQML Training Data Generation** - Daily at 02:00 Asia/Dhaka time
2. **Model Retraining** - Daily at 03:00 Asia/Dhaka time
3. **Data Quality Checks** - Daily data integrity validation

## Data Expiration Policies

- `command_patterns`: 36 months
- `prelisted_items`: 24 months
- `contextual_actions`: 12 months
- `bqml_training_contextual_actions`: 90 days