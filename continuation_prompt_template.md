# Continuation Prompt Template Implementation

## Continuation Prompt Template Structure (Max 150 tokens):

```markdown
RESUME DEVELOPMENT (150 tokens max)

Current Task: [Component Name]

CRITICAL REQUIREMENTS:
- [2-3 bullet points, 20 tokens each]

NEXT IMPLEMENTATION STEP:
[Concise step description, 40 tokens]

OUTPUT FORMAT:
[Format requirements, 30 tokens]

LOOP PREVENTION:
- Last Processed: [Last completed step]
- Loop Count: [Current loop counter]

PURGED ITEMS:
[Recently purged context, 20 tokens]

DO NOT REPEAT PREVIOUS WORK - START FROM THIS POINT
```

## Example Implementation:

```markdown
RESUME DEVELOPMENT (150 tokens max)

Current Task: error_detection_events

CRITICAL REQUIREMENTS:
- detection_layer must be 1-4 (1 = first line)
- Must implement inline keyboard suggestions
- SALES department excluded from error patterns

NEXT IMPLEMENTATION STEP:
Implement callback_data format rules:
"error:correct:{correction_id}:{transaction_id}"

OUTPUT FORMAT:
- JSON structure for inline_keyboard
- Max 2 buttons per row
- Must include snooze options

LOOP PREVENTION:
- Last Processed: bqml_training_search
- Loop Count: 0

PURGED ITEMS:
- search_intention_patterns implementation details
- bqml_training_search schema details

DO NOT REPEAT PREVIOUS WORK - START FROM THIS POINT
```

## Template Implementation Requirements:
• Must fit within 150 tokens maximum
• Must include all critical sections
• Must be clear and concise
• Must prevent repetition of previous work
• Must include loop prevention tracking
• Must specify purged items