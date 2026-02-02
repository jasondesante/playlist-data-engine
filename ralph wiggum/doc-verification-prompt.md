# Documentation Verification Prompt

Use this prompt to generate a verification checklist for a reference documentation file.

---

## Prompt to Copy/Paste:

```
Please analyze the reference documentation file at [INSERT_FILE_PATH_HERE] and create a comprehensive verification plan consisting of checkbox-organized tasks for validating that every documented item actually exists and is correctly described in the codebase.

Write the verification plan to a file named [DOC_FILENAME]_plan.md in the same directory as the documentation file (e.g., if the doc is DATA_ENGINE_REFERENCE.md, write to DATA_ENGINE_REFERENCE_plan.md).

For the reference documentation, extract and list:

1. **Exported Items** - All functions, classes, constants exported from the package
2. **Namespaces/Modules** - All top-level organizational structures
3. **Classes** - All class definitions with their:
   - Constructor signatures
   - Instance methods
   - Static methods
   - Properties
4. **Interfaces & Types** - All type definitions and interfaces
5. **Functions** - Standalone functions with their signatures
6. **Enums** - All enum definitions and their members
7. **Configuration Options** - All documented config objects and their properties

Structure the output as:

## [Module/Section Name]
- [ ] [ClassName].[methodName]() → [expected file path]
- [ ] [interfaceName].[propertyName] → [expected file path]
- [ ] export const [constantName] → [expected file path]
- [ ] type [TypeName] → [expected file path]

---

For each item, verify:
- [ ] Exists in codebase at expected location
- [ ] Name matches exactly (case-sensitive)
- [ ] Signature/parameters match documentation
- [ ] Exported correctly (export / export default / internal)
- [ ] Type annotations are accurate
- [ ] Any generics or constraints are documented correctly

---

## Notes - Items Requiring Follow-up

Document issues found during verification that need decisions or further investigation:

### Redundancy / Potential Duplicates
(When you find similar functionality in multiple places, note it here - do not attempt to resolve)
- [ ] [Item A] appears similar to [Item B] - [notes]
- [ ] [Function] in [Class] similar to standalone function at [path]
- [ ] Multiple implementations of [functionality] found

### Discrepancies Found
- [ ] [Item] documented but not found in codebase
- [ ] [Item] exists in code but not documented
- [ ] Signature mismatch: [Item] documented as [X] but code shows [Y]
- [ ] Export mismatch: documented as exported but is internal (or vice versa)

### Needs Investigation
- [ ] [Item] - [describe what needs clarification]
```

---

## How to Use:

1. Replace `[INSERT_FILE_PATH_HERE]` with the path to your reference documentation file (e.g., `DATA_ENGINE_REFERENCE.md`)
2. Run the prompt with your AI assistant
3. The plan will be written to `[DOC_FILENAME]_plan.md` in the same directory (e.g., `DATA_ENGINE_REFERENCE_plan.md`)
4. Work through the generated checklist, checking off items as you verify them
5. Add notes to the "Items Requiring Follow-up" section as you go
6. After completing the checklist, review and address the follow-up items
