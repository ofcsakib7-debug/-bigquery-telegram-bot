# Recovery Protocol Implementation

## Daily Reset, Recovery & Loop Prevention Workflow:
1. Check for interrupted session (Firestore state)
2. If interrupted session found, resume from last saved state
3. If no interrupted session, parse progress_tracker.md
4. Extract critical context from context_summary.md
5. Immediately purge any remaining old context
6. Detect and break any looping behavior
7. Generate continuation prompt using template
8. Begin implementation from specified next step
9. Update all tracking files upon segment completion

## Recovery Functions:

```python
def check_for_interrupted_session():
    """Check for interrupted session in Firestore"""
    # 1. Query Firestore for saved state
    saved_state = query_firestore_for_saved_state()
    
    # 2. Check if state is less than 24 hours old
    if saved_state and is_less_than_24_hours_old(saved_state['timestamp']):
        return saved_state
    
    return None

def resume_from_saved_state(saved_state):
    """Resume development from saved state"""
    # 1. Restore context from saved state
    restore_context(saved_state)
    
    # 2. Generate continuation prompt
    generate_continuation_prompt(saved_state)
    
    # 3. Begin implementation from next step
    begin_implementation(saved_state['next_step'])

def recover_from_progress_tracker():
    """Recover from progress tracker if no saved state"""
    # 1. Parse progress_tracker.md
    progress_data = parse_progress_tracker()
    
    # 2. Extract critical context
    context = extract_critical_context()
    
    # 3. Generate continuation prompt
    generate_continuation_prompt_from_tracker(progress_data, context)
    
    # 4. Begin implementation from next step
    begin_implementation(progress_data['next_step'])

def handle_daily_reset():
    """Handle daily reset and recovery"""
    # 1. Check for interrupted session
    saved_state = check_for_interrupted_session()
    
    if saved_state:
        # 2. Resume from saved state
        resume_from_saved_state(saved_state)
    else:
        # 3. Recover from progress tracker
        recover_from_progress_tracker()
    
    # 4. Purge old context
    apply_immediate_memory_purge()
    
    # 5. Detect and break loops
    loop_detection = detect_looping_behavior()
    if loop_detection['loop_detected']:
        break_loop(loop_detection)
```