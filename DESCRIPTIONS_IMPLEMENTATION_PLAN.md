# Description System Implementation Plan

## 1. Executive Summary
The goal is to ensure every entity in the Playlist Data Engine (Items, Spells, Skills, Features, Classes, Races) possesses a user-facing `description` field. This document organizes the work into clear phases.

## 2. Implementation Phases

### Phase 1: Interfaces & Schema Updates
This phase focuses on updating the TypeScript interfaces to support the `description` field.

#### Task 1:

- [x] **Races**: Update `RaceDataEntry` in `src/utils/constants.ts` to include `description?: string`.
- [x] **Classes**: Update `ClassDataEntry` in `src/utils/constants.ts` to include `description?: string`.
- [x] **Equipment**: Update `Equipment` interface in `src/utils/constants.ts` to include `description?: string`.
    *   *Note*: `EnhancedEquipment` in `src/core/types/Equipment.ts` inherits from this, so it will automatically get the field.
- [x] **Enchantments**: Update `EquipmentModification` interface in `src/core/types/Equipment.ts` to include `description?: string`.

### Phase 2: File Organization
To prevent `constants.ts` and `equipmentConstants.ts` from becoming unmanageable, we will move the large data objects to dedicated files in a new `src/constants` directory. This phase is broken down by data type, with specific tasks to update importing files.

#### Task 2: Equipment
- [x] Move `DEFAULT_EQUIPMENT` from `src/utils/equipmentConstants.ts` to `src/constants/DefaultEquipment.ts`.
- [x] Update imports in:
    - [x] `src/utils/equipmentConstants.ts` (re-export or remove)
    - [x] `src/core/generation/EquipmentGenerator.ts` - No changes needed, imports from equipmentConstants.ts which re-exports
    - [x] `src/core/combat/CombatEngine.ts` - No changes needed, imports from equipmentConstants.ts which re-exports
    - [x] `src/core/extensions/initializeDefaults.ts` - No changes needed, imports from equipmentConstants.ts which re-exports
    - [x] `src/core/equipment/EquipmentSpawnHelper.ts` - No changes needed, imports from equipmentConstants.ts which re-exports
    - [x] `src/index.ts` - No changes needed, imports from equipmentConstants.ts which re-exports
    - [x] Test files - No changes needed, imports from equipmentConstants.ts which re-exports
- [x] Double check the imports to make sure there aren't any more that need updating.
    - Verified all imports work through the re-export in equipmentConstants.ts

#### Task 3: Races
- [ ] Move `RACE_DATA_IMPL` and `RACE_DATA` from `src/utils/constants.ts` to `src/constants/DefaultRaces.ts`.
- [ ] Update imports in:
    - [ ] `src/utils/constants.ts` (re-export)
    - [ ] `src/core/generation/CharacterGenerator.ts`
    - [ ] `src/core/extensions/initializeDefaults.ts`
    - [ ] `src/core/features/FeatureQuery.ts`
- [ ] Double check the imports to make sure there aren't any more that need updating.

#### Task 4: Classes
- [ ] Move `CLASS_DATA` from `src/utils/constants.ts` to `src/constants/DefaultClasses.ts`.
- [ ] Update imports in:
    - [ ] `src/utils/constants.ts` (re-export)
    - [ ] `src/core/generation/CharacterGenerator.ts`
    - [ ] `src/core/progression/LevelUpProcessor.ts`
    - [ ] `src/core/progression/stat/StatIncreaseStrategy.ts`
- [ ] Double check the imports to make sure there aren't any more that need updating.

#### Task 5: Spells
- [ ] Move `SPELL_DATABASE` from `src/utils/constants.ts` to `src/constants/DefaultSpells.ts`.
- [ ] Update imports in:
    - [ ] `src/utils/constants.ts` (re-export)
    - [ ] `src/core/generation/SpellManager.ts`
    - [ ] `src/core/extensions/initializeDefaults.ts`
- [ ] Double check the imports to make sure there aren't any more that need updating.

#### Task 6: Enchantments
- [ ] Move `ENCHANTMENT_LIBRARY` from `src/utils/equipmentConstants.ts` to `src/constants/DefaultEnchantments.ts`.
- [ ] Update imports in:
    - [ ] `src/utils/equipmentConstants.ts` (re-export)
    - [ ] `src/utils/EnchantmentLibrary.ts`
- [ ] Double check the imports to make sure there aren't any more that need updating.

#### Task 7: Item Templates
- [ ] Move `ITEM_CREATION_TEMPLATES` from `src/utils/equipmentConstants.ts` to `src/constants/ItemTemplates.ts`.
- [ ] Update imports in:
    - [ ] `src/utils/equipmentConstants.ts` (re-export)
- [ ] Double check the imports to make sure there aren't any more that need updating.

#### Task 8: Magic Items
- [ ] Move `MAGIC_ITEMS` from `src/utils/equipmentConstants.ts` to `src/constants/MagicItems.ts`.
- [ ] Update imports in:
    - [ ] `src/utils/equipmentConstants.ts` (re-export)
    - [ ] `src/utils/magicItemExamples.ts`
- [ ] Double check the imports to make sure there aren't any more that need updating.


#### Task 9: Skills
- [ ] Move `DEFAULT_SKILLS` from `src/core/skills/DefaultSkills.ts` to `src/constants/DefaultSkills.ts`.
- [ ] Update imports in:
    - [ ] `src/core/skills/DefaultSkills.ts` (re-export or remove)
    - [ ] `src/core/skills/index.ts`
    - [ ] `src/core/extensions/initializeDefaults.ts`
- [ ] Double check the imports to make sure there aren't any more that need updating.


#### Task 10: Features & Traits
- [x] Move `DEFAULT_CLASS_FEATURES` and `DEFAULT_RACIAL_TRAITS` from `src/core/features/DefaultFeatures.ts` to `src/constants/DefaultFeatures.ts`.
- [x] Veryify imports were updated in:
    - [x] `src/core/features/DefaultFeatures.ts` (re-export or remove) - File does not exist, nothing to do
    - [x] `src/core/features/index.ts` - Already exports from new location
    - [x] `src/core/extensions/initializeDefaults.ts` - Already imports from new location
- [x] Double check the imports to make sure there aren't any more that need updating.
    - Updated 8 test files to import from `../../src/core/features/index.js` instead of old path
    - Removed unused `Race` type import from DefaultFeatures.ts

### Phase 3: Data Population
This phase involves adding the actual description text to the newly organized files.

#### Task 11: Races
- [ ] **Research**: Study `src/constants/DefaultRaces.ts` and list all race entries requiring descriptions.
- [ ] Update `RACE_DATA_IMPL` in `src/constants/DefaultRaces.ts` with descriptions.

#### Task 12: Classes
- [ ] **Research**: Study `src/constants/DefaultClasses.ts` and list all class entries requiring descriptions.
- [ ] Update `CLASS_DATA` in `src/constants/DefaultClasses.ts` with descriptions.

#### Task 13: Skills
- [ ] **Research**: Study `src/constants/DefaultSkills.ts` and list all skill entries requiring descriptions.
- [ ] Update `DEFAULT_SKILLS` in `src/constants/DefaultSkills.ts`.

#### Task 14: Spells
- [ ] **Research**: Study `src/constants/DefaultSpells.ts` and list all spell entries requiring descriptions.
- [ ] Update `SPELL_DATABASE` in `src/constants/DefaultSpells.ts`.

#### Task 15: Equipment
- [ ] **Research**: Study `src/constants/DefaultEquipment.ts`, `ItemTemplates.ts`, and `MagicItems.ts` to identify all items.
- [ ] Update `DEFAULT_EQUIPMENT` in `src/constants/DefaultEquipment.ts`.
- [ ] Update `ITEM_CREATION_TEMPLATES` in `src/constants/ItemTemplates.ts` (if needed, they are `EnhancedEquipment`).
- [ ] Update `MAGIC_ITEMS` in `src/constants/MagicItems.ts` (if needed, they are `EnhancedEquipment`).

#### Task 16: Enchantments
- [ ] **Research**: Study `src/constants/DefaultEnchantments.ts` and list all enchantment/curse entries.
- [ ] Update `ENCHANTMENT_LIBRARY` in `src/constants/DefaultEnchantments.ts`.
    -   Target: ~50+ enchantments and curses.

#### Task 17: Features & Traits
- [ ] **Research**: Study `src/constants/DefaultFeatures.ts` to identify any missing descriptions in Features or Traits.
- [ ] Verify `DEFAULT_CLASS_FEATURES` in `src/constants/DefaultFeatures.ts`.
- [ ] Verify `DEFAULT_RACIAL_TRAITS` in `src/constants/DefaultFeatures.ts`.
    *   *Note*: These should already have descriptions, but we will audit them to ensure quality and completeness.

### Phase 4: Verification
- [ ] **Compilation**: Run `npm run build` (or similar) to ensure no type errors.
- [ ] **Data Integrity Check**:
    - [ ] **Races**: Verify `getRaceData('Human')` returns a description.
    - [ ] **Classes**: Verify `getClassData('Fighter')` returns a description.
    - [ ] **Skills**: Verify `DEFAULT_SKILLS[0]` has a description.
    - [ ] **Spells**: Verify `SPELL_DATABASE['Fireball']` has a description.
    - [ ] **Equipment**: Verify `DEFAULT_EQUIPMENT['Longsword']` has a description.
    - [ ] **Features**: Verify a sample from `DEFAULT_CLASS_FEATURES` (e.g., `barbarian_rage`).
    - [ ] **Traits**: Verify a sample from `DEFAULT_RACIAL_TRAITS` (e.g., `elf_darkvision`).
    - [ ] **Enchantments**: Verify a sample from `ENCHANTMENT_LIBRARY` (e.g., `plus_one`).
    - [ ] **Templates**: Verify a sample from `ITEM_CREATION_TEMPLATES`.
    - [ ] **Magic Items**: Verify a sample from `MAGIC_ITEMS`.

## 3. Custom Data Considerations
- **ExtensionManager**: Custom races (`races.data`) and classes (`classes.data`) will use the updated interfaces.
- **Backwards Compatibility**: The `description` field for Equipment, Spells, Skills, and Enchantments is optional (`?`), so existing custom data without descriptions will not break.
- **Requirement**: For Races and Classes, since we are updating the core types `RaceDataEntry` and `ClassDataEntry`, we must decide if `description` is optional or required.
    -   *Decision*: Make it **optional** (`description?: string`) initially to avoid breaking existing custom extensions, then populate it for all defaults.
- **New Files**: Ensure `ExtensionManager` and other consumers properly import from the new `src/constants/` locations if they were previously importing from `src/utils/constants.ts` (though we may re-export them to maintain compatibility).

## 4. Open Questions / Implementation Details
- [ ] **Content Source**: Descriptions will be flavorful and consistent with 5e style.
- [ ] **Markdown**: Basic Markdown support (bold, italic) is assumed for descriptions to match existing Feature description style.
