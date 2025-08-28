# Development Segment Protocol Implementation

## Development Segment Protocol Implementation Requirements:
• Break development into discrete, resume-able segments
• Each segment must fit within token budget
• Must include clear completion criteria
• Must auto-save at segment boundaries
• Must purge old context upon segment completion
• Must detect and break loops within segments

## Segment Definition Rules:
• Maximum size: 75% of Qwen Coder's token limit
• Must focus on one specific UI component or functionality
• Must have clear, testable completion criteria
• Must auto-save upon completion
• Must immediately purge old context upon completion
• Must detect loops within segment
• Must break loops if detected

## Example Segment Definition:

```markdown
## Segment: error_detection_events_buttons

### Objective
Implement button layout for error detection events interface.

### Completion Criteria
- [ ] Callback_data follows exact format requirements
- [ ] Snooze options vary based on error severity
- [ ] All requirements from Design 7, Phase 1 are met

### Token Budget
- Max tokens for implementation: 1,000
- Max tokens for context: 150
- Total budget: 1,150 tokens

### Loop Prevention
- Component Loop Threshold: 2 repetitions
- Output Similarity Threshold: 85%
- Loop Breaker: Progressive Forgetting Protocol

### Auto-Save Points
- After implementing callback_data format
- After adding snooze options
- Upon segment completion

### Purge Targets
- search_intention_patterns implementation details
- bqml_training_search schema details
```

## Development Segment Functions:

```python
def define_development_segment():
    """Define a development segment with clear criteria"""
    # 1. Define segment objective
    objective = define_segment_objective()
    
    # 2. Set completion criteria
    criteria = set_completion_criteria()
    
    # 3. Allocate token budget
    token_budget = allocate_token_budget()
    
    # 4. Set loop prevention parameters
    loop_prevention = set_loop_prevention_parameters()
    
    # 5. Define auto-save points
    auto_save_points = define_auto_save_points()
    
    # 6. Identify purge targets
    purge_targets = identify_purge_targets()
    
    # 7. Return segment definition
    return {
        'objective': objective,
        'criteria': criteria,
        'token_budget': token_budget,
        'loop_prevention': loop_prevention,
        'auto_save_points': auto_save_points,
        'purge_targets': purge_targets
    }

def execute_development_segment(segment_definition):
    """Execute a development segment"""
    # 1. Initialize segment
    initialize_segment(segment_definition)
    
    # 2. Execute implementation steps
    for step in segment_definition['implementation_steps']:
        execute_step(step)
        
        # 3. Check for auto-save point
        if is_auto_save_point(step, segment_definition['auto_save_points']):
            auto_save_progress()
        
        # 4. Monitor token usage
        monitor_token_usage()
        
        # 5. Check for loops
        loop_detection = detect_looping_behavior()
        if loop_detection['loop_detected']:
            break_loop(loop_detection)
    
    # 6. Verify completion criteria
    if verify_completion_criteria(segment_definition['criteria']):
        # 7. Auto-save upon completion
        auto_save_progress()
        
        # 8. Purge old context
        apply_immediate_memory_purge()
        
        # 9. Update progress tracker
        update_progress_tracker()
```