# === PHASE COMPLETION MARKER - DO NOT MODIFY ===
# Design: 5
# Phase: 1
# Component: context_summary
# Status: COMPLETED
# Last Modified: 2025-08-24 12:30 UTC
# Next Step: None - this is the context summary file
# =============================================

# Context Summary (Last 200 Tokens)

## Critical Requirements for Next Step
- Implement payment recording workflow with button-based UI
- "Don't Type, Tap" philosophy - all user interactions via predefined buttons
- Universal snooze functionality at every user interaction point
- Department-specific workflows based on user's department_id in Firestore

## Implementation Constraints
- Never make users type what they can tap - use Telegram's ReplyKeyboardMarkup or InlineKeyboardMarkup
- Maximum 2 buttons per row in button layouts
- Always include snooze options in bottom section of every screen
- Never exceed 64 characters per callback_data

## Data Sources
- Firestore user_profiles collection for department information
- Firestore user_states collection for tracking workflow state
- BigQuery payment_receipts table for payment data
- BigQuery master_cache table for precomputed results

## Expected Output Format
- JSON structure for inline_keyboard with specific button text and callback_data
- Properly formatted BigQuery table schemas with partitioning and clustering
- Department-specific options based on user profile
- Context-aware snooze durations based on time of day