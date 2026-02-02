# Background

This cleanup plan is based on the comprehensive verification work documented in USAGE_IN_OTHER_PROJECTS_plan.md. During that verification, 475+ APIs, types, classes, and functions were systematically checked against USAGE_IN_OTHER_PROJECTS.md documentation.

The items in UIOP_plan_part_2.md represent all discrepancies found between the documentation and actual code. These are NOT bugs - they are documentation inaccuracies, missing exports, or clarification items that need to be resolved. For each item, the verification determined whether the code is correct (docs need update) or the docs are correct (code needs update).

# Task

Study UIOP_plan_part_2.md and pick the first unchecked item in the highest priority list.

For that item:
1. **Research the discrepancy** - Read the actual code at the noted location to understand what exists
2. **Determine the correct action**:
   - If it's a documentation error → Update USAGE_IN_OTHER_PROJECTS.md
   - If it's a missing export → Export the type/class from src/index.ts
   - If it's a code issue (e.g., unused type) → Remove or document appropriately
   - If it says to check other docs first → Check DATA_ENGINE_REFERENCE.md, EQUIPMENT_SYSTEM.md, etc. before making changes
3. **Resolve the discrepancy** - Make the necessary changes to align documentation with code
4. **Verify** - Run `npm run build` to ensure no new bugs were introduced

Write a brief summary of your findings and check off the item in UIOP_plan_part_2.md.

I might add new stuff to the UIOP_plan_part_2.md file based on me monitoring your progress. If you see that, add/edit tasks based on those requests, add new tasks to the list, uncheck tasks that I state need to be done again, and cross out what I wrote to signify you acknowledged my notes.

Take your time doing the tasks, be thorough and do your research. You have all the time in the world.

IMPORTANT:
- DO NOT DELETE node_modules
- DO NOT DELETE package-lock.json
- DO ONE CHECKBOX ITEM AT A TIME
- ALWAYS run `npm run build` after making changes
- ALWAYS verify there are no random errors in the build
- Update UIOP_plan_part_2.md by checking off completed items
- Commit locally when done
- Say "done" when the item is complete
- When all items are complete, say "ITS TIME TO EAT"
