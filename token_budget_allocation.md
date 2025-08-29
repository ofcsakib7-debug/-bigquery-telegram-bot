# TOKEN BUDGET ALLOCATION (150 tokens max)

## Core Principles (50 tokens - 33%)
- "Don't Type, Tap" philosophy: 90% of user interactions require no typing
- Quota Zero Impact: All debugging must consume zero Google Cloud quota
- Partitioning is Non-Negotiable: Every major table must be partitioned
- Cluster for Performance: Use clustering on commonly filtered columns
- Use Appropriate Data Types: INT64, BOOL, DATE instead of STRING
- Nest and Repeat for Efficiency: Denormalize with REPEATED fields
- Never query raw_events or journal tables in user-facing requests
- Check the master_cache first for pre-computed results
- Use BQML for prediction instead of complex business logic
- LOOP PREVENTION: Never reprocess previously completed work

## Active Context (75 tokens - 50%)
- Current Design: 6-7
- Current Phase: 3
- Current Component: search_system_documentation
- Next Implementation Step: Implement search pattern learning
- Critical Dependencies: CORE_PRINCIPLES.md, memory_management.txt
- Token Budget Remaining: 65%
- Loop Prevention: Component Loop Detection

## Ephemeral Data (25 tokens - 17%)
- Previous implementation steps (automatically deleted)
- Redundant information (automatically deleted)
- Completed development details (automatically deleted)
- Loop detection metrics