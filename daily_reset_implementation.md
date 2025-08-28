# Daily Reset Handling Implementation

## Daily Reset Implementation Requirements:
• Create a protocol that executes when Qwen Coder's memory resets
• Must automatically identify where to resume development
• Must handle both planned daily resets and unexpected interruptions
• Must detect and break looping behavior
• Must minimize token usage while providing sufficient context
• Must immediately purge any remaining old context upon recovery

## Daily Reset Functions:

```python
def execute_daily_reset_protocol():
    """Execute daily reset protocol"""
    # 1. Check for interrupted session
    saved_state = check_for_interrupted_session()
    
    if saved_state:
        # 2. Resume from saved state if available
        resume_from_saved_state(saved_state)
    else:
        # 3. Recover from progress tracker if no saved state
        recover_from_progress_tracker()
    
    # 4. Immediately purge old context
    apply_immediate_memory_purge()
    
    # 5. Detect and break any looping behavior
    loop_detection = detect_looping_behavior()
    if loop_detection['loop_detected']:
        break_loop(loop_detection)
    
    # 6. Log daily reset execution
    log_daily_reset_execution()

def check_for_interrupted_session():
    """Check for interrupted session in Firestore"""
    # Implementation details
    pass

def resume_from_saved_state(saved_state):
    """Resume development from saved state"""
    # Implementation details
    pass

def recover_from_progress_tracker():
    """Recover from progress tracker if no saved state"""
    # Implementation details
    pass

def log_daily_reset_execution():
    """Log daily reset execution"""
    # Implementation details
    pass
```

## Daily Reset, Recovery & Loop Prevention Protocol:

DAILY RESET, RECOVERY & LOOP PREVENTION PROTOCOL (120 tokens max)

1. CHECK for interrupted session:
   - Query Firestore for saved state
   - If found (< 24 hours old), resume from there

2. If no interruption, READ progress_tracker.md:
   - Last Design, Phase, and Component
   - Token Budget Remaining
   - Next Steps
   - Loop Prevention metrics

3. CHECK for looping behavior:
   - Component repetition count
   - Output similarity score
   - Token usage patterns

4. BREAK loops if detected:
   - Force progression to next step
   - Reset loop counters
   - Apply aggressive memory purge

5. IMMEDIATELY PURGE old context:
   - [List of purged items]

6. EXTRACT critical context (max 50 tokens):
   - [3-4 bullet points of essential context]

7. GENERATE continuation prompt:
   "RESUME DEVELOPMENT FROM THIS POINT
    [Concise next step description]"

8. IMPLEMENT ONLY the next development segment
   - Stay within token budget
   - Auto-save regularly
   - Update tracking files upon completion
   - Immediately purge old context upon completion
   - Detect and break loops within segment

DO NOT reprocess previous work
DO NOT ignore token budget limits
ALWAYS auto-save to recover from interruptions
ALWAYS immediately purge old context
ALWAYS detect and break loops