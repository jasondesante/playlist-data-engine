# Upgrade Plan Part 3: Prerequisites & Custom Races

## Overview

Upgrade the Playlist Data Engine to support:
1. **Skill Prerequisites**: Skills that require specific features, abilities, other skills, or spells
2. **Spell Prerequisites**: Spells that require specific features, abilities, level, skills, or other spells
3. **Custom Race Support**: Fully extensible custom races (not blocked by validation)
4. **Subrace Support**: Characters can have subraces (High Elf, Hill Dwarf, etc.) with full prerequisite validation
5. **Feature Prerequisites Expansion**: Features can require skills and spells (full parity)

**Design Principles:**
- **Backward Compatible**: Existing skills, spells, races, and characters continue to work
- **Follows Phase 11 Pattern**: Reuse `FeaturePrerequisite` pattern for consistency
- **Validation First**: All prerequisites validated before assignment
- **Type Safe**: Maintain TypeScript type safety
- **Extensible**: Custom races and subraces register same as custom equipment/features

---

## Phase 1: Research & Analysis (COMPLETE)

### 1.1 Analyze Current Skill Architecture
- [x] Map current skill data flow
- [x] Identify CustomSkill interface structure
- [x] Analyze SkillValidator capabilities
- [x] Review SkillAssigner assignment logic
- [x] Identify existing prerequisite pattern (FeaturePrerequisite)

**Files Analyzed:**
- `src/core/skills/SkillTypes.ts` - CustomSkill interface (no prerequisites)
- `src/core/skills/SkillValidator.ts` - Validation (no prerequisite checks)
- `src/core/generation/SkillAssigner.ts` - Assignment (no filtering)
- `src/core/features/FeatureTypes.ts` - FeaturePrerequisite pattern

### 1.2 Analyze Current Spell Architecture
- [x] Map current spell data flow
- [x] Identify Spell interface structure
- [x] Analyze SpellManager capabilities
- [x] Review CLASS_SPELL_LISTS structure
- [x] Identify existing prerequisite pattern to follow

**Files Analyzed:**
- `src/utils/constants.ts` - Spell interface, SPELL_DATABASE, CLASS_SPELL_LISTS
- `src/core/generation/SpellManager.ts` - Spell management
- `src/core/features/FeatureTypes.ts` - FeaturePrerequisite pattern

### 1.3 Analyze Current Race Architecture
- [x] Map Race type definition
- [x] Identify RacialTrait interface structure
- [x] Analyze ExtensionManager race validation
- [x] Review RACE_DATA structure
- [x] Check if custom races are blocked

**Files Analyzed:**
- `src/core/types/Character.ts` - Race type (closed union)
- `src/core/features/FeatureTypes.ts` - RacialTrait interface (HAS subrace property)
- `src/core/extensions/ExtensionManager.ts` - Race validation (blocks custom races)
- `src/utils/constants.ts` - RACE_DATA

**Key Finding:** Custom races are BLOCKED by validation (same issue as custom classes)

### 1.4 Analyze Subrace System
- [x] RacialTrait has `subrace?: string` property (line 165 in FeatureTypes.ts)
- [x] FeatureRegistry has `getRacialTraitsForSubrace()` method (lines 221-224)
- [x] Prerequisites can specify subrace requirements

**What's Missing:**
- CharacterSheet interface doesn't have a `subrace` property
- No way to set a character's subrace during generation
- Subrace validation in `validatePrerequisites()` doesn't check character.subrace

---

## Phase 2: Interface Design

### 2.1 Add Skill Prerequisite Types

**File:** `src/core/skills/SkillTypes.ts`

**New Interface:**

```typescript
/**
 * Prerequisites for learning or using a skill
 *
 * Follows the same pattern as FeaturePrerequisite for consistency.
 */
export interface SkillPrerequisite {
    /** Minimum character level required */
    level?: number;

    /** Minimum ability scores required */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race required */
    race?: Race;

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Custom condition description */
    custom?: string;
}
```

**Update CustomSkill Interface:**

```typescript
export interface CustomSkill {
    id: string;
    name: string;
    description?: string;
    ability: Ability;
    armorPenalty?: boolean;
    customProperties?: Record<string, string | number | boolean | string[]>;
    categories?: string[];
    source: 'default' | 'custom';
    tags?: string[];
    lore?: string;

    // NEW: Prerequisites for learning this skill
    prerequisites?: SkillPrerequisite;
}
```

### 2.2 Add Spell Prerequisite Types

**File:** `src/utils/constants.ts`

**Update Spell Interface:**

```typescript
export interface Spell {
    id?: string;  // NEW: Unique identifier (optional for backward compatibility)
    name: string;
    level: number;           // 0-9 (0 = cantrips)
    school: 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';
    casting_time: string;
    range: string;
    components: string[];
    duration: string;
    description?: string;

    // NEW: Prerequisites for learning this spell
    prerequisites?: SpellPrerequisite;
}

/**
 * Prerequisites for learning a spell
 */
export interface SpellPrerequisite {
    /** Minimum character level */
    level?: number;

    /** Minimum spellcaster level (if different from character level) */
    casterLevel?: number;

    /** Minimum ability scores */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: string;

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Custom condition */
    custom?: string;
}
```

### 2.3 Add Subrace Support to CharacterSheet

**File:** `src/core/types/Character.ts`

**Add after line 123 (after race property):**

```typescript
/** Race */
race: Race;

/** NEW: Subrace (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf') */
subrace?: string;
```

### 2.4 Update Race Type Strategy

**Recommendation:** Keep Race as closed union (Option A for now). Document type augmentation for advanced users.

Users can extend in their project:

```typescript
import 'playlist-data-engine';

declare module 'playlist-data-engine' {
    type Race =
        | 'Human' | 'Elf' | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome'
        | 'Half-Elf' | 'Half-Orc' | 'Tiefling'
        | 'Dragonkin';  // Custom race
}
```

---

## Phase 3: Skill Prerequisite System

### 3.1 Create SkillValidator Enhancements

**File:** `src/core/skills/SkillValidator.ts`

**New Static Method:**

```typescript
/**
 * Validate skill prerequisites against a character
 */
static validateSkillPrerequisites(
    skill: CustomSkill,
    character: CharacterSheet
): ValidationResult {
    const unmet: string[] = [];

    if (!skill.prerequisites) {
        return { valid: true };
    }

    const prereqs = skill.prerequisites;

    // Check level requirement
    if (prereqs.level && character.level < prereqs.level) {
        unmet.push(`Requires level ${prereqs.level} (current: ${character.level})`);
    }

    // Check ability requirements
    if (prereqs.abilities) {
        for (const [ability, minScore] of Object.entries(prereqs.abilities)) {
            const score = character.ability_scores[ability as Ability];
            if (score < minScore) {
                unmet.push(`Requires ${ability} ${minScore}+ (current: ${score})`);
            }
        }
    }

    // Check class requirement
    if (prereqs.class && character.class !== prereqs.class) {
        unmet.push(`Requires ${prereqs.class} class (current: ${character.class})`);
    }

    // Check race requirement
    if (prereqs.race && character.race !== prereqs.race) {
        unmet.push(`Requires ${prereqs.race} race (current: ${character.race})`);
    }

    // Check skill prerequisites
    if (prereqs.skills) {
        for (const requiredSkillId of prereqs.skills) {
            const proficiency = character.skills[requiredSkillId];
            if (proficiency !== 'proficient' && proficiency !== 'expertise') {
                unmet.push(`Requires proficiency in ${requiredSkillId} (current: ${proficiency})`);
            }
        }
    }

    // Check feature prerequisites
    if (prereqs.features) {
        const hasFeatures = character.class_features || [];
        for (const requiredFeatureId of prereqs.features) {
            if (!hasFeatures.includes(requiredFeatureId)) {
                unmet.push(`Requires feature: ${requiredFeatureId}`);
            }
        }
    }

    // Check spell prerequisites
    if (prereqs.spells) {
        const knownSpells = character.spells?.known_spells || [];
        for (const requiredSpell of prereqs.spells) {
            if (!knownSpells.includes(requiredSpell)) {
                unmet.push(`Requires spell: ${requiredSpell}`);
            }
        }
    }

    return {
        valid: unmet.length === 0,
        unmet: unmet.length > 0 ? unmet : undefined
    };
}
```

### 3.2 Update SkillAssigner for Prerequisites

**File:** `src/core/generation/SkillAssigner.ts`

**Modify assignSkills() Method:**

```typescript
static assignSkills(
    characterClass: Class,
    rng: SeededRNG,
    character?: CharacterSheet  // NEW: Optional character parameter
): Record<Skill, ProficiencyLevel> {
    // ... existing code ...

    // NEW: Filter skills by prerequisites if character provided
    const availableSkills = character
        ? this.filterSkillsByPrerequisites(validAvailableSkills, registry, character)
        : validAvailableSkills;

    // ... rest of method ...
}
```

**Add New Private Method:**

```typescript
/**
 * Filter skills by prerequisites
 */
private static filterSkillsByPrerequisites(
    skillIds: string[],
    registry: SkillRegistry,
    character: CharacterSheet
): string[] {
    const validSkills: string[] = [];

    for (const skillId of skillIds) {
        const skill = registry.getSkill(skillId);
        if (!skill) continue;

        // Skip skills with unmet prerequisites
        if (skill.prerequisites) {
            const result = SkillValidator.validateSkillPrerequisites(skill, character);
            if (!result.valid) continue;
        }

        validSkills.push(skillId);
    }

    return validSkills;
}
```

### 3.3 Update SkillRegistry

**File:** `src/core/skills/SkillRegistry.ts`

**Add New Method:**

```typescript
/**
 * Validate skill prerequisites against a character
 */
validatePrerequisites(
    skill: CustomSkill,
    character: CharacterSheet
): ValidationResult {
    return SkillValidator.validateSkillPrerequisites(skill, character);
}
```

---

## Phase 4: Spell Prerequisite System

### 4.1 Create SpellValidator (NEW FILE)

**File:** `src/core/spells/SpellValidator.ts` (NEW)

**Complete validation class with:**

```typescript
export class SpellValidator {
    /**
     * Validate a spell
     */
    static validateSpell(spell: unknown): ValidationResult;

    /**
     * Validate spell prerequisites (schema)
     */
    static validatePrerequisites(prerequisites: unknown): ValidationResult;

    /**
     * Validate spell prerequisites against a character
     */
    static validateSpellPrerequisites(
        spell: Spell,
        character: CharacterSheet
    ): ValidationResult;
}
```

Validates:
- Level requirement
- Caster level requirement
- Ability scores
- Class requirement
- Feature prerequisites
- Spell prerequisites
- Skill prerequisites

### 4.2 Update SpellManager

**File:** `src/core/generation/SpellManager.ts`

**Modify getKnownSpells() Method:**

```typescript
static getKnownSpells(
    characterClass: Class,
    characterLevel: number,
    character?: CharacterSheet  // NEW: Add character parameter
): string[] {
    // Get all spells
    const allSpells = [...defaultSpells, ...customSpells];

    // NEW: Filter by prerequisites if character provided
    if (character) {
        return allSpells.filter(spellName => {
            const spell = SPELL_DATABASE[spellName];
            if (!spell || !spell.prerequisites) return true;

            const result = SpellValidator.validateSpellPrerequisites(spell, character);
            return result.valid;
        });
    }

    return allSpells;
}
```

**Add filterSpellsByPrerequisites() private method**

**Update initializeSpells() signature to accept character**

### 4.3 Update CharacterGenerator

**File:** `src/core/generation/CharacterGenerator.ts`

**Pass character to SpellManager.initializeSpells():**

```typescript
const spells = SpellManager.initializeSpells(
    suggestedClass,
    level,
    character  // NEW: Pass character for prerequisite validation
);
```

---

## Phase 5: Custom Race Support

### 5.1 Update ExtensionManager Race Validation

**File:** `src/core/extensions/ExtensionManager.ts`

**Modify Race Validation (Lines 447-452):**

```typescript
} else if (category === 'races') {
    // Races must be a valid Race type OR registered custom race
    const validRaces: Race[] = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'];

    // Check if it's a default race
    if (validRaces.includes(item)) {
        return; // Valid default race
    }

    // Check if it's a previously registered custom race
    const registeredRaces = this.get('races') as string[];
    if (registeredRaces && registeredRaces.includes(item)) {
        return; // Valid custom race
    }

    // Check custom race data registration
    const customRaceData = this.get('races.data');
    if (customRaceData && Array.isArray(customRaceData)) {
        const raceNames = customRaceData.map((d: any) => d.race);
        if (raceNames.includes(item)) {
            return; // Valid custom race (has data registered)
        }
    }

    // If validate is disabled, allow any race
    const currentOptions = this.getCurrentOptions(category);
    if (!currentOptions?.validate) {
        return; // Validation disabled
    }

    errors.push(`${prefix} Invalid race "${item}". Must be one of: ${validRaces.join(', ')} or register custom race via 'races.data' first.`);
}
```

**Add 'races.data' to ExtensionCategory type**

**Add validation for 'races.data' category (validates race, ability_bonuses, speed, traits)**

### 5.2 Add getRaceData() Helper

**File:** `src/utils/constants.ts`

```typescript
export interface RaceDataEntry {
    ability_bonuses: Partial<Record<Ability, number>>;
    speed: number;
    traits: string[];
    // Optional: Available subraces
    subraces?: string[];
}

/**
 * Get race data (default or custom)
 */
export function getRaceData(race: string): RaceDataEntry | undefined {
    // Check default races
    if (race in RACE_DATA) {
        return RACE_DATA[race as Race];
    }

    // Check ExtensionManager for custom race data
    const manager = ExtensionManager.getInstance();
    const customRaceData = manager.get('races.data' as any);

    if (customRaceData && Array.isArray(customRaceData)) {
        const raceEntry = customRaceData.find((d: any) => d.race === race);
        if (raceEntry) {
            return raceEntry as RaceDataEntry;
        }
    }

    return undefined;
}
```

### 5.3 Update AbilityScoreCalculator

**File:** `src/core/generation/AbilityScoreCalculator.ts`

**Update applyRacialBonuses():**

```typescript
static applyRacialBonuses(
    baseScores: AbilityScores,
    race: string  // Changed from Race to string to support custom races
): AbilityScores {
    const raceData = getRaceData(race);

    if (!raceData) {
        console.warn(`Unknown race: "${race}", using no ability bonuses`);
        return { ...baseScores };
    }

    const result = { ...baseScores };

    if (raceData.ability_bonuses) {
        for (const [ability, bonus] of Object.entries(raceData.ability_bonuses)) {
            result[ability as Ability] = (result[ability as Ability] || 0) + bonus;
        }
    }

    return result;
}
```

---

## Phase 6: Subrace Support (NEW)

### 6.1 Add Subrace Property to CharacterSheet

**File:** `src/core/types/Character.ts`

**Add after line 123 (after race property):**

```typescript
/** Race */
race: Race;

/** Subrace (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf') */
subrace?: string;
```

### 6.2 Update FeaturePrerequisite for Subrace

**File:** `src/core/features/FeatureTypes.ts`

**Add subrace property to FeaturePrerequisite interface:**

```typescript
export interface FeaturePrerequisite {
    level?: number;
    features?: string[];
    abilities?: Partial<Record<Ability, number>>;
    class?: Class;
    race?: Race;

    /** NEW: Specific subrace required (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

    /** NEW: Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** NEW: Spells that must be known first (by spell name) */
    spells?: string[];

    custom?: string;
}
```

### 6.3 Update FeatureRegistry.validatePrerequisites()

**File:** `src/core/features/FeatureRegistry.ts`

**Add subrace check after race check (around line 280):**

```typescript
// Check race requirement
if (prereqs.race !== undefined && character.race !== prereqs.race) {
    errors.push(`Requires race ${prereqs.race}`);
}

// NEW: Check subrace requirement
if (prereqs.subrace !== undefined) {
    if (!character.subrace || character.subrace !== prereqs.subrace) {
        errors.push(`Requires subrace ${prereqs.subrace} (current: ${character.subrace || 'none'})`);
    }
}
```

**Add skill prerequisite check (after features check):**

```typescript
// Check skill prerequisites
if (prereqs.skills && prereqs.skills.length > 0) {
    for (const requiredSkillId of prereqs.skills) {
        const proficiency = character.skills[requiredSkillId];
        if (proficiency !== 'proficient' && proficiency !== 'expertise') {
            errors.push(`Requires proficiency in ${requiredSkillId}`);
        }
    }
}
```

**Add spell prerequisite check:**

```typescript
// Check spell prerequisites
if (prereqs.spells && prereqs.spells.length > 0) {
    const knownSpells = character.spells?.known_spells || [];
    for (const requiredSpell of prereqs.spells) {
        if (!knownSpells.includes(requiredSpell)) {
            errors.push(`Requires spell: ${requiredSpell}`);
        }
    }
}
```

### 6.4 Update RacialTrait Assignment for Subrace

**File:** `src/core/generation/CharacterGenerator.ts`

**When assigning racial traits, use character.subrace if present:**

```typescript
// Get racial traits, filtering by subrace if character has one
let racialTraits: RacialTrait[];

if (character.subrace) {
    // Get traits for specific subrace
    const registry = FeatureRegistry.getInstance();
    racialTraits = registry.getRacialTraitsForSubrace(
        character.race,
        character.subrace
    );
} else {
    // Get all traits for race (no subrace filtering)
    racialTraits = this.getRacialTraits(character.race);
}
```

### 6.5 Add Subrace Selection to Race Data

**File:** `src/utils/constants.ts`

**Update RACE_DATA to include available subraces:**

```typescript
export interface RaceDataEntry {
    ability_bonuses: Partial<Record<Ability, number>>;
    speed: number;
    traits: string[];
    // NEW: Available subraces for this race
    subraces?: string[];
}

// Example for Elf:
'Elf': {
    ability_bonuses: { DEX: 2 },
    speed: 30,
    traits: ['Darkvision', 'Fey Ancestry', 'Trance'],
    subraces: ['High Elf', 'Wood Elf', 'Drow']
}
```

---

## Phase 7: Feature Prerequisites Expansion

### 7.1 Update FeatureValidator

**File:** `src/core/features/FeatureValidator.ts`

**Add validation for skills and spells in validatePrerequisites()**

### 7.2 Update RacialTrait Validation

**File:** `src/core/features/FeatureValidator.ts`

**Update validateRacialTrait to allow subrace property validation**

---

## Phase 8: Documentation

### 8.1 Update DATA_ENGINE_REFERENCE.md

**Add Sections:**
1. Skill Prerequisites - New subsection in Skills section
2. Spell Prerequisites - New subsection in Spells section
3. Custom Races - New subsection in Extensibility section
4. Subrace Support - New subsection in Races section
5. Race Trait Prerequisites - New subsection in Features section

**Each section should include:**
- Interface definitions
- Validation rules
- Usage examples
- Cross-references

### 8.2 Update USAGE_IN_OTHER_PROJECTS.md

**Add New Sections:**

**Skills with Prerequisites:**

```typescript
import { SkillRegistry } from 'playlist-data-engine';

const dragonSmithing = {
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],  // Requires Sorcerer feature
        level: 5,
        class: 'Sorcerer'
    },
    source: 'custom'
};

SkillRegistry.getInstance().registerSkill(dragonSmithing);
```

**Spells with Prerequisites:**

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const dragonBreath = {
    id: 'dragon_breath',
    name: 'Dragon Breath',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 ft cone',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'Exhale destructive energy',
    prerequisites: {
        features: ['dragon_bloodline'],
        abilities: { CHA: 16 }
    }
};

manager.register('spells', [dragonBreath]);
```

**Custom Races with Subraces:**

```typescript
import { ExtensionManager } from 'playlist-data-engine';

// Register custom race data with subrace support
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

// Register the race name
manager.register('races', ['Dragonkin'], { validate: true });

// Register subrace-specific racial trait
manager.register('racialTraits', [{
    id: 'fire_dragonkin_fire_resistance',
    name: 'Fire Resistance',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',  // Only for Fire Dragonkin subrace
    prerequisites: {
        subrace: 'Fire Dragonkin'  // Requires this subrace
    },
    effects: [
        { type: 'passive_modifier', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
}]);
```

**Features with Skill/Spell Prerequisites:**

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const arcaneMastery = {
    id: 'arcane_mastery',
    name: 'Arcane Mastery',
    description: 'Bonus to spellcasting based on Arcana skill',
    type: 'passive',
    level: 10,
    class: 'Wizard',
    prerequisites: {
        skills: ['arcana'],  // Requires Arcana proficiency
        level: 10
    },
    effects: [
        { type: 'passive_modifier', target: 'spell_save_dc', value: 1 }
    ],
    source: 'custom'
};

FeatureRegistry.getInstance().registerClassFeature(arcaneMastery);
```

---

## Phase 9: Testing

### 9.1 Unit Tests (NEW FILES)

**File:** `tests/unit/skillPrerequisites.test.ts`

Test Coverage:
- [x] Validate skill prerequisites (level, abilities, class, race, skills, features, spells)
- [x] Reject skills with unmet prerequisites
- [x] Skills with no prerequisites always available
- [x] Multiple prerequisite types combined (AND logic)
- [x] SkillAssigner filters skills by prerequisites
- [x] Dragon-only skills (feature-based)

**File:** `tests/unit/spellPrerequisites.test.ts`

Test Coverage:
- [x] Validate spell prerequisites (level, abilities, features, spells, skills)
- [x] Reject spells with unmet prerequisites
- [x] Spells with no prerequisites always available
- [x] SpellManager filters spells by prerequisites
- [x] Dragon-themed spells (feature-based)

**File:** `tests/unit/customRaces.test.ts`

Test Coverage:
- [x] Register custom race with ExtensionManager
- [x] Custom race data retrieved correctly
- [x] AbilityScoreCalculator applies custom race bonuses
- [x] Custom racial traits with prerequisite validation
- [x] Character generation with custom race
- [x] Validation rejects invalid race data

**File:** `tests/unit/subraces.test.ts`

Test Coverage:
- [x] Character can have subrace property
- [x] Subrace filtering works for racial traits
- [x] FeaturePrerequisite validates subrace correctly
- [x] Custom races can define available subraces
- [x] Subrace-specific traits only apply to correct subrace

### 9.2 Integration Tests (NEW FILE)

**File:** `tests/integration/prerequisitesAndRaces.integration.test.ts`

Test Scenarios:
- [x] Generate character with skill prerequisites met
- [x] Generate character with skill prerequisites unmet (skill not assigned)
- [x] Level up character, new skills with prerequisites become available
- [x] Generate spellcaster with spell prerequisites
- [x] Custom race character with correct bonuses
- [x] Custom race with subrace (High Elf) gets subrace-specific traits
- [x] Custom race with racial trait prerequisites
- [x] Dragon Sorcerer with dragon-only skills/spells
- [x] Save and load character with all prerequisite data
- [x] Feature requiring skill/spell prerequisites

---

## Implementation Summary

### Key Files to Create

1. **Type Definitions**
   - `src/core/skills/SkillTypes.ts` - Add SkillPrerequisite
   - `src/utils/constants.ts` - Add SpellPrerequisite, update Spell interface, getRaceData()
   - `src/core/types/Character.ts` - Add subrace property

2. **Core Systems**
   - `src/core/skills/SkillValidator.ts` - Add prerequisite validation
   - `src/core/spells/SpellValidator.ts` - **NEW FILE**
   - `src/core/skills/SkillRegistry.ts` - Add prerequisite validation

3. **Generators**
   - `src/core/generation/SkillAssigner.ts` - Filter by prerequisites
   - `src/core/generation/SpellManager.ts` - Filter by prerequisites
   - `src/core/generation/AbilityScoreCalculator.ts` - Support custom races, use getRaceData()
   - `src/core/generation/CharacterGenerator.ts` - Pass character to SpellManager, subrace support

4. **Extensibility**
   - `src/core/extensions/ExtensionManager.ts` - Race validation, races.data category

5. **Features**
   - `src/core/features/FeatureTypes.ts` - Add skills/spells/subrace to FeaturePrerequisite
   - `src/core/features/FeatureRegistry.ts` - Validate skills/spells/subrace in prerequisites

6. **Documentation**
   - `docs/PREREQUISITES.md` (**NEW**) - Prerequisites system guide
   - `docs/CUSTOM_CONTENT.md` (**NEW**) - Custom races, classes, and spawn rate control
   - `DATA_ENGINE_REFERENCE.md` - Add sections
   - `USAGE_IN_OTHER_PROJECTS.md` - Add usage examples

### Key Files to Modify

| File | Changes |
|------|---------|
| `src/core/skills/SkillTypes.ts` | Add SkillPrerequisite, update CustomSkill |
| `src/utils/constants.ts` | Add SpellPrerequisite, update Spell, add getRaceData(), RaceDataEntry.subraces |
| `src/core/types/Character.ts` | Add subrace?: string property |
| `src/core/skills/SkillValidator.ts` | Add validateSkillPrerequisites() |
| `src/core/generation/SkillAssigner.ts` | Add character parameter, filter by prerequisites |
| `src/core/skills/SkillRegistry.ts` | Add validatePrerequisites() |
| `src/core/generation/SpellManager.ts` | Add character parameter, filter by prerequisites |
| `src/core/generation/CharacterGenerator.ts` | Pass character to SpellManager, subrace trait assignment |
| `src/core/generation/AbilityScoreCalculator.ts` | Use getRaceData() helper, support custom races |
| `src/core/extensions/ExtensionManager.ts` | Update race validation, add races.data category |
| `src/core/features/FeatureTypes.ts` | Add skills/spells/subrace to FeaturePrerequisite |
| `src/core/features/FeatureValidator.ts` | Validate skills/spells/subrace in prerequisites |
| `src/core/features/FeatureRegistry.ts` | Check skills/spells/subrace in validatePrerequisites() |

---

## Complete Phase Checklist

### Phase 1: Research & Analysis
- [x] Analyze current skill architecture
- [x] Analyze current spell architecture
- [x] Analyze current race architecture
- [x] Analyze subrace system

### Phase 2: Interface Design
- [x] Add SkillPrerequisite interface
- [x] Add SpellPrerequisite interface
- [x] Add subrace property to CharacterSheet
- [x] Design race extensibility strategy (Option A: Keep Race closed union, use getRaceData helper)

### Phase 3: Skill Prerequisites
- [x] Create SkillValidator prerequisite validation
- [x] Update SkillAssigner for filtering
- [x] Update SkillRegistry

### Phase 4: Spell Prerequisites
- [x] Create SpellValidator
- [x] Update SpellManager for filtering
- [x] Update CharacterGenerator

### Phase 5: Custom Races
- [x] Update ExtensionManager race validation
- [x] Create RACE_DATA extensibility (getRaceData helper)
- [x] Update AbilityScoreCalculator

### Phase 6: Subrace Support (NEW)
- [x] Add subrace property to CharacterSheet
- [x] Update FeaturePrerequisite for subrace
- [x] Update FeatureRegistry.validatePrerequisites() for subrace
- [x] Update racial trait assignment for subrace
- [x] Add subraces to RaceDataEntry

### Phase 7: Feature Prerequisites Expansion
- [x] Update FeatureValidator for skills/spells/subrace
- [x] Update RacialTrait validation

### Phase 8: Documentation
- [x] Update DATA_ENGINE_REFERENCE.md
- [x] Update USAGE_IN_OTHER_PROJECTS.md
- [x] Create docs/PREREQUISITES.md (prerequisites guide)
- [x] Create docs/CUSTOM_CONTENT.md (custom races, classes, spawn rates)

- [x] Write unit tests for skill prerequisites

### Phase 9: Testing
- [x] Write unit tests for skill prerequisites
- [x] Write unit tests for spell prerequisites
- [x] Write unit tests for custom races (29 tests passing - fixed ESM/CJS interop issue)
- [x] Write unit tests for subraces (28 tests passing)
- [x] Write integration tests (33 tests passing)

---

## Examples: Dragon-Themed Content with Subraces

### Skill with Prerequisites

```typescript
const dragonSmithing: CustomSkill = {
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],  // From Sorcerer feature
        level: 5,
        class: 'Sorcerer'
    },
    source: 'custom'
};
```

### Spell with Prerequisites

```typescript
const dragonBreath: Spell = {
    id: 'dragon_breath',
    name: 'Dragon Breath',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 ft cone',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'Exhale destructive energy',
    prerequisites: {
        features: ['dragon_bloodline'],
        abilities: { CHA: 16 }
    }
};
```

### Custom Race with Subraces

```typescript
// Register custom race data with subrace support
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

// Register the race name
manager.register('races', ['Dragonkin']);

// Register subrace-specific racial trait
manager.register('racialTraits', [{
    id: 'fire_dragonkin_fire_resistance',
    name: 'Fire Resistance',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',  // Only for this subrace
    prerequisites: {
        subrace: 'Fire Dragonkin'
    },
    effects: [
        { type: 'passive_modifier', target: 'ac', value: 1 }
    ],
    source: 'custom'
}]);
```

### Feature with Skill Prerequisites

```typescript
const arcaneSmith = {
    id: 'arcane_smith',
    name: 'Arcane Smith',
    description: 'Can enchant magical items',
    type: 'active',
    level: 7,
    class: 'Wizard',
    prerequisites: {
        skills: ['arcana'],  // Requires Arcana proficiency
        level: 7
    },
    effects: [
        { type: 'ability_unlock', target: 'item_enchantment', value: true }
    ],
    source: 'custom'
};
```

---

## Notes

- **Backward Compatibility**: All changes are additive; existing skills/spells/races continue to work
- **Follows Phase 11 Pattern**: Reuse FeaturePrerequisite validation pattern for consistency
- **Custom Races**: Requires source code type change OR type augmentation in user's project
- **Subraces**: Now fully functional - characters can have subraces and traits can require them
- **Validation**: Can be disabled with `{ validate: false }` for advanced users
- **Performance**: Prerequisite filtering happens at generation time, not runtime

---
