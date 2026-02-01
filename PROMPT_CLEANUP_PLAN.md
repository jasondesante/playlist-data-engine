# Background

This cleanup plan is based on the comprehensive verification work documented in DATA_ENGINE_REFERENCE_plan.md. During that verification process, ~400+ APIs, types, classes, and functions were systematically checked against DATA_ENGINE_REFERENCE.md documentation.

The items in DEF_CLEANUP_PLAN.md represent all discrepancies found between the documentation and actual code. These are NOT bugs - they are documentation inaccuracies that need to be resolved. For each item, the verification determined whether the code is correct (docs need update) or the docs are correct (code needs update).

# Task

Study DEF_CLEANUP_PLAN.md and pick the first unchecked item.

For that item:
1. **Research the discrepancy** - Read the actual code at the noted location to understand what exists
2. **Determine the correct action**:
   - If the note says "Code is correct; documentation needs to be updated" → Update DATA_ENGINE_REFERENCE.md
   - If the note says "Documentation is correct" → The code should be considered the source of truth
   - If it's a "Location mismatch" where docs point to non-existent files → Update DATA_ENGINE_REFERENCE.md with correct locations
3. **Resolve the discrepancy** - Make the necessary changes to align documentation with code
4. **Verify** - Run a build/lint to ensure no new bugs were introduced

Write a brief summary of your findings and check off the item in DEF_CLEANUP_PLAN.md.

IMPORTANT:
- DO NOT DELETE node_modules
- DO NOT DELETE package-lock.json
- DO ONE CHECKBOX ITEM AT A TIME
- ALWAYS run a build/lint after making changes
- ALWAYS verify there are no random errors in the build
- Update DEF_CLEANUP_PLAN.md by checking off completed items
- Commit locally when done
- Say "done" when the item is complete
- When all items are complete, say "ITS TIME TO EAT"