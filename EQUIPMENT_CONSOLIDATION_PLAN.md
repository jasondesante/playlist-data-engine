# Equipment System Consolidation Plan

## Overview

This plan consolidates all equipment-related constants into a single file and converts `enchantmentLibrary.ts` to a static utility class matching the project's class-based pattern.

**Goal**: Single source of truth for all equipment constants, with class-based functions for easy importing.

---

## User Decisions Applied

1. **Enchantment Structure**: Preserve the organized category structure
   - `WEAPON_ENCHANTMENTS` - individual weapon enchantments
   - `ARMOR_ENCHANTMENTS` - individual armor enchantments
   - `RESISTANCE_ENCHANTMENTS` - individual resistance enchantments
   - `COMBO_ENCHANTMENTS` - special multi-effect enchantments (Holy Avenger, etc.)
   - `CURSES` - all curses
   - `ALL_ENCHANTMENTS` - flattened combination of WEAPON + ARMOR + RESISTANCE + COMBO
   - Rationale: Easier to flatten structured data than to reconstruct structure from flat data

2. **Enchantment Naming**: Remove redundant prefixes
   - **Property names** (for direct access): `ENCHANTMENT_PLUS_ONE` → `plusOne`
   - **IDs** (for lookup, if Task 8 finds no conflicts): `'enchantment_plus_one'` → `'plus_one'`
   - Access: `ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusOne` or `ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS.plusOne`
   - Lookup: `getEnchantment('plus_one')` - simpler without the `enchantment_` prefix

3. **Template Naming**: Use `ITEM_CREATION_TEMPLATES` (more descriptive than `ENCHANTMENT_TEMPLATES`)

4. **CLASS_STARTING_EQUIPMENT**: Move to equipmentConstants.ts, but add thorough research phase first

5. **EnchantmentLibrary Class API**: Use existing functions only, no static properties for direct access
   - Lookup by simplified ID: `EnchantmentLibrary.getEnchantment('plus_one')` - searches ALL_ENCHANTMENTS
   - Direct access: Import `ENCHANTMENT_LIBRARY` from equipmentConstants and access structured categories

---

## Current State Analysis

### Files Involved

| File | Content | Lines |
|------|---------|-------|
| `src/utils/constants.ts` | `EQUIPMENT_DATABASE` (201 items), `CLASS_STARTING_EQUIPMENT` | ~450 |
| `src/utils/magicItemExamples.ts` | `MAGIC_ITEM_EXAMPLES` (34 items), `MAGIC_EQUIPMENT_TEMPLATES` (11 templates), helper functions | ~500 |
| `src/utils/enchantmentLibrary.ts` | 40+ enchantment/curses constants, factory functions, utility functions | ~400 |

### Import Locations (Files That Will Be Updated)

**From `constants.ts`:**
- `src/core/combat/CombatEngine.ts` - Uses `EQUIPMENT_DATABASE`
- `src/core/generation/EquipmentGenerator.ts` - Uses `EQUIPMENT_DATABASE` and `CLASS_STARTING_EQUIPMENT`
- `src/core/extensions/initializeDefaults.ts` - Uses `EQUIPMENT_DATABASE`
- `tests/unit/equipmentGenerator.test.ts` - Uses both constants
- `tests/unit/extensionManager.test.ts` - Uses `EQUIPMENT_DATABASE`

**From `magicItemExamples.ts`:**
- `src/index.ts` - Exports magic item helper functions
- `src/core/equipment/EquipmentSpawnHelper.ts` - Uses `MAGIC_EQUIPMENT_TEMPLATES`

**From `enchantmentLibrary.ts`:**
- `src/index.ts` - Exports enchantment functions (only direct import)

### Test Files to Update

- `tests/unit/equipmentSpawnHelper.test.ts`
- `tests/unit/equipmentGenerator.test.ts`
- `tests/integration/equipmentSystem.integration.test.ts`
- `tests/unit/equipmentModifier.test.ts`
- `tests/unit/equipmentEffectApplier.test.ts`
- `tests/unit/equipmentValidator.test.ts`

---

## Phase 0: Research CLASS_STARTING_EQUIPMENT Dependencies

**Goal**: Ensure moving `CLASS_STARTING_EQUIPMENT` won't break anything. Thoroughly investigate all usages.

### Task 1: Identify all files using CLASS_STARTING_EQUIPMENT
- [x] Search codebase for all imports of `CLASS_STARTING_EQUIPMENT`
- [x] Search for all imports of `getClassStartingEquipment` function
- [x] Document every file that references these exports
- [x] Check for any string-based references (like dynamic property access)

**Files found using CLASS_STARTING_EQUIPMENT:**
1. `src/utils/constants.ts` - Definition (lines 1419-1484, ~65 lines)
2. `src/core/generation/EquipmentGenerator.ts` - Import and usage (line 11)
3. `tests/unit/equipmentGenerator.test.ts` - Import and usage (line 9)
4. `src/index.ts` - Re-export (line 415)

**Files found using getClassStartingEquipment:**
1. `src/utils/constants.ts` - Definition (lines 1625-1656)
2. `src/core/generation/EquipmentGenerator.ts` - Usage (line 116)
3. `src/index.ts` - Re-export (line 424)
4. `tests/documentation/examples-compilation.test.ts` - Import and usage (line 27, 514-515)
5. `specs/001-core-engine/SPEC.md` - Documentation (line 107)
6. `DATA_ENGINE_REFERENCE.md` - Documentation (line 938)
7. `docs/EXTENSIBILITY_GUIDE.md` - Documentation (line 2522-2529)
8. `docs/CUSTOM_CONTENT.md` - Documentation (line 498-506)
9. `tests/integration/part4.templateClassSystem.integration.test.ts` - Import and usage (line 16, 275)
10. `tests/integration/customClasses.integration.test.ts` - Import and usage (line 19, 299)
11. `tests/unit/customClasses.test.ts` - Import and usage (line 20, 454, 484, 1030)

**Dynamic/ExtensionManager category references (not direct imports):**
- `classStartingEquipment.${ClassName}` pattern used in ExtensionManager
- Found in: tests (part4.templateClassSystem, customClasses), documentation (EXTENSIBILITY_GUIDE, CUSTOM_CONTENT)
- These are string-based category registrations, not direct imports

### Task 2: Analyze CLASS_STARTING_EQUIPMENT usage patterns
- [x] Read `src/core/generation/EquipmentGenerator.ts` to understand how it's used
- [x] Check if `CLASS_STARTING_EQUIPMENT` is used during character creation
- [x] Check if it's used during character level-up
- [x] Check if it's used in any serialization/deserialization
- [x] Look for any JSON schema that references this structure

**Usage Analysis:**

1. **Primary Usage** (`EquipmentGenerator.getStartingEquipment()`):
   - Calls `getClassStartingEquipment(characterClass)` helper function
   - Helper first checks `CLASS_STARTING_EQUIPMENT` constant (default classes)
   - Then checks ExtensionManager for `classStartingEquipment.${ClassName}` (custom classes)
   - Returns `{ weapons: string[], armor: string[], items: string[] }` structure

2. **Character Creation**:
   - Used via `EquipmentGenerator.initializeEquipment()` during character creation
   - Sets up initial inventory with weapons, armor, items
   - Adds ammunition programmatically (Arrows, Bolts) based on class weapons

3. **Level-Up**:
   - NOT used during level-up (confirmed by code review)
   - Starting equipment is only assigned at character creation

4. **Serialization/Deserialization**:
   - NOT used in any serialization (confirmed by code review)
   - Character sheets store equipment as `CharacterEquipment` type (weapons/armor/items arrays)
   - No reference back to `CLASS_STARTING_EQUIPMENT` after creation

5. **Structure**:
   ```typescript
   Record<string, {
       weapons: string[];
       armor: string[];
       items: string[];
   }>
   ```
   - 12 default classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard
   - Each class has arrays of equipment item names (strings)

### Task 3: Check for related type dependencies
- [x] Search for TypeScript types that reference the class starting equipment structure
- [x] Check if any interfaces expect the specific property names (`weapons`, `armor`, `items`)
- [x] Look for any validation schemas that validate this structure
- [x] Check for any documentation that describes the structure location

**Type Dependencies Found:**

1. **Internal Interface** (`ClassStartingEquipmentData`):
   - Location: `src/utils/constants.ts:1595`
   - Scope: Internal (not exported), used only by `getClassStartingEquipment()` function
   - Properties: `class: string`, `weapons: string[]`, `armor: string[]`, `items: string[]`
   - Used for ExtensionManager custom class equipment registration

2. **Structure is inline/anonymous**:
   - `CLASS_STARTING_EQUIPMENT` type: `Record<string, { weapons: string[], armor: string[], items: string[] }>`
   - `getClassStartingEquipment()` return type: `{ weapons: string[], armor: string[], items: string[] } | undefined`
   - No named exported type - structure is defined inline

3. **No validation schemas found**:
   - No JSON schemas or validation objects that reference this structure

4. **Documentation**:
   - `DATA_ENGINE_REFERENCE.md:1223` - Documents the function signature
   - `docs/EXTENSIBILITY_GUIDE.md` - Documents how to register custom equipment
   - `docs/CUSTOM_CONTENT.md` - Documents the pattern

**Assessment**: Safe to move. The structure is simple (Record with 3 string arrays), no exported types reference it, and the helper function will move with it.

### Task 4: Check test file dependencies
- [x] Review all test files that use `CLASS_STARTING_EQUIPMENT`
- [x] Check if any tests mock or stub this constant
- [x] Check if any tests rely on the specific location in `constants.ts`
- [x] Document any test fixtures that need updating

**Test Files Analysis:**

1. **`tests/unit/equipmentGenerator.test.ts`**:
   - Imports: `CLASS_STARTING_EQUIPMENT`, `EQUIPMENT_DATABASE` from `constants.js`
   - Usage: Direct comparison tests (line 37, 156), validates equipment structure
   - Mocking: No mocks or stubs - uses actual constant
   - Safe to update: Yes - just change import path

2. **`tests/documentation/examples-compilation.test.ts`**:
   - Imports: `getClassStartingEquipment` from `constants.js`
   - Usage: Compilability test for documentation examples
   - Safe to update: Yes - just change import path

3. **`tests/integration/part4.templateClassSystem.integration.test.ts`**:
   - Imports: `getClassStartingEquipment` from `constants.js`
   - Usage: Tests custom class equipment registration via ExtensionManager
   - Safe to update: Yes - just change import path

4. **`tests/integration/customClasses.integration.test.ts`**:
   - Imports: `getClassStartingEquipment` from `constants.js`
   - Usage: Tests custom class equipment registration
   - Safe to update: Yes - just change import path

5. **`tests/unit/customClasses.test.ts`**:
   - Imports: `getClassStartingEquipment` from `constants.js`
   - Usage: Tests custom class functionality (lines 454, 484, 1030)
   - Safe to update: Yes - just change import path

**No hardcoded paths or location dependencies found** - all imports use module resolution, not file paths.

### Task 5: Check for circular dependency risks
- [x] Verify `equipmentConstants.ts` won't create circular imports
- [x] Check if `constants.ts` imports from equipment-related files
- [x] Ensure import order won't cause initialization issues
- [x] Test import chain manually if needed

**Circular Dependency Analysis:**

1. **`constants.ts` imports**:
   - Types from: `Character.ts`, `SpellTypes.ts`, `Equipment.ts`, `ExtensionManager.ts`
   - Does NOT import from: `equipmentConstants.ts` (doesn't exist yet), `enchantmentLibrary.ts`, `magicItemExamples.ts`
   - ✅ Safe - no existing imports from equipment files

2. **Proposed `equipmentConstants.ts` imports**:
   - Will need: `Equipment` types from `core/types/Equipment.ts`
   - May need: `ExtensionManager` for helper function `getClassStartingEquipment()`
   - ✅ Safe - these are type/utility imports, not circular

3. **Import Chain**:
   - `constants.ts` ← `types/Equipment.ts` (types only)
   - `equipmentConstants.ts` ← `types/Equipment.ts` (types only)
   - `equipmentConstants.ts` ← `extensions/ExtensionManager.ts` (for helper)
   - ✅ No circular dependencies - all imports flow from types/core to constants

**Conclusion**: Creating `equipmentConstants.ts` will NOT create circular dependencies.

### Task 6: Document findings and risks
- [x] Create summary of all files that will be affected
- [x] Identify any high-risk changes
- [x] Document any assumptions about safe moves
- [x] Update this plan if any new files are discovered

**Summary of Affected Files:**

**Core Files (4):**
1. `src/utils/constants.ts` - Remove constant and function definition
2. `src/core/generation/EquipmentGenerator.ts` - Update import
3. `src/index.ts` - Update re-export
4. `src/utils/equipmentConstants.ts` - NEW FILE - Add constant and function

**Test Files (5):**
5. `tests/unit/equipmentGenerator.test.ts` - Update import
6. `tests/documentation/examples-compilation.test.ts` - Update import
7. `tests/integration/part4.templateClassSystem.integration.test.ts` - Update import
8. `tests/integration/customClasses.integration.test.ts` - Update import
9. `tests/unit/customClasses.test.ts` - Update import

**Documentation Files (4):**
10. `specs/001-core-engine/SPEC.md` - Update location reference
11. `DATA_ENGINE_REFERENCE.md` - Update location reference
12. `docs/EXTENSIBILITY_GUIDE.md` - Update location reference
13. `docs/CUSTOM_CONTENT.md` - Update location reference

**Risk Assessment:**
- **Overall Risk**: LOW
- **No circular dependencies** (verified)
- **No runtime lookups by name** (only ExtensionManager category strings)
- **Simple import path changes** (no structural changes to data)
- **No type changes** (structure remains identical)

**High-Risk Changes**: NONE IDENTIFIED

**Assumptions:**
1. Import statements can be updated with find-replace (verified pattern is consistent)
2. The `getClassStartingEquipment()` function can move with the constant
3. `ClassStartingEquipmentData` interface can move or stay (internal, not exported)
4. ExtensionManager category strings (`classStartingEquipment.${ClassName}`) are unaffected

### Task 7: Verify no runtime lookups by name
- [x] Search for any code that accesses constants via string keys
- [x] Check ExtensionManager for any registration of this data
- [x] Look for any configuration files that reference the path
- [x] Check for any dynamic imports that might break

**Runtime Lookup Analysis:**

1. **No string-key access to CLASS_STARTING_EQUIPMENT**:
   - All code uses direct import and object access: `CLASS_STARTING_EQUIPMENT[className]`
   - No `global['CLASS_STARTING_EQUIPMENT']` or similar patterns
   - No `require('constants').CLASS_STARTING_EQUIPMENT` string-based requires

2. **ExtensionManager uses category pattern, not constant name**:
   - Pattern: `manager.register('classStartingEquipment.${ClassName}', data)`
   - This is a registration category, NOT a reference to the constant location
   - The `getClassStartingEquipment()` function reads from these categories
   - ✅ Safe - categories are independent of file location

3. **No configuration files reference the path**:
   - No `.json` or `.yaml` config files found with references
   - No `tsconfig` paths affecting this constant

4. **No dynamic imports**:
   - No `import('constants')` or `require('./constants')` patterns
   - All imports are static ES6 imports

**Conclusion**: No runtime lookups by file path or constant name. Safe to move.

### Task 8: Research enchantment/curse ID references
**Goal**: Check if we can safely simplify IDs by removing `enchantment_` and `curse_` prefixes.
- [x] Search codebase for strings like `'enchantment_plus_one'`
- [x] Search codebase for strings like `'curse_berserker'`
- [x] Check if any saved data (characters, saves, configs) uses these IDs
- [x] Check if any tests reference these IDs directly
- [x] If found: Document them and decide if we need to maintain backward compatibility
- [x] If not found: Safe to simplify IDs (see Task 13 for new ID naming)

**ID Reference Analysis:**

**Found in Documentation (BREAKING - needs update):**
1. `docs/EQUIPMENT_SYSTEM.md:755` - Uses `getEnchantment('enchantment_flaming')`
   - This is user-facing documentation that MUST be updated if we simplify IDs

**Found in Source Code (Internal - will be updated automatically):**
2. `src/utils/enchantmentLibrary.ts` - All enchantment ID definitions (27 IDs with `enchantment_` prefix)
3. `src/utils/enchantmentLibrary.ts` - All curse ID definitions (17 IDs with `curse_` prefix)
4. `src/utils/magicItemExamples.ts` - Uses `target: 'curse_attunement'` (3 occurrences)

**Found in Reference Documentation:**
5. `DATA_ENGINE_REFERENCE.md:2452` - Documents `getEnchantment()` function signature
6. `DATA_ENGINE_REFERENCE.md:2455` - Documents `getCurse()` function signature

**No Saved Data References Found:**
- No character sheets, save files, or config files use these IDs
- IDs are only used in runtime lookup via `getEnchantment()` and `getCurse()`

**Decision: SAFE to simplify IDs with documentation update**

Since there are no saved data dependencies, we can simplify the IDs by removing the `enchantment_` and `curse_` prefixes. We just need to update:
1. `docs/EQUIPMENT_SYSTEM.md` - Update example from `'enchantment_flaming'` to `'flaming'`
2. The plan itself already has the new ID scheme documented

This is a **breaking API change** for external users who call `getEnchantment('enchantment_flaming')`, but since the package is still in development and no external data depends on these IDs, it's acceptable.

---

## Phase 1: Create Consolidated Constants File

**File**: `src/utils/equipmentConstants.ts`

### Task 8: Create file structure and add imports
- [x] Create `src/utils/equipmentConstants.ts`
- [x] Add necessary imports from types and existing files
- [x] Add JSDoc header explaining the file's purpose

### Task 9: Move DEFAULT_EQUIPMENT from constants.ts
- [x] Copy `EQUIPMENT_DATABASE` from `src/utils/constants.ts` (lines 1661-2108, ~450 lines)
- [x] Rename to `DEFAULT_EQUIPMENT`
- [x] Ensure all 201 equipment entries are included
- [x] Verify types match `Equipment` interface

### Task 10: Move CLASS_STARTING_EQUIPMENT from constants.ts
- [x] Copy `CLASS_STARTING_EQUIPMENT` from `src/utils/constants.ts`
- [x] Keep same name and structure
- [x] Include the `getClassStartingEquipment()` helper function
- [x] Verify this is safe based on Phase 0 research

### Task 11: Move MAGIC_ITEMS from magicItemExamples.ts
- [x] Copy `MAGIC_ITEM_EXAMPLES` from `src/utils/magicItemExamples.ts`
- [x] Rename to `MAGIC_ITEMS`
- [x] Ensure all 34 magic items are included
- [x] Verify types match `EnhancedEquipment` interface

### Task 12: Move ITEM_CREATION_TEMPLATES from magicItemExamples.ts
- [x] Copy `MAGIC_EQUIPMENT_TEMPLATES` from `src/utils/magicItemExamples.ts`
- [x] Rename to `ITEM_CREATION_TEMPLATES` (more descriptive than ENCHANTMENT_TEMPLATES)
- [x] Ensure all 9 templates are included:
  - `plus_one_weapon`, `plus_two_weapon`, `plus_three_weapon`
  - `flaming_weapon_template`, `frost_weapon_template`, `shocking_weapon_template`
  - `vicious_weapon_template`
  - `plus_one_armor`, `plus_two_armor`

**Task 12 Summary:**
- Successfully moved 9 templates from magicItemExamples.ts to equipmentConstants.ts
- Note: Plan mentioned 11 templates, but source only contains 9 - verified correct count
- Added comprehensive JSDoc documentation with usage examples
- File compiles without errors
- All 2127 tests pass
- Local commit created; push to remote requires auth

### Task 13: Create ENCHANTMENT_LIBRARY sub-object with renamed constants

**IMPORTANT**: Two types of renaming to do:

1. **Property names** (for access via `ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.xyz`):
   - Remove redundant prefixes, use camelCase
   - Example: `ENCHANTMENT_PLUS_ONE` → `plusOne`

2. **IDs inside each enchantment object** (for lookup via `getEnchantment(id)`):
   - Remove `enchantment_` and `curse_` prefixes (redundant with `ENCHANTMENT_LIBRARY` namespace)
   - Only if Task 8 finds no breaking references
   - Example: `id: 'enchantment_plus_one'` → `id: 'plus_one'`

**Structure to create:**
```typescript
export const ENCHANTMENT_LIBRARY = {
    WEAPON_ENCHANTMENTS: { ... },   // Individual weapon enchantments
    ARMOR_ENCHANTMENTS: { ... },    // Individual armor enchantments
    RESISTANCE_ENCHANTMENTS: { ... }, // Individual resistance enchantments
    COMBO_ENCHANTMENTS: { ... },    // Special multi-effect enchantments (Holy Avenger, etc.)
    CURSES: { ... },                // All curses
    ALL_ENCHANTMENTS: { ... }       // Flattened: WEAPON + ARMOR + RESISTANCE + COMBO
};
```

- [ ] For each enchantment moved, update BOTH the property name AND the internal ID:
  - [ ] Property: `ENCHANTMENT_PLUS_ONE` → `plusOne`
  - [ ] ID: `id: 'enchantment_plus_one'` → `id: 'plus_one'` (if Task 8 confirms safe)

- [ ] Move and rename individual weapon enchantment constants into `ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS` (update both property name AND internal ID):
  - [ ] Enhancement enchantments:
    - [ ] `ENCHANTMENT_PLUS_ONE` → `plusOne` (ID: `'enchantment_plus_one'` → `'plus_one'`)
    - [ ] `ENCHANTMENT_PLUS_TWO` → `plusTwo` (ID: `'enchantment_plus_two'` → `'plus_two'`)
    - [ ] `ENCHANTMENT_PLUS_THREE` → `plusThree` (ID: `'enchantment_plus_three'` → `'plus_three'`)
  - [ ] Elemental enchantments:
    - [ ] `ENCHANTMENT_FLAMING` → `flaming` (ID: `'enchantment_flaming'` → `'flaming'`)
    - [ ] `ENCHANTMENT_FROST` → `frost` (ID: `'enchantment_frost'` → `'frost'`)
    - [ ] `ENCHANTMENT_SHOCKING` → `shocking` (ID: `'enchantment_shocking'` → `'shocking'`)
    - [ ] `ENCHANTMENT_THUNDERING` → `thundering` (ID: `'enchantment_thundering'` → `'thundering'`)
    - [ ] `ENCHANTMENT_ACIDIC` → `acidic` (ID: `'enchantment_acidic'` → `'acidic'`)
    - [ ] `ENCHANTMENT_POISON` → `poison` (ID: `'enchantment_poison'` → `'poison'`)
    - [ ] `ENCHANTMENT_HOLY` → `holy` (ID: `'enchantment_holy'` → `'holy'`)
  - [ ] Special weapon enchantments:
    - [ ] `ENCHANTMENT_VAMPIRIC` → `vampiric` (ID: `'enchantment_vampiric'` → `'vampiric'`)
    - [ ] `ENCHANTMENT_VORPAL_EDGE` → `vorpalEdge` (ID: `'enchantment_vorpal_edge'` → `'vorpal_edge'`)
    - [ ] `ENCHANTMENT_KEEN_EDGE` → `keenEdge` (ID: `'enchantment_keen_edge'` → `'keen_edge'`)
    - [ ] `ENCHANTMENT_MIGHTY` → `mighty` (ID: `'enchantment_mighty'` → `'mighty'`)
    - [ ] `ENCHANTMENT_RETURNING` → `returning` (ID: `'enchantment_returning'` → `'returning'`)
    - [ ] `ENCHANTMENT_LIFESTEALING` → `lifestealing` (ID: `'enchantment_lifestealing'` → `'lifestealing'`)

- [ ] Move and rename individual armor enchantment constants into `ENCHANTMENT_LIBRARY.ARMOR_ENCHANTMENTS` (update both property name AND internal ID):
  - [ ] `ENCHANTMENT_PLUS_ONE_ARMOR` → `plusOne` (ID: `'enchantment_plus_one_armor'` → `'plus_one_armor'`)
  - [ ] `ENCHANTMENT_PLUS_TWO_ARMOR` → `plusTwo` (ID: `'enchantment_plus_two_armor'` → `'plus_two_armor'`)

- [ ] Move and rename individual resistance enchantment constants into `ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS` (update both property name AND internal ID):
  - [ ] `ENCHANTMENT_FIRE_RESISTANCE` → `fire` (ID: `'enchantment_fire_resistance'` → `'fire_resistance'`)
  - [ ] `ENCHANTMENT_COLD_RESISTANCE` → `cold` (ID: `'enchantment_cold_resistance'` → `'cold_resistance'`)
  - [ ] `ENCHANTMENT_LIGHTNING_RESISTANCE` → `lightning` (ID: `'enchantment_lightning_resistance'` → `'lightning_resistance'`)
  - [ ] `ENCHANTMENT_ACID_RESISTANCE` → `acid` (ID: `'enchantment_acid_resistance'` → `'acid_resistance'`)
  - [ ] `ENCHANTMENT_POISON_RESISTANCE` → `poison` (ID: `'enchantment_poison_resistance'` → `'poison_resistance'`)
  - [ ] `ENCHANTMENT_NECROTIC_RESISTANCE` → `necrotic` (ID: `'enchantment_necrotic_resistance'` → `'necrotic_resistance'`)
  - [ ] `ENCHANTMENT_RADIANT_RESISTANCE` → `radiant` (ID: `'enchantment_radiant_resistance'` → `'radiant_resistance'`)
  - [ ] `ENCHANTMENT_THUNDER_RESISTANCE` → `thunder` (ID: `'enchantment_thunder_resistance'` → `'thunder_resistance'`)
  - [ ] `ENCHANTMENT_ALL_RESISTANCE` → `all` (ID: `'enchantment_all_resistance'` → `'all_resistance'`)

- [ ] Move and rename combo enchantments into `ENCHANTMENT_LIBRARY.COMBO_ENCHANTMENTS` (update both property name AND internal ID):
  - [ ] `ENCHANTMENT_HOLY_AVENGER` → `holyAvenger` (ID: `'enchantment_holy_avenger'` → `'holy_avenger'`)
  - [ ] `ENCHANTMENT_DRAGON_SLAYER` → `dragonSlayer` (ID: `'enchantment_dragon_slayer'` → `'dragon_slayer'`)
  - [ ] `ENCHANTMENT_DEMON_HUNTER` → `demonHunter` (ID: `'enchantment_demon_hunter'` → `'demon_hunter'`)
  - [ ] `ENCHANTMENT_UNDEAD_BANE` → `undeadBane` (ID: `'enchantment_undead_bane'` → `'undead_bane'`)

- [ ] Move and rename curse constants into `ENCHANTMENT_LIBRARY.CURSES`:
  - [ ] Penalty curses (update both property name AND internal ID):
    - [ ] `CURSE_MINUS_ONE` → `minusOne` (ID: `'curse_minus_one'` → `'minus_one'`)
    - [ ] `CURSE_MINUS_TWO` → `minusTwo` (ID: `'curse_minus_two'` → `'minus_two'`)
  - [ ] Stat curses:
    - [ ] `CURSE_WEAKNESS` → `weakness` (ID: `'curse_weakness'` → `'weakness'`)
    - [ ] `CURSE_FEEBLEMIND` → `feeblemind` (ID: `'curse_feeblemind'` → `'feeblemind'`)
    - [ ] `CURSE_CLUMSINESS` → `clumsiness` (ID: `'curse_clumsiness'` → `'clumsiness'`)
    - [ ] `CURSE_FRAILTY` → `frailty` (ID: `'curse_frailty'` → `'frailty'`)
    - [ ] `CURSE_FOOLISHNESS` → `foolishness` (ID: `'curse_foolishness'` → `'foolishness'`)
    - [ ] `CURSE_REPULSIVENESS` → `repulsiveness` (ID: `'curse_repulsiveness'` → `'repulsiveness'`)
  - [ ] Vulnerability curses:
    - [ ] `CURSE_FIRE_VULNERABILITY` → `fireVulnerability` (ID: `'curse_fire_vulnerability'` → `'fire_vulnerability'`)
    - [ ] `CURSE_COLD_VULNERABILITY` → `coldVulnerability` (ID: `'curse_cold_vulnerability'` → `'cold_vulnerability'`)
  - [ ] Special curses:
    - [ ] `CURSE_LIFESTEAL` → `lifesteal` (ID: `'curse_lifesteal'` → `'lifesteal'`)
    - [ ] `CURSE_ATTUNEMENT` → `attunement` (ID: `'curse_attunement'` → `'attunement'`)
    - [ ] `CURSE_BERSERKER` → `berserker` (ID: `'curse_berserker'` → `'berserker'`)
    - [ ] `CURSE_HEAVY_BURDEN` → `heavyBurden` (ID: `'curse_heavy_burden'` → `'heavy_burden'`)
    - [ ] `CURSE_LIGHT_SENSITIVITY` → `lightSensitivity` (ID: `'curse_light_sensitivity'` → `'light_sensitivity'`)
    - [ ] `CURSE_INVISIBILITY` → `invisibility` (ID: `'curse_invisibility'` → `'invisibility'`)
    - [ ] `CURSE_HALLUCINATIONS` → `hallucinations` (ID: `'curse_hallucinations'` → `'hallucinations'`)
    - [ ] `CURSE_BLOOD_MONEY` → `bloodMoney` (ID: `'curse_blood_money'` → `'blood_money'`)

- [ ] Create `ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS` as flattened combination:
  - [ ] Use spread operator: `...WEAPON_ENCHANTMENTS`
  - [ ] Use spread operator: `...ARMOR_ENCHANTMENTS`
  - [ ] Use spread operator: `...RESISTANCE_ENCHANTMENTS`
  - [ ] Use spread operator: `...COMBO_ENCHANTMENTS`
  - [ ] This provides a flat object when you don't care about categories
  - [ ] Preserves structured categories in the sub-objects above

### Task 14: Add named exports
- [ ] Export `DEFAULT_EQUIPMENT`
- [ ] Export `CLASS_STARTING_EQUIPMENT`
- [ ] Export `getClassStartingEquipment`
- [ ] Export `MAGIC_ITEMS`
- [ ] Export `ITEM_CREATION_TEMPLATES`
- [ ] Export `ENCHANTMENT_LIBRARY`

### Task 15: Verify file compiles
- [ ] Run `tsc --noEmit` to check for type errors
- [ ] Fix any import or type issues

---

## Phase 2: Update Import References in Core Files

### Task 16: Update src/utils/constants.ts
- [ ] Remove `EQUIPMENT_DATABASE` constant (lines 1661-2108)
- [ ] Remove `CLASS_STARTING_EQUIPMENT` constant
- [ ] Remove `getClassStartingEquipment()` function
- [ ] Add comment indicating equipment moved to equipmentConstants.ts
- [ ] Keep all other constants (SPELL_DATABASE, DEFAULT_FEATURES, ability scores, etc.)

### Task 17: Update src/core/combat/CombatEngine.ts
- [ ] Change import from `import { EQUIPMENT_DATABASE } from '../../utils/constants'`
- [ ] To: `import { DEFAULT_EQUIPMENT } from '../../utils/equipmentConstants'`
- [ ] Update any references from `EQUIPMENT_DATABASE` to `DEFAULT_EQUIPMENT`

### Task 18: Update src/core/generation/EquipmentGenerator.ts
- [ ] Change imports from `constants.ts`:
  - [ ] `EQUIPMENT_DATABASE` → `DEFAULT_EQUIPMENT`
  - [ ] `CLASS_STARTING_EQUIPMENT` → (keep same name)
- [ ] Update source file to `equipmentConstants.ts`
- [ ] Verify all references updated

### Task 19: Update src/core/extensions/initializeDefaults.ts
- [ ] Change import from `constants.ts`
- [ ] To: `equipmentConstants.ts`
- [ ] Update `EQUIPMENT_DATABASE` → `DEFAULT_EQUIPMENT`

### Task 20: Update src/core/equipment/EquipmentSpawnHelper.ts
- [ ] Change import from `magicItemExamples.ts`
- [ ] To: `equipmentConstants.ts`
- [ ] Update `MAGIC_EQUIPMENT_TEMPLATES` → `ITEM_CREATION_TEMPLATES`

### Task 21: Update test files
- [ ] Update `tests/unit/equipmentGenerator.test.ts`:
  - [ ] Change imports to use `equipmentConstants.ts`
  - [ ] Update `EQUIPMENT_DATABASE` → `DEFAULT_EQUIPMENT`
  - [ ] Update `CLASS_STARTING_EQUIPMENT` reference

- [ ] Update `tests/unit/extensionManager.test.ts`:
  - [ ] Change import to use `equipmentConstants.ts`
  - [ ] Update `EQUIPMENT_DATABASE` → `DEFAULT_EQUIPMENT`

- [ ] Update `tests/unit/equipmentSpawnHelper.test.ts`:
  - [ ] Change imports to use `equipmentConstants.ts`
  - [ ] Update template references to `ITEM_CREATION_TEMPLATES`

- [ ] Update `tests/integration/equipmentSystem.integration.test.ts`:
  - [ ] Review for any equipment constant imports
  - [ ] Update as needed

- [ ] Update `tests/unit/equipmentModifier.test.ts`:
  - [ ] Review for any enchantment library imports
  - [ ] Update as needed

- [ ] Update `tests/unit/equipmentEffectApplier.test.ts`:
  - [ ] Review for any equipment constant imports
  - [ ] Update as needed

- [ ] Update `tests/unit/equipmentValidator.test.ts`:
  - [ ] Review for any equipment constant imports
  - [ ] Update as needed

### Task 22: Verify all imports
- [ ] Run `tsc --noEmit` to check for type errors
- [ ] Search for any remaining imports from old locations:
  - [ ] Search for `from './constants'` with `EQUIPMENT_DATABASE`
  - [ ] Search for `from './magicItemExamples'`
  - [ ] Search for `from './enchantmentLibrary'`
- [ ] Fix any remaining references

---

## Phase 3: Refactor enchantmentLibrary to EnchantmentLibrary Class

### Task 23: Rename file and create class structure
- [ ] Rename `src/utils/enchantmentLibrary.ts` to `src/utils/EnchantmentLibrary.ts`
- [ ] Create `export class EnchantmentLibrary` with static methods
- [ ] Add JSDoc class documentation

### Task 24: Move constants out and import from equipmentConstants.ts
- [ ] Remove all individual enchantment constants (now in equipmentConstants.ts)
- [ ] Remove all curse constants (now in equipmentConstants.ts)
- [ ] Remove all collection constants (now in equipmentConstants.ts)
- [ ] Add import: `import { ENCHANTMENT_LIBRARY as ENCHANTMENT_CONSTANTS } from './equipmentConstants.js'`

### Task 25: Convert factory functions to static methods
- [ ] Convert `createStrengthEnchantment(bonus)` to static method
- [ ] Convert `createDexterityEnchantment(bonus)` to static method
- [ ] Convert `createConstitutionEnchantment(bonus)` to static method
- [ ] Convert `createIntelligenceEnchantment(bonus)` to static method
- [ ] Convert `createWisdomEnchantment(bonus)` to static method
- [ ] Convert `createCharismaEnchantment(bonus)` to static method

### Task 26: Convert utility functions to static methods

**IMPORTANT**: These functions now use the structured ENCHANTMENT_LIBRARY with categories (WEAPON_ENCHANTMENTS, ARMOR_ENCHANTMENTS, RESISTANCE_ENCHANTMENTS, COMBO_ENCHANTMENTS, CURSES) and flattened ALL_ENCHANTMENTS.

**Key insight**: Keep the structure - it's easier to flatten than to reconstruct. Access pattern:
- Structured: `ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusOne`
- Flat: `ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS.plusOne`
- Lookup: `EnchantmentLibrary.getEnchantment('enchantment_plus_one')` (searches ALL_ENCHANTMENTS)

- [ ] Convert `getEnchantment(id)` to static method
  - [ ] Update to read from `ENCHANTMENT_CONSTANTS.ALL_ENCHANTMENTS`
  - [ ] Note: ID lookup uses original IDs (e.g., `getEnchantment('enchantment_plus_one')`)
  - [ ] Returns the first matching enchantment from the flat collection

- [ ] Convert `getCurse(id)` to static method
  - [ ] Update to read from `ENCHANTMENT_CONSTANTS.CURSES`
  - [ ] Note: ID lookup uses original IDs (e.g., `getCurse('curse_berserker')`)

- [ ] Convert `getAllEnchantments()` to static method
  - [ ] Update to read from `ENCHANTMENT_CONSTANTS.ALL_ENCHANTMENTS`
  - [ ] Returns all enchantments as an array (weapon, armor, resistance, combo)

- [ ] Convert `getAllCurses()` to static method
  - [ ] Update to read from `ENCHANTMENT_CONSTANTS.CURSES`

- [ ] Convert `getEnchantmentsByType(type)` to static method
  - [ ] Update to read from `ENCHANTMENT_CONSTANTS` structured categories
  - [ ] `type: 'weapon'` → `ENCHANTMENT_CONSTANTS.WEAPON_ENCHANTMENTS`
  - [ ] `type: 'armor'` → `ENCHANTMENT_CONSTANTS.ARMOR_ENCHANTMENTS`
  - [ ] `type: 'resistance'` → `ENCHANTMENT_CONSTANTS.RESISTANCE_ENCHANTMENTS`
  - [ ] `type: 'combo'` → `ENCHANTMENT_CONSTANTS.COMBO_ENCHANTMENTS`

### Task 27: Verify class compiles
- [ ] Run `tsc --noEmit` to check for type errors
- [ ] Ensure all static methods are properly typed

---

## Phase 4: Update Public API and Clean Up

### Task 28: Update src/index.ts exports
- [ ] Update equipment-related imports:
  - [ ] Change from `constants.ts` to `equipmentConstants.ts` where needed
  - [ ] Change from `enchantmentLibrary.ts` to `EnchantmentLibrary.ts`
  - [ ] Change from `magicItemExamples.ts` to `equipmentConstants.ts` (for constants)

- [ ] Update public API exports:
  - [ ] Export `DEFAULT_EQUIPMENT` (was `EQUIPMENT_DATABASE`)
  - [ ] Export `CLASS_STARTING_EQUIPMENT`
  - [ ] Export `MAGIC_ITEMS` (was `MAGIC_ITEM_EXAMPLES`)
  - [ ] Export `ITEM_CREATION_TEMPLATES` (was `MAGIC_EQUIPMENT_TEMPLATES`)
  - [ ] Export `ENCHANTMENT_LIBRARY`
  - [ ] Export `EnchantmentLibrary` class
  - [ ] Keep all function exports (factory functions now accessed via class)

- [ ] Update factory function exports to use class:
  - [ ] `createStrengthEnchantment` → `EnchantmentLibrary.createStrengthEnchantment`
  - [ ] `createDexterityEnchantment` → `EnchantmentLibrary.createDexterityEnchantment`
  - [ ] `createConstitutionEnchantment` → `EnchantmentLibrary.createConstitutionEnchantment`
  - [ ] `createIntelligenceEnchantment` → `EnchantmentLibrary.createIntelligenceEnchantment`
  - [ ] `createWisdomEnchantment` → `EnchantmentLibrary.createWisdomEnchantment`
  - [ ] `createCharismaEnchantment` → `EnchantmentLibrary.createCharismaEnchantment`

### Task 29: Clean up magicItemExamples.ts
- [ ] Remove all constants (moved to equipmentConstants.ts)
- [ ] Keep helper functions: `getMagicItem`, `getMagicItemsByType`, `getMagicItemsByRarity`, `getCursedItems`, `getItemsWithProperty`, `applyTemplate`
- [ ] Update functions to import from `equipmentConstants.ts`
- [ ] Add file documentation explaining it now only contains helper functions

### Task 30: Verify backward compatibility
- [ ] Run `tsc --noEmit` to ensure no breaking type errors
- [ ] Check that commonly-used exports are still accessible
- [ ] Document any breaking changes in API

---

## Phase 5: Testing and Verification

### Task 31: Type checking
- [ ] Run `tsc --noEmit` - should have 0 errors
- [ ] Fix any type errors that appear

### Task 32: Run equipment tests
- [ ] Run `tests/unit/equipmentGenerator.test.ts`
- [ ] Run `tests/unit/equipmentSpawnHelper.test.ts`
- [ ] Run `tests/unit/equipmentModifier.test.ts`
- [ ] Run `tests/unit/equipmentEffectApplier.test.ts`
- [ ] Run `tests/unit/equipmentValidator.test.ts`
- [ ] Run `tests/integration/equipmentSystem.integration.test.ts`
- [ ] Fix any failing tests

### Task 33: Run all tests
- [ ] Run full test suite
- [ ] Fix any failures related to import changes

### Task 34: Manual verification
- [ ] Verify equipment can be generated from DEFAULT_EQUIPMENT
- [ ] Verify magic items can be retrieved from MAGIC_ITEMS
- [ ] Verify item creation templates can be applied
- [ ] Verify enchantments can be created via EnchantmentLibrary class
- [ ] Verify curses can be created via EnchantmentLibrary class

**Structured access verification (categories preserved):**
- [ ] Test weapon enchantment: `ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusOne`
- [ ] Test armor enchantment: `ENCHANTMENT_LIBRARY.ARMOR_ENCHANTMENTS.plusOne`
- [ ] Test resistance enchantment: `ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.fire`
- [ ] Test combo enchantment: `ENCHANTMENT_LIBRARY.COMBO_ENCHANTMENTS.holyAvenger`
- [ ] Test curse: `ENCHANTMENT_LIBRARY.CURSES.berserker`
- [ ] Test flat access: `ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS.plusOne`

**Simplified ID lookup verification:**
- [ ] Test lookup: `EnchantmentLibrary.getEnchantment('plus_one')` → finds weapon +1
- [ ] Test lookup: `EnchantmentLibrary.getEnchantment('plus_one_armor')` → finds armor +1
- [ ] Test lookup: `EnchantmentLibrary.getEnchantment('berserker')` → finds curse
- [ ] Test by type: `EnchantmentLibrary.getEnchantmentsByType('weapon')`

### Task 35: Documentation updates
- [ ] Update EQUIPMENT_SYSTEM.md if it references old file locations
- [ ] Update any other documentation that references the old structure
- [ ] Add migration notes for any external consumers

---

## Summary of Changes

### Files Created
- `src/utils/equipmentConstants.ts` - Consolidated equipment constants

### Files Modified
- `src/utils/constants.ts` - Remove equipment constants
- `src/utils/magicItemExamples.ts` - Remove constants, update imports
- `src/utils/enchantmentLibrary.ts` → `src/utils/EnchantmentLibrary.ts` - Convert to class
- `src/index.ts` - Update public API exports
- `src/core/combat/CombatEngine.ts` - Update imports
- `src/core/generation/EquipmentGenerator.ts` - Update imports
- `src/core/extensions/initializeDefaults.ts` - Update imports
- `src/core/equipment/EquipmentSpawnHelper.ts` - Update imports
- 6 test files - Update imports

### New Import Patterns

```typescript
// Old
import { EQUIPMENT_DATABASE } from './utils/constants';
import { MAGIC_ITEM_EXAMPLES, MAGIC_EQUIPMENT_TEMPLATES } from './utils/magicItemExamples';
import { ENCHANTMENT_PLUS_ONE, createStrengthEnchantment } from './utils/enchantmentLibrary';

// New
import {
  DEFAULT_EQUIPMENT,
  MAGIC_ITEMS,
  ITEM_CREATION_TEMPLATES,
  ENCHANTMENT_LIBRARY
} from './utils/equipmentConstants';
import { EnchantmentLibrary } from './utils/EnchantmentLibrary';

// Usage
const item = DEFAULT_EQUIPMENT['Longsword'];
const magicItem = MAGIC_ITEMS.find(i => i.name === 'Flame Tongue');
const template = ITEM_CREATION_TEMPLATES['plus_one_weapon'];

// Access enchantments by category (structured - preserves organization)
const plusOne = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusOne;
const plusOneArmor = ENCHANTMENT_LIBRARY.ARMOR_ENCHANTMENTS.plusOne;
const fireResist = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.fire;
const holyAvenger = ENCHANTMENT_LIBRARY.COMBO_ENCHANTMENTS.holyAvenger;
const berserkerCurse = ENCHANTMENT_LIBRARY.CURSES.berserker;

// Or access ALL enchantments flat (when category doesn't matter)
const allEnchantments = ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS; // flattened

// Or use lookup functions (from class)
const enchantment = EnchantmentLibrary.getEnchantment('plus_one');  // searches ALL_ENCHANTMENTS by simplified ID
const weaponEnchantments = EnchantmentLibrary.getEnchantmentsByType('weapon');
const statEnchantment = EnchantmentLibrary.createStrengthEnchantment(2);
```

### ENCHANTMENT_LIBRARY Structure

```typescript
ENCHANTMENT_LIBRARY = {
  // Organized by category (preserves structure)
  WEAPON_ENCHANTMENTS: { plusOne, plusTwo, plusThree, flaming, frost, ... },
  ARMOR_ENCHANTMENTS: { plusOne, plusTwo },
  RESISTANCE_ENCHANTMENTS: { fire, cold, lightning, acid, ... },
  COMBO_ENCHANTMENTS: { holyAvenger, dragonSlayer, demonHunter, undeadBane },
  CURSES: { minusOne, berserker, weakness, ... },

  // Flattened (combines all above except CURSES)
  ALL_ENCHANTMENTS: { ...WEAPON_ENCHANTMENTS, ...ARMOR_ENCHANTMENTS,
                      ...RESISTANCE_ENCHANTMENTS, ...COMBO_ENCHANTMENTS }
}
```

### Enchantment Naming Changes

| Old Name | New Name | Access Pattern |
|----------|----------|----------------|
| `ENCHANTMENT_PLUS_ONE` | `plusOne` | `ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusOne` |
| `ENCHANTMENT_PLUS_ONE_ARMOR` | `plusOne` | `ENCHANTMENT_LIBRARY.ARMOR_ENCHANTMENTS.plusOne` |
| `ENCHANTMENT_FLAMING` | `flaming` | `ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.flaming` |
| `ENCHANTMENT_FIRE_RESISTANCE` | `fire` | `ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.fire` |
| `ENCHANTMENT_HOLY_AVENGER` | `holyAvenger` | `ENCHANTMENT_LIBRARY.COMBO_ENCHANTMENTS.holyAvenger` |
| `CURSE_BERSERKER` | `berserker` | `ENCHANTMENT_LIBRARY.CURSES.berserker` |
| `CURSE_WEAKNESS` | `weakness` | `ENCHANTMENT_LIBRARY.CURSES.weakness` |

**Note on `plusOne` naming conflict**: Both `WEAPON_ENCHANTMENTS.plusOne` and `ARMOR_ENCHANTMENTS.plusOne` exist, but they're in **different objects** so there's no conflict. They have different IDs:
- Weapon: `{ id: 'plus_one', ... }`
- Armor: `{ id: 'plus_one_armor', ... }`

**Lookup works by simplified ID, not property name**:
- `EnchantmentLibrary.getEnchantment('plus_one')` → finds weapon +1
- `EnchantmentLibrary.getEnchantment('plus_one_armor')` → finds armor +1
- Direct access by category: `ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusOne` vs `ENCHANTMENT_LIBRARY.ARMOR_ENCHANTMENTS.plusOne`

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking external consumers' imports | Medium | Comprehensive export updates in index.ts |
| Test failures from import changes | Low | Systematic test file updates |
| Type errors from renamed constants | Low | Type checking between phases |
| Missing constant during move | Low | Checklist for each constant group |
| CLASS_STARTING_EQUIPMENT breaking something | Medium | Phase 0 research before move |
| Enchantment structure confusion | Low | Preserving WEAPON/ARMOR/RESISTANCE/COMBO categories + ALL_ENCHANTMENTS flat |
| ID changes breaking saved data | Medium | Task 8 research - if found, consider backward compatibility layer |
| ID lookup breaking | Low | Lookup functions updated to use new simplified IDs |

---

## Completion Criteria

**Phase 0 (Research):**
- [x] All files using `CLASS_STARTING_EQUIPMENT` identified
- [x] Usage patterns documented
- [x] No circular dependencies or runtime lookups found

**Phase 1 (Create Constants File):**
- [ ] All equipment constants in `equipmentConstants.ts`
- [ ] ENCHANTMENT_LIBRARY structure created with categories: WEAPON_ENCHANTMENTS, ARMOR_ENCHANTMENTS, RESISTANCE_ENCHANTMENTS, COMBO_ENCHANTMENTS, CURSES
- [ ] ALL_ENCHANTMENTS provided as flattened combination
- [ ] Enchantments use camelCase naming (e.g., `plusOne`, `flaming`, `fireResist`)
- [ ] File compiles without errors

**Phase 2 (Update Imports):**
- [ ] All core files updated with new imports
- [ ] All test files updated
- [ ] No remaining references to old import paths

**Phase 3 (Refactor EnchantmentLibrary):**
- [ ] `enchantmentLibrary.ts` converted to `EnchantmentLibrary` class
- [ ] All methods work with structured categories (WEAPON_ENCHANTMENTS, etc.)
- [ ] `getEnchantment()` searches ALL_ENCHANTMENTS using simplified IDs (e.g., `'plus_one'`, `'berserker'`)
- [ ] `getEnchantmentsByType()` returns from appropriate category

**Phase 4 (Public API):**
- [ ] `src/index.ts` exports updated
- [ ] Public API uses `ITEM_CREATION_TEMPLATES` name
- [ ] Backward compatibility verified

**Phase 5 (Testing):**
- [ ] All tests passing
- [ ] Type checking passes with 0 errors
- [ ] Documentation updated
