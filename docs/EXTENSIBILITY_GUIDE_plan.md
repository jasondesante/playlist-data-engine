# EXTENSIBILITY_GUIDE.md - Verification Plan

## Goal and Summary

**Objective:** Verify that every documented API, class, method, type, and category in the EXTENSIBILITY_GUIDE.md exists in the codebase, is properly exported, and matches the documented behavior.

**Scope:** This plan validates the extensibility system which allows users to add custom content (spells, equipment, races, classes, skills, features, traits) at runtime with spawn rate control.

**Verification Approach:**
- Phase 1: Verify Core Extension System (ExtensionManager)
- Phase 2: Verify Registry Systems (FeatureRegistry, SkillRegistry, SpellRegistry)
- Phase 3: Verify Validation Systems (Validators for all registries)
- Phase 4: Verify Equipment Modification System
- Phase 5: Verify Helper Functions and Utilities
- Phase 6: Verify Type Definitions and Exports
- Phase 7: Verify Extension Categories
- Phase 8: Verify Integration Examples and Code Samples

**Success Criteria:**
- [ ] All documented classes exist at expected locations
- [ ] All documented methods are implemented with matching signatures
- [ ] All types and interfaces are properly exported
- [ ] All extension categories are recognized by ExtensionManager
- [ ] Documentation examples compile and run correctly

---

## Handling Documentation-Code Mismatches

**Important:** During verification, if you discover any problems where the documentation and codebase do not match:

1. **Document the Issue:** Add the discrepancy to the "Critical Issues Found" section at the end of this document with:
   - Status: ⚠️ Documentation Error / ❓ Needs Verification / 🐛 Code Bug
   - Detail: Clear description of what doesn't match
   - Action: What needs to be fixed (docs vs code)

2. **Create a New Phase:** Add a new Phase (e.g., "Phase 9: Fix Documentation Issues" or "Phase 9: Fix Code Issues") with tasks to resolve the discrepancy

3. **Research and Write Tasks:** For the new phase:
   - Research the codebase to understand the full context
   - Write specific tasks to fix the issue
   - Include file paths and line numbers
   - Add checkboxes for verification steps

4. **Fix When Reached:** When executing the plan and you reach that new phase:
   - Complete the tasks to fix the documentation or code
   - Update the "Critical Issues Found" section status
   - Mark the phase as complete in progress tracking

**Example:**
```markdown
### Issue 1: EquipmentModifier.getInstance()
**Status:** ⚠️ Documentation Error
**Detail:** Documentation shows `const modifier = EquipmentModifier.getInstance()` but the class uses static methods only
**Action:** Documentation should be updated to show direct static method calls

## Phase 9: Fix EquipmentModifier Documentation

### Task 9.1: Update Documentation Examples
- [ ] Find all instances of `EquipmentModifier.getInstance()` in documentation
- [ ] Replace with direct static method call examples
- [ ] Verify updated examples compile correctly
```

This ensures all discovered issues are tracked, researched, and resolved systematically.

---

## Phase 1: Core Extension System (ExtensionManager)

**Goal:** Verify the ExtensionManager singleton class provides the core API for managing custom content registration and retrieval.

### Task 1.1: Verify ExtensionManager Class Structure
- [x] ExtensionManager class exists at [src/core/extensions/ExtensionManager.ts](src/core/extensions/ExtensionManager.ts)
- [x] Singleton pattern implemented correctly
- [x] Private instance variable exists
- [x] Private constructor exists
- [x] getInstance() returns singleton instance

### Task 1.2: Verify Registration Methods
- [x] `register(category, items, options)` → Line 204
  - [x] Accepts ExtensionCategory, array of items, ExtensionOptions
  - [x] mode option: 'relative' | 'absolute' | 'default' | 'replace'
  - [x] weights option: Record<string, number>
  - [x] validate option: boolean (default: true)
- [x] `initializeDefaults(category, data)` → Line 185
- [x] `initializeAllDefaults(data)` → Line 192

### Task 1.3: Verify Data Retrieval Methods
- [x] `get(category)` → Line 318 - Returns merged defaults + custom
- [x] `getDefaults(category)` → Line 342 - Returns defaults only
- [x] `getCustom(category)` → Line 351 - Returns custom only
- [x] `getDefaultWeights(category)` → Line 382 - Returns default weights (all 1.0)

### Task 1.4: Verify Weight Management Methods
- [x] `setWeights(category, weights)` → Line 361
- [x] `getWeights(category)` → Line 370
- [x] `hasCustomData(category)` → Line 401
- [x] `getMode(category)` → Line 410 - Returns 'relative' | 'absolute' | 'default' | 'replace' | undefined

### Task 1.5: Verify Information and Export Methods
- [x] `getInfo(category)` → Line 699 - Returns extension info object
  - [x] hasCustomData: boolean
  - [x] defaultCount: number
  - [x] customCount: number
  - [x] totalCount: number
  - [x] mode: string
  - [x] weights: object
  - [x] registeredAt: timestamp
- [x] `getCurrentOptions(category)` → Line 420
- [x] `exportCustomData()` → Line 727
- [x] `getRegisteredCategories()` → Line 754

### Task 1.6: Verify Reset Methods
- [x] `reset(category)` → Line 662
- [x] `resetAll()` → Line 689

### Task 1.7: Verify Validation Method
- [x] `validate(category, items)` → Line 431
- [x] `validateItem(category, item, index)` → Line 459 (private)

---

## Phase 2: Registry Systems

**Goal:** Verify all three registry systems (Features, Skills, Spells) provide consistent APIs for managing their respective data.

### Task 2.1: Verify FeatureRegistry
- [x] Class exists at [src/core/features/FeatureRegistry.ts](src/core/features/FeatureRegistry.ts)
- [x] `getInstance()` → Line 49
- [x] `initializeDefaults(defaultClassFeatures, defaultRacialTraits)` → Line 63
- [x] `registerClassFeature(feature)` → Line 93
- [x] `registerClassFeatures(features)` → Line 120
- [x] `registerRacialTrait(trait)` → Line 132
- [x] `registerRacialTraits(traits)` → Line 159
- [x] `getClassFeatures(className, level)` → Line 175
- [x] `getFeaturesForLevel(className, level)` → Line 189
- [x] `getClassFeatureById(featureId)` → Line 200
- [x] `getRacialTraits(race)` → Line 210
- [x] `getRacialTraitsForSubrace(race, subrace)` → Line 221
- [x] `getAvailableSubraces(race)` → Line 235
- [x] `getRacialTraitById(traitId)` → Line 252
- [x] `validatePrerequisites(feature, character)` → Line 265
- [x] `canGainFeature(feature, character)` → Line 379
- [x] `getRegisteredClasses()` → Line 389
- [x] `getRegisteredRaces()` → Line 398
- [x] `getRegistryStats()` → Line 407
- [x] `reset()` → Line 437
- [x] `exportRegistry()` → Line 541
- [x] `isInitialized()` → Line 450
- [x] Static methods: `getEquipmentFeatures()`, `isValidEquipmentFeature()`, `registerEquipmentFeature()` → Lines 468-532
- [x] Helper function: `getFeatureRegistry()` → Line 569

### Task 2.2: Verify SkillRegistry
- [x] Class exists at [src/core/skills/SkillRegistry.ts](src/core/skills/SkillRegistry.ts)
- [x] `getInstance()` → Line 51
- [x] `initializeDefaults(defaultSkills)` → Line 64
- [x] `registerSkill(skill)` → Line 86
- [x] `registerSkills(skills)` → Line 124
- [x] `getSkill(id)` → Line 136
- [x] `getAllSkills()` → Line 145
- [x] `getSkillsByAbility(ability)` → Line 155
- [x] `getSkillsByCategory(category)` → Line 172
- [x] `getCategories()` → Line 188
- [x] `getSkillsBySource(source)` → Line 198 - 'default' | 'custom'
- [x] `isValidSkill(id)` → Line 208
- [x] `validateSkill(skill)` → Line 218
- [x] `validatePrerequisites(skill, character)` → Line 266
- [x] `getRegistryStats()` → Line 278
- [x] `reset()` → Line 315
- [x] `exportRegistry()` → Line 345
- [x] `unregisterSkill(id)` → Line 358
- [x] `isInitialized()` → Line 334
- [x] Helper function: `getSkillRegistry()` → Line 399

### Task 2.3: Verify SpellRegistry
- [x] Class exists at [src/core/spells/SpellRegistry.ts](src/core/spells/SpellRegistry.ts)
- [x] `getInstance()` → Line 94
- [x] `initializeDefaults(defaultSpells)` → Line 107
- [x] `registerSpell(spell)` → Line 137
- [x] Helper function: `getSpellRegistry()` → Line 576
- [x] Query methods (verify exist):
  - [x] `getSpell(id)` → Line 201
  - [x] `getSpellsByLevel(level)` → Line 220
  - [x] `getSpellsBySchool(school)` → Line 237
  - [x] `getSpellsByClass(className)` → Line 254 (named `getSpellsForClass`)

---

## Phase 3: Validation Systems

**Goal:** Verify all validators provide consistent validation for their respective data types.

### Task 3.1: Verify FeatureValidator
- [x] Class exists at [src/core/features/FeatureValidator.ts](src/core/features/FeatureValidator.ts)
- [x] `validateClassFeature(feature)` → Line 123
- [x] `validateRacialTrait(trait)` → Line 232
- [x] `validateEffect(effect)` → Line 355
- [x] `validatePrerequisites(prerequisites)` → Line 420
- [x] `validateClassFeatures(features)` → Line 575
- [x] `validateRacialTraits(traits)` → Line 604
- [x] Helper functions exported:
  - [x] `validateClassFeature(feature)` → Line 662
  - [x] `validateRacialTrait(trait)` → Line 674
  - [x] `validateClassFeatures(features)` → Line 686
  - [x] `validateRacialTraits(traits)` → Line 698

### Task 3.2: Verify SkillValidator
- [x] Class exists at [src/core/skills/SkillValidator.ts](src/core/skills/SkillValidator.ts)
- [x] `validateSkill(skill)` → Line 52
- [x] `validateSkills(skills)` → Line 161
- [x] `validateSkillProficiency(proficiency)` → Line 190
- [x] `validateSkillProficiencies(proficiencies)` → Line 239
- [x] `validateSkillListDefinition(skillList)` → Line 268
- [x] `isValidAbility(ability)` → Line 337
- [x] `isValidSkillId(id)` → Line 350
- [x] `validateSkillPrerequisites(prerequisites, character)` → Line 367
- [x] Helper functions exported:
  - [x] `validateSkill(skill)` → Line 458
  - [x] `validateSkills(skills)` → Line 470
  - [x] `validateSkillProficiency(proficiency)` → Line 482
  - [x] `validateSkillProficiencies(proficiencies)` → Line 494
  - [x] `validateSkillListDefinition(skillList)` → Line 506
  - [x] `validateSkillPrerequisites(prerequisites, character)` → Line 519

### Task 3.3: Verify SpellValidator
- [x] Class exists at [src/core/spells/SpellValidator.ts](src/core/spells/SpellValidator.ts)
- [x] `validateSpell(spell)` → Line 94
- [x] `validateSpells(spells)` → Line 177
- [x] `validatePrerequisites(prerequisites)` → Line 208 - Schema validation
- [x] `validateSpellPrerequisites(prerequisites, character)` → Line 332 - Runtime validation
- [x] `isValidAbility(ability)` → Line 425
- [x] `isValidSchool(school)` → Line 435
- [x] `isValidSpellLevel(level)` → Line 445
- [x] Helper functions exported:
  - [x] `validateSpell(spell)` → Line 458
  - [x] `validateSpells(spells)` → Line 470
  - [x] `validateSpellPrerequisitesSchema(prerequisites)` → Line 482
  - [x] `validateSpellPrerequisites(prerequisites, character)` → Line 495

### Task 3.4: Verify SpellManager
- [x] Class exists at [src/core/generation/SpellManager.ts](src/core/generation/SpellManager.ts)
- [x] `isSpellcaster(characterClass)` → Line 40
- [x] `getSpellSlots(characterClass, characterLevel)` → Line 55
- [x] `getCantrips(characterClass)` → Line 93
- [x] `getKnownSpells(characterClass, characterLevel, character?)` → Line 140
- [x] `filterSpellsByPrerequisites(spellNames, character)` → Line 233 (private)
- [x] `initializeSpells(characterClass, characterLevel, character?)` → Line 270
- [x] `getSpellCountAtLevel(spellLevel, spellSlots)` → Line 289
- [x] `useSpellSlot(spellSlots, spellLevel)` → Line 303
- [x] `restoreSpellSlots(spellSlots, spellLevel?)` → Line 328
- [x] `filterCharacterSpells(character)` → Line 362

---

## Phase 4: Equipment Modification System

**Goal:** Verify EquipmentModifier provides complete equipment enchantment/cursing/modification capabilities.

### Task 4.1: Verify EquipmentModifier Class Structure
- [x] Class exists at [src/core/equipment/EquipmentModifier.ts](src/core/equipment/EquipmentModifier.ts)
- [x] **NOTE:** Class uses static methods (NOT singleton) - verified (no getInstance, no private constructor, all methods static)

### Task 4.2: Verify Modification Methods
- [x] `enchant(equipment, itemName, enchantment, character?)` → Line 67 (actual: 67-84)
- [x] `applyTemplate(equipment, itemName, templateId, character?)` → Line 98 (actual: 98-138)
- [x] `curse(equipment, itemName, curse, character?)` → Line 152 (actual: 152-169)
- [x] `upgrade(equipment, itemName, upgrade, character?)` → Line 183 (actual: 183-190)
- [x] `removeModification(equipment, itemName, modificationId, character?)` → Line 204 (actual: 204-251)
- [x] `removeAllModifications(equipment, itemName, character?)` → Line 394 (actual: 394-413)
- [x] `disenchant(equipment, itemName, character?)` → Line 426 (actual: 426-447)
- [x] `liftCurse(equipment, itemName, character?)` → Line 460 (actual: 460-481)

### Task 4.3: Verify Query Methods
- [x] `getModificationHistory(equipment, itemName)` → Line 263 (actual: 263-274)
- [x] `getCombinedEffects(equipment, itemName, instanceId?)` → Line 287 (actual: 287-311)
- [x] `hasTemplate(equipment, itemName, templateId)` → Line 321 (actual: 321-344)
- [x] `getAppliedTemplates(equipment, itemName)` → Line 353 (actual: 353-381)
- [x] `getModificationSources(equipment, itemName)` → Line 729 (actual: 729-740)
- [x] `countModificationsBySource(equipment, itemName, source)` → Line 752 (actual: 752-766)
- [x] `isCursed(equipment, itemName)` → Line 792 (actual: 792-797)
- [x] `isEnchanted(equipment, itemName)` → Line 806 (actual: 806-812)
- [x] `getItemSummary(equipment, itemName)` → Line 821 (actual: 821-853)

### Task 4.4: Verify Factory Methods
- [x] `createModification(id, name, properties, source)` → Line 610 (plan had 632)
- [x] `createFeatureModification(id, name, properties, addsFeatures, source)` → Line 637 (plan had 659)
- [x] `createSkillModification(id, name, properties, addsSkills, source)` → Line 666 (plan had 688)
- [x] `createSpellModification(id, name, properties, addsSpells, source)` → Line 695 (plan had 717)
- [x] `generateModificationId(prefix?)` → Line 718 (plan had 740)

### Task 4.5: Verify EquipmentModifier Types
- [x] `ModificationResult` interface → Line 27 in EquipmentModifier.ts (plan had 25)
- [x] `CharacterEquipment` interface → Line 183 in Equipment.ts (imported, not defined in EquipmentModifier.ts)
- [x] `EnhancedInventoryItem` interface → Line 164 in Equipment.ts (imported, not defined in EquipmentModifier.ts)

---

## Phase 5: Helper Functions and Utilities

**Goal:** Verify all helper functions exist and are exported correctly.

### Task 5.1: Verify Constants Helper Functions
- [x] `getClassData(className)` → [src/utils/constants.ts:491](src/utils/constants.ts#L491)
- [x] `getClassDataAsync(className)` → [src/utils/constants.ts:395](src/utils/constants.ts#L395) (internal, not exported)
- [x] `getRaceData(race)` → [src/utils/constants.ts:167](src/utils/constants.ts#L167)
- [x] `getRaceDataAsync(race)` → [src/utils/constants.ts:122](src/utils/constants.ts#L122) (internal, not exported)
- [x] `getClassSpellList(className)` → [src/utils/constants.ts:1425](src/utils/constants.ts#L1425)
- [x] `getSpellSlotsForClass(className, characterLevel)` → [src/utils/constants.ts:1485](src/utils/constants.ts#L1485)
- [x] `getClassStartingEquipment(className)` → [src/utils/constants.ts:1551](src/utils/constants.ts#L1551)
- [x] Verified exports from src/index.ts

### Task 5.2: Verify Type Helper Functions
- [x] `asClass(value)` → [src/core/types/Character.ts:66](src/core/types/Character.ts#L66)
- [x] `isValidClass(className)` → [src/core/types/Character.ts:114](src/core/types/Character.ts#L114)
- [x] Verify `asClass` is exported from src/index.ts (line 177)

### Task 5.3: Verify Registry Helper Functions
- [x] `getFeatureRegistry()` → [src/core/features/FeatureRegistry.ts:569](src/core/features/FeatureRegistry.ts#L569)
- [x] `getSkillRegistry()` → [src/core/skills/SkillRegistry.ts:399](src/core/skills/SkillRegistry.ts#L399)
- [x] `getSpellRegistry()` → [src/core/spells/SpellRegistry.ts:576](src/core/spells/SpellRegistry.ts#L576)
- [x] Verify all are exported from src/index.ts

### Task 5.4: Verify Initialization Helpers
All should be exported from [src/core/extensions/index.ts](src/core/extensions/index.ts):
- [ ] `initializeAppearanceDefaults()`
- [ ] `areAppearanceDefaultsInitialized()`
- [ ] `ensureAppearanceDefaultsInitialized()`
- [ ] `initializeSpellDefaults()`
- [ ] `areSpellDefaultsInitialized()`
- [ ] `ensureSpellDefaultsInitialized()`
- [ ] `initializeEquipmentDefaults()`
- [ ] `areEquipmentDefaultsInitialized()`
- [ ] `ensureEquipmentDefaultsInitialized()`
- [ ] `initializeRaceDefaults()`
- [ ] `areRaceDefaultsInitialized()`
- [ ] `ensureRaceDefaultsInitialized()`
- [ ] `initializeClassDefaults()`
- [ ] `areClassDefaultsInitialized()`
- [ ] `ensureClassDefaultsInitialized()`
- [ ] `initializeFeatureDefaults()`
- [ ] `areFeatureDefaultsInitialized()`
- [ ] `ensureFeatureDefaultsInitialized()`
- [ ] `initializeSkillDefaults()`
- [ ] `areSkillDefaultsInitialized()`
- [ ] `ensureSkillDefaultsInitialized()`
- [ ] `initializeAllDefaults()`
- [ ] `ensureAllDefaultsInitialized()`

---

## Phase 6: Type Definitions and Exports

**Goal:** Verify all types are defined and exported correctly from the main package.

### Task 6.1: Verify ExtensionManager Types
- [ ] `ExtensionCategory` type → [src/core/extensions/ExtensionManager.ts:29](src/core/extensions/ExtensionManager.ts#L29)
  - [ ] Contains all 50+ category strings
- [ ] `ExtensionOptions` interface → Line 108
  - [ ] mode?: 'relative' | 'absolute' | 'default' | 'replace'
  - [ ] weights?: Record<string, number>
  - [ ] validate?: boolean
- [ ] `ValidationResult` interface → Line 143
  - [ ] valid: boolean
  - [ ] errors?: string[]
- [ ] `ExtensionData` interface → Line 134 (internal)
- [ ] Verify exported from src/index.ts

### Task 6.2: Verify Feature Types
- [ ] `ClassFeature` type → [src/core/features/FeatureTypes.ts](src/core/features/FeatureTypes.ts)
- [ ] `RacialTrait` type → [src/core/features/FeatureTypes.ts](src/core/features/FeatureTypes.ts)
- [ ] `FeatureEffect` type → [src/core/features/FeatureTypes.ts](src/core/features/FeatureTypes.ts)
- [ ] `FeaturePrerequisite` type → [src/core/features/FeatureTypes.ts](src/core/features/FeatureTypes.ts)
- [ ] Verify exported from src/index.ts

### Task 6.3: Verify Skill Types
- [ ] `CustomSkill` type → [src/core/skills/SkillTypes.ts](src/core/skills/SkillTypes.ts)
- [ ] `SkillPrerequisite` type → [src/core/skills/SkillTypes.ts](src/core/skills/SkillTypes.ts)
- [ ] `SkillValidationResult` type → [src/core/skills/SkillTypes.ts](src/core/skills/SkillTypes.ts)
- [ ] `SkillRegistryStats` type → [src/core/skills/SkillTypes.ts](src/core/skills/SkillTypes.ts)
- [ ] Verify exported from src/index.ts

### Task 6.4: Verify Spell Types
- [ ] `Spell` type → [src/utils/constants.ts](src/utils/constants.ts)
- [ ] `SpellPrerequisite` type → [src/utils/constants.ts](src/utils/constants.ts)
- [ ] `SpellValidationResult` interface → [src/core/spells/SpellValidator.ts:49](src/core/spells/SpellValidator.ts#L49)
- [ ] `RegisteredSpell` interface → [src/core/spells/SpellRegistry.ts:32](src/core/spells/SpellRegistry.ts#L32)
- [ ] `SpellSchool` type → [src/core/spells/SpellRegistry.ts:19](src/core/spells/SpellRegistry.ts#L19)
- [ ] Verify exported from src/index.ts

### Task 6.5: Verify Equipment Types
- [ ] `EnhancedEquipment` type → [src/core/types/Equipment.ts](src/core/types/Equipment.ts)
- [ ] `EquipmentProperty` type → [src/core/types/Equipment.ts](src/core/types/Equipment.ts)
- [ ] `EquipmentModification` type → [src/core/types/Equipment.ts](src/core/types/Equipment.ts)
- [ ] `EquipmentMiniFeature` type → [src/core/types/Equipment.ts](src/core/types/Equipment.ts)
- [ ] Verify exported from src/index.ts

### Task 6.6: Verify CharacterGenerator Types
- [ ] `SpellExtension` interface → [src/core/generation/CharacterGenerator.ts:21](src/core/generation/CharacterGenerator.ts#L21)
- [ ] `EquipmentExtension` interface → [src/core/generation/CharacterGenerator.ts:35](src/core/generation/CharacterGenerator.ts#L35)
- [ ] `RaceExtension` type → [src/core/generation/CharacterGenerator.ts:45](src/core/generation/CharacterGenerator.ts#L45)
- [ ] `ClassExtension` type → [src/core/generation/CharacterGenerator.ts:50](src/core/generation/CharacterGenerator.ts#L50)
- [ ] `AppearanceExtension` type → [src/core/generation/CharacterGenerator.ts:55](src/core/generation/CharacterGenerator.ts#L55)
- [ ] `CharacterGeneratorExtensions` interface → [src/core/generation/CharacterGenerator.ts:67](src/core/generation/CharacterGenerator.ts#L67)
- [ ] `CharacterGeneratorOptions` interface → [src/core/generation/CharacterGenerator.ts:80](src/core/generation/CharacterGenerator.ts#L80)

### Task 6.7: Verify Constants Types
- [ ] `RaceDataEntry` interface → [src/utils/constants.ts:14](src/utils/constants.ts#L14)
- [ ] `ClassDataEntry` interface → [src/utils/constants.ts:266](src/utils/constants.ts#L266)

---

## Phase 7: Extension Categories

**Goal:** Verify all documented extension categories are recognized by ExtensionManager.

### Task 7.1: Verify Equipment Categories
- [ ] 'equipment'
- [ ] 'equipment.properties'
- [ ] 'equipment.modifications'
- [ ] 'equipment.templates'

### Task 7.2: Verify Appearance Categories
- [ ] 'appearance.bodyTypes'
- [ ] 'appearance.skinTones'
- [ ] 'appearance.hairColors'
- [ ] 'appearance.hairStyles'
- [ ] 'appearance.eyeColors'
- [ ] 'appearance.facialFeatures'

### Task 7.3: Verify Spell Categories
- [ ] 'spells'
- [ ] `spells.${string}` (class-specific spells)

### Task 7.4: Verify Race Categories
- [ ] 'races'
- [ ] 'races.data'

### Task 7.5: Verify Class Categories
- [ ] 'classes'
- [ ] 'classes.data'

### Task 7.6: Verify Feature Categories
- [ ] 'classFeatures'
- [ ] 'classFeatures.Barbarian'
- [ ] 'classFeatures.Bard'
- [ ] 'classFeatures.Cleric'
- [ ] 'classFeatures.Druid'
- [ ] 'classFeatures.Fighter'
- [ ] 'classFeatures.Monk'
- [ ] 'classFeatures.Paladin'
- [ ] 'classFeatures.Ranger'
- [ ] 'classFeatures.Rogue'
- [ ] 'classFeatures.Sorcerer'
- [ ] 'classFeatures.Warlock'
- [ ] 'classFeatures.Wizard'
- [ ] `classFeatures.${string}`

### Task 7.7: Verify Racial Trait Categories
- [ ] 'racialTraits'
- [ ] 'racialTraits.Human'
- [ ] 'racialTraits.Elf'
- [ ] 'racialTraits.Dwarf'
- [ ] 'racialTraits.Halfling'
- [ ] 'racialTraits.Dragonborn'
- [ ] 'racialTraits.Gnome'
- [ ] 'racialTraits.Half-Elf'
- [ ] 'racialTraits.Half-Orc'
- [ ] 'racialTraits.Tiefling'

### Task 7.8: Verify Skill Categories
- [ ] 'skills'
- [ ] 'skills.STR'
- [ ] 'skills.DEX'
- [ ] 'skills.CON'
- [ ] 'skills.INT'
- [ ] 'skills.WIS'
- [ ] 'skills.CHA'

### Task 7.9: Verify Skill List Categories
- [ ] 'skillLists'
- [ ] 'skillLists.Barbarian'
- [ ] 'skillLists.Bard'
- [ ] 'skillLists.Cleric'
- [ ] 'skillLists.Druid'
- [ ] 'skillLists.Fighter'
- [ ] 'skillLists.Monk'
- [ ] 'skillLists.Paladin'
- [ ] 'skillLists.Ranger'
- [ ] 'skillLists.Rogue'
- [ ] 'skillLists.Sorcerer'
- [ ] 'skillLists.Warlock'
- [ ] 'skillLists.Wizard'
- [ ] `skillLists.${string}`

### Task 7.10: Verify Class Spell Categories
- [ ] 'classSpellLists'
- [ ] `classSpellLists.${string}`

### Task 7.11: Verify Spell Slot and Equipment Categories
- [ ] 'classSpellSlots'
- [ ] 'classStartingEquipment'
- [ ] `classStartingEquipment.${string}`

---

## Phase 8: Documentation Examples and Integration

**Goal:** Verify all code examples in the documentation compile and work correctly.

### Task 8.1: Verify ExtensionManager Usage Examples
- [ ] Getting instance: `ExtensionManager.getInstance()`
- [ ] Register with options: `manager.register('equipment', items, { mode, weights, validate })`
- [ ] Getting data: `manager.get('equipment')`
- [ ] Setting weights: `manager.setWeights('equipment', weights)`
- [ ] Getting info: `manager.getInfo('spells')`
- [ ] Exporting: `manager.exportCustomData()`
- [ ] Reset: `manager.reset('equipment')` and `manager.resetAll()`

### Task 8.2: Verify Spawn Rate Examples
- [ ] Relative mode works correctly
- [ ] Absolute mode works correctly
- [ ] Default mode works correctly
- [ ] Replace mode works correctly

### Task 8.3: Verify FeatureRegistry Usage Examples
- [ ] `FeatureRegistry.getInstance()`
- [ ] `registerClassFeature(feature)` and `registerClassFeatures(features)`
- [ ] `registerRacialTrait(trait)` and `registerRacialTraits(traits)`
- [ ] `getClassFeatures(className, level)`
- [ ] `getRacialTraits(race)` and `getRacialTraitsForSubrace(race, subrace)`
- [ ] `getRacialTraitById(traitId)`
- [ ] `getRegistryStats()`

### Task 8.4: Verify SkillRegistry Usage Examples
- [ ] `SkillRegistry.getInstance()`
- [ ] `registerSkill(skill)` and `registerSkills(skills)`
- [ ] `getSkill(id)`
- [ ] `getSkillsByAbility(ability)`
- [ ] `getSkillsByCategory(category)`
- [ ] `getSkillsBySource(source)`
- [ ] `isValidSkill(id)`
- [ ] `getRegistryStats()`

### Task 8.5: Verify CharacterGenerator Integration
- [ ] `CharacterGenerator.generate()` with extensions option
- [ ] Custom spells are registered correctly
- [ ] Custom equipment is registered correctly
- [ ] Custom races are registered correctly
- [ ] Custom classes are registered correctly
- [ ] Custom appearance options are registered correctly

### Task 8.6: Verify EquipmentModifier Usage Examples
- [ ] Static methods (not getInstance())
- [ ] Enchanting equipment
- [ ] Applying templates
- [ ] Cursing equipment
- [ ] Removing modifications

### Task 8.7: Verify Validation Examples
- [ ] SpellValidator usage
- [ ] FeatureValidator usage
- [ ] SkillValidator usage

---

## Critical Issues Found (During Planning)

### Issue 1: EquipmentModifier.getInstance()
**Status:** ⚠️ Documentation Error
**Detail:** Documentation shows `const modifier = EquipmentModifier.getInstance()` but the class uses static methods only (no singleton pattern)
**Action:** Documentation should be updated to show direct static method calls

### Issue 2: SpellRegistry.getSpell()
**Status:** ❓ Needs Verification
**Detail:** Documentation mentions getting spells but specific method needs verification
**Action:** Verify `getSpell(id)` method exists in SpellRegistry

### Issue 3: Type Interface Names
**Status:** ❓ Needs Verification
**Detail:** Documentation mentions `ClassFeatureExtension`, `RacialTraitExtension`, `SkillExtension`, `SkillListExtension` but actual types are `ClassFeature`, `RacialTrait`, `CustomSkill`
**Action:** Verify if these extension types exist or if base types are used

### Issue 4: ContentPackData Type
**Status:** ❓ Not Found
**Detail:** Example code references `ContentPackData` type but not found in type definitions
**Action:** Verify if this type exists or should be added

### Issue 5: EQUIPMENT_SYSTEM.md Reference
**Status:** ❓ Needs Verification
**Detail:** Documentation references [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md) for complete equipment system documentation
**Action:** Verify this file exists

---

## Progress Tracking

| Phase | Tasks | Completed | % Done | Status |
|-------|-------|-----------|--------|--------|
| Phase 1: ExtensionManager | 7 | 7 | 100% | Complete |
| Phase 2: Registries | 3 | 3 | 100% | Complete |
| Phase 3: Validators | 4 | 4 | 100% | Complete |
| Phase 4: EquipmentModifier | 5 | 5 | 100% | Complete |
| Phase 5: Helpers | 4 | 3 | 75% | In Progress |
| Phase 6: Types | 7 | 0 | 0% | Pending |
| Phase 7: Categories | 11 | 0 | 0% | Pending |
| Phase 8: Examples | 7 | 0 | 0% | Pending |
| **TOTAL** | **48** | **22** | **46%** | **In Progress** |

---

## Quick Reference: Public API Exports

All extensibility exports from [src/index.ts](src/index.ts):

```typescript
// Core Extension System
export { ExtensionManager } from './core/extensions/ExtensionManager.js';
export { WeightedSelector } from './core/extensions/WeightedSelector.js';
export type { ExtensionCategory, SelectionMode } from './core/extensions/index.js';
export type { ExtensionOptions, ValidationResult } from './core/extensions/ExtensionManager.js';

// Feature Registry
export { FeatureRegistry, getFeatureRegistry } from './core/features/FeatureRegistry.js';
export { FeatureEffectApplier } from './core/features/FeatureEffectApplier.js';
export { FeatureValidator } from './core/features/FeatureValidator.js';
export {
    validateClassFeature,
    validateRacialTrait,
    validateClassFeatures,
    validateRacialTraits
} from './core/features/FeatureValidator.js';

// Skill Registry
export { SkillRegistry, getSkillRegistry } from './core/skills/SkillRegistry.js';
export { SkillValidator } from './core/skills/SkillValidator.js';
export {
    validateSkill,
    validateSkills,
    validateSkillProficiency,
    validateSkillProficiencies,
    validateSkillListDefinition,
    validateSkillPrerequisites
} from './core/skills/SkillValidator.js';

// Spell Registry
export { SpellValidator } from './core/spells/SpellValidator.js';
export { SpellRegistry, getSpellRegistry } from './core/spells/SpellRegistry.js';
export {
    validateSpell,
    validateSpells,
    validateSpellPrerequisitesSchema,
    validateSpellPrerequisites
} from './core/spells/index.js';

// Equipment System
export { EquipmentModifier } from './core/equipment/EquipmentModifier.js';
export { EquipmentEffectApplier } from './core/equipment/EquipmentEffectApplier.js';
export { EquipmentValidator } from './core/equipment/EquipmentValidator.js';

// Character Generator
export { CharacterGenerator, type CharacterGeneratorOptions } from './core/generation/CharacterGenerator.js';

// Type Helpers
export { asClass } from './core/types/Character.js';

// Initialization
export {
    initializeAppearanceDefaults,
    areAppearanceDefaultsInitialized,
    ensureAppearanceDefaultsInitialized,
    initializeSpellDefaults,
    areSpellDefaultsInitialized,
    ensureSpellDefaultsInitialized,
    initializeEquipmentDefaults,
    areEquipmentDefaultsInitialized,
    ensureEquipmentDefaultsInitialized,
    initializeRaceDefaults,
    areRaceDefaultsInitialized,
    ensureRaceDefaultsInitialized,
    initializeClassDefaults,
    areClassDefaultsInitialized,
    ensureClassDefaultsInitialized,
    initializeFeatureDefaults,
    areFeatureDefaultsInitialized,
    ensureFeatureDefaultsInitialized,
    initializeSkillDefaults,
    areSkillDefaultsInitialized,
    ensureSkillDefaultsInitialized,
    initializeAllDefaults,
    ensureAllDefaultsInitialized
} from './core/extensions/index.js';

// Types
export type {
    ClassFeature,
    RacialTrait,
    FeatureEffect,
    FeaturePrerequisite
} from './core/features/FeatureTypes.js';

export type {
    CustomSkill,
    SkillPrerequisite
} from './core/skills/SkillTypes.js';

export type {
    SpellPrerequisite,
    Spell,
    Equipment
} from './utils/constants.js';

export type {
    RegisteredSpell,
    SpellSchool,
    ValidationResult as SpellValidationResult
} from './core/spells/SpellRegistry.js';

// Constants
export {
    DEFAULT_CLASS_FEATURES,
    DEFAULT_RACIAL_TRAITS
} from './core/features/DefaultFeatures.js';

export {
    DEFAULT_SKILLS,
    DEFAULT_SKILL_CATEGORIES
} from './core/skills/DefaultSkills.js';
```
