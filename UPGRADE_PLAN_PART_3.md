# Upgrade Plan Part 3: Prerequisites & Custom Races

## Overview

Upgrade the Playlist Data Engine to support:
1. **Skill Prerequisites**: Skills that require specific features, abilities, or other skills
2. **Spell Prerequisites**: Spells that require specific features, abilities, or level
3. **Custom Race Support**: Fully extensible custom races (not blocked by validation)
4. **Race Trait Prerequisites**: Race traits that unlock based on stat combinations

**Design Principles:**
- **Backward Compatible**: Existing skills, spells, and races continue to work
- **Follows Phase 11 Pattern**: Reuse `FeaturePrerequisite` pattern for consistency
- **Validation First**: All prerequisites validated before assignment
- **Type Safe**: Maintain TypeScript type safety
- **Extensible**: Custom races register same as custom equipment/features

---

## Phase 1: Research & Analysis

### 1.1 Analyze Current Skill Architecture

**Research Tasks:**
- [x] Map current skill data flow
- [x] Identify CustomSkill interface structure
- [x] Analyze SkillValidator capabilities
- [x] Review SkillAssigner assignment logic
- [x] Identify existing prerequisite pattern (FeaturePrerequisite)

**Files Analyzed:**
- `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillTypes.ts` - CustomSkill interface (no prerequisites)
- `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillValidator.ts` - Validation (no prerequisite checks)
- `/Users/jasondesante/playlist-data-engine/src/core/generation/SkillAssigner.ts` - Assignment (no filtering)
- `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureTypes.ts` - FeaturePrerequisite pattern

**Deliverable:** Complete skill architecture analysis

---

### 1.2 Analyze Current Spell Architecture

**Research Tasks:**
- [x] Map current spell data flow
- [x] Identify Spell interface structure
- [x] Analyze SpellManager capabilities
- [x] Review CLASS_SPELL_LISTS structure
- [x] Identify existing prerequisite pattern to follow

**Files Analyzed:**
- `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` - Spell interface, SPELL_DATABASE, CLASS_SPELL_LISTS
- `/Users/jasondesante/playlist-data-engine/src/core/generation/SpellManager.ts` - Spell management
- `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureTypes.ts` - FeaturePrerequisite pattern

**Deliverable:** Complete spell architecture analysis

---

### 1.3 Analyze Current Race Architecture

**Research Tasks:**
- [x] Map Race type definition
- [x] Identify RacialTrait interface structure
- [x] Analyze ExtensionManager race validation
- [x] Review RACE_DATA structure
- [x] Check if custom races are blocked

**Files Analyzed:**
- `/Users/jasondesante/playlist-data-engine/src/core/types/Character.ts` - Race type (closed union)
- `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureTypes.ts` - RacialTrait interface
- `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts` - Race validation (blocks custom races)
- `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` - RACE_DATA

**Key Finding:** Custom races are BLOCKED by validation (same issue as custom classes)

**Deliverable:** Complete race architecture analysis

---

## Phase 2: Interface Design

### 2.1 Add Skill Prerequisite Types

**File:** `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillTypes.ts` (NEW)

**New Interface to Add:**

```typescript
/**
 * Prerequisites for learning or using a skill
 *
 * Follows the same pattern as FeaturePrerequisite for consistency
 */
export interface SkillPrerequisite {
    /** Minimum character level required */
    level?: number;

    /** Features that must be learned first */
    features?: string[];

    /** Minimum ability scores required */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: 'Barbarian' | 'Bard' | 'Cleric' | 'Druid' | 'Fighter' | 'Monk' | 'Paladin' | 'Ranger' | 'Rogue' | 'Sorcerer' | 'Warlock' | 'Wizard';

    /** Specific race required */
    race?: 'Human' | 'Elf' | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling';

    /** Skills that must be proficient first */
    skills?: string[];

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

**Deliverable:** Updated skill types with prerequisite support

---

### 2.2 Add Spell Prerequisite Types

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`

**Update Spell Interface:**

```typescript
export interface Spell {
    id: string;              // NEW: Unique identifier (was using name as key)
    name: string;
    level: number;           // 0-9 (0 = cantrips)
    school: 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';
    casting_time: string;
    range: string;
    components: string[];
    duration: string;
    description?: string;  // NEW: Spell description

    // NEW: Prerequisites for learning this spell
    prerequisites?: SpellPrerequisite;
}

/**
 * Prerequisites for learning a spell
 *
 * Similar to FeaturePrerequisite but spell-specific
 */
export interface SpellPrerequisite {
    /** Minimum character level */
    level?: number;

    /** Minimum spellcaster level (if different from character level) */
    casterLevel?: number;

    /** Features that must be learned first */
    features?: string[];

    /** Minimum ability scores */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: string;

    /** Spells that must be known first */
    spells?: string[];

    /** Custom condition */
    custom?: string;
}
```

**Deliverable:** Updated spell types with prerequisite support

---

### 2.3 Update Race Type for Extensibility

**File:** `/Users/jasondesante/playlist-data-engine/src/core/types/Character.ts`

**Option A: Keep as closed union (requires source changes for each new race)**

```typescript
export type Race =
    | 'Human'
    | 'Elf'
    | 'Dwarf'
    | 'Halfling'
    | 'Dragonborn'
    | 'Gnome'
    | 'Half-Elf'
    | 'Half-Orc'
    | 'Tiefling';
```

**Option B: Open to custom races via type augmentation**

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

**Recommendation:** Use Option A for now, document Option B as advanced usage.

**Deliverable:** Decision on race type strategy

---

## Phase 3: Skill Prerequisite System

### 3.1 Create SkillValidator Enhancements

**File:** `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillValidator.ts`

**New Methods to Add:**

```typescript
/**
 * Validate skill prerequisites
 */
export function validateSkillPrerequisites(
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
        for (const requiredSkill of prereqs.skills) {
            const proficiency = character.skills[requiredSkill];
            if (proficiency !== 'proficient' && proficiency !== 'expertise') {
                unmet.push(`Requires proficiency in ${requiredSkill} (current: ${proficiency})`);
            }
        }
    }

    // Check feature prerequisites
    if (prereqs.features) {
        const hasFeatures = character.class_features || [];
        for (const requiredFeature of prereqs.features) {
            if (!hasFeatures.includes(requiredFeature)) {
                unmet.push(`Requires feature: ${requiredFeature}`);
            }
        }
    }

    return {
        valid: unmet.length === 0,
        unmet: unmet.length > 0 ? unmet : undefined
    };
}
```

**Deliverable:** Skill prerequisite validation

---

### 3.2 Update SkillAssigner for Prerequisites

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/SkillAssigner.ts`

**Modify assignSkills() Method:**

```typescript
static assignSkills(
    characterClass: Class,
    rng: SeededRNG
): Record<Skill, ProficiencyLevel> {
    // Initialize all skills to 'none'
    const skills: Record<Skill, ProficiencyLevel> = {};
    ALL_SKILLS.forEach(skill => skills[skill] = 'none');

    // Get class data
    const classData = CLASS_DATA[characterClass];

    // Validate available skills
    const validAvailableSkills = this.validateSkills(classData.available_skills, registry);

    // NEW: Filter skills by prerequisites
    const availableSkills = validAvailableSkills.filter(skillId => {
        const skill = registry.getSkill(skillId);
        if (!skill) return false;

        // Skip skills with unmet prerequisites
        if (skill.prerequisites) {
            const result = SkillValidator.validateSkillPrerequisites(skill, character);
            return result.valid;
        }

        return true;
    });

    // Select N skills from filtered list
    const selectedSkills = this.selectSkills(
        availableSkills,
        classData.skill_count,
        rng
    );

    // Assign proficiencies
    selectedSkills.forEach(skillId => {
        skills[skillId] = 'proficient';
    });

    // Handle expertise
    if (classData.has_expertise && classData.expertise_count) {
        // ... existing expertise logic
    }

    return skills;
}
```

**Deliverable:** Updated SkillAssigner with prerequisite filtering

---

### 3.3 Update SkillRegistry

**File:** `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillRegistry.ts`

**Add Prerequisite Validation Method:**

```typescript
/**
 * Validate skill prerequisites
 */
validatePrerequisites(
    skill: CustomSkill,
    character: CharacterSheet
): ValidationResult {
    return SkillValidator.validateSkillPrerequisites(skill, character);
}
```

**Deliverable:** SkillRegistry prerequisite validation

---

## Phase 4: Spell Prerequisite System

### 4.1 Create SpellValidator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/spells/SpellValidator.ts` (NEW)

**Key Methods:**

```typescript
/**
 * Validate spell prerequisites
 */
export function validateSpellPrerequisites(
    spell: Spell,
    character: CharacterSheet
): ValidationResult {
    const unmet: string[] = [];

    if (!spell.prerequisites) {
        return { valid: true };
    }

    const prereqs = spell.prerequisites;

    // Check level
    if (prereqs.level && character.level < prereqs.level) {
        unmet.push(`Requires level ${prereqs.level}`);
    }

    // Check caster level
    if (prereqs.casterLevel && character.level < prereqs.casterLevel) {
        unmet.push(`Requires caster level ${prereqs.casterLevel}`);
    }

    // Check abilities
    if (prereqs.abilities) {
        for (const [ability, minScore] of Object.entries(prereqs.abilities)) {
            if (character.ability_scores[ability] < minScore) {
                unmet.push(`Requires ${ability} ${minScore}+`);
            }
        }
    }

    // Check features
    if (prereqs.features) {
        const hasFeatures = character.class_features || [];
        for (const feature of prereqs.features) {
            if (!hasFeatures.includes(feature)) {
                unmet.push(`Requires feature: ${feature}`);
            }
        }
    }

    // Check spells
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

**Deliverable:** SpellValidator with prerequisite validation

---

### 4.2 Update SpellManager

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/SpellManager.ts`

**Modify getKnownSpells() Method:**

```typescript
static getKnownSpells(
    characterClass: Class,
    characterLevel: number,
    character?: CharacterSheet  // NEW: Add character parameter
): string[] {
    // Get default spells
    const defaultSpells = CLASS_SPELL_LISTS[characterClass]?.spells_by_level[characterLevel] || [];

    // Get custom spells from ExtensionManager
    const customSpells = this.getCustomSpells(characterClass, characterLevel);

    // Combine
    const allSpells = [...defaultSpells, ...customSpells];

    // NEW: Filter by prerequisites if character provided
    if (character) {
        const filteredSpells = allSpells.filter(spellName => {
            const spell = SPELL_DATABASE[spellName];
            if (!spell || !spell.prerequisites) {
                return true; // No prerequisites = always available
            }

            const result = SpellValidator.validateSpellPrerequisites(spell, character);
            return result.valid;
        });

        return filteredSpells;
    }

    return allSpells;
}
```

**Update initializeSpells() signature:**

```typescript
static initializeSpells(
    characterClass: Class,
    characterLevel: number,
    character: CharacterSheet  // NEW: Pass character for prerequisite validation
): SpellSlots {
    const cantrips = this.getCantrips(characterClass);
    const knownSpells = this.getKnownSpells(characterClass, characterLevel, character);
    // ... rest of method
}
```

**Deliverable:** SpellManager with prerequisite filtering

---

### 4.3 Update CharacterGenerator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/CharacterGenerator.ts`

**Update Spell Initialization Call:**

```typescript
// Generate spells (now with prerequisite filtering)
const spells = SpellManager.initializeSpells(
    suggestedClass,
    level,
    character  // NEW: Pass character for prerequisite validation
);
```

**Deliverable:** CharacterGenerator integration with spell prerequisites

---

## Phase 5: Custom Race Support

### 5.1 Update Race Validation

**File:** `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts`

**Modify Race Validation (Lines 447-452):**

```typescript
} else if (category === 'races') {
    // Races must be a valid Race type OR registered custom race
    const validRaces: Race[] = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'];

    // Check if it's a default race
    if (validRaces.includes(item)) {
        return; // Valid
    }

    // Check if it's a previously registered custom race
    const registeredRaces = this.get('races') as string[];
    if (registeredRaces && registeredRaces.includes(item)) {
        return; // Valid custom race
    }

    // NEW: If validate is disabled, allow any race (for advanced users)
    const currentOptions = this.getCurrentOptions('races');
    if (!currentOptions?.validate) {
        return; // Validation disabled
    }

    errors.push(`${prefix} Invalid race (must be one of: ${validRaces.join(', ')}) or register custom race first`);
}
```

**Deliverable:** Updated race validation supporting custom races

---

### 5.2 Update RACE_DATA for Custom Races

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`

**Make RACE_DATA Extensible:**

```typescript
// Add default race data
export const DEFAULT_RACE_DATA: Record<Race, RaceDataEntry> = {
    'Human': {
        ability_bonuses: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
        speed: 30,
        traits: ['Versatile', 'Extra Language']
    },
    // ... other default races
};

export interface RaceDataEntry {
    ability_bonuses: Partial<Record<Ability, number>>;
    speed: number;
    traits: string[];
}

// Helper function to get race data (with fallback)
export function getRaceData(race: string): RaceDataEntry | undefined {
    // Check default races
    if (race in DEFAULT_RACE_DATA) {
        return DEFAULT_RACE_DATA[race as Race];
    }

    // Check ExtensionManager for custom race data
    const manager = ExtensionManager.getInstance();
    const customRaceData = manager.get('races.data');
    if (customRaceData && race in customRaceData) {
        return customRaceData[race];
    }

    return undefined;
}
```

**Deliverable:** Extensible RACE_DATA system

---

### 5.3 Update AbilityScoreCalculator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/AbilityScoreCalculator.ts`

**Update applyRacialBonuses():**

```typescript
static applyRacialBonuses(
    baseScores: AbilityScores,
    race: string
): AbilityScores {
    // Use helper function that checks defaults + ExtensionManager
    const raceData = getRaceData(race);

    if (!raceData) {
        console.warn(`Unknown race: ${race}, using no bonuses`);
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

**Deliverable:** AbilityScoreCalculator supporting custom races

---

### 5.4 Register Custom Race Data via ExtensionManager

**File:** `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts`

**Add 'races.data' category:**

```typescript
export type ExtensionCategory =
    | 'races'
    | 'races.data'     // NEW: Custom race definitions
    | 'spells'
    | 'equipment'
    // ... other categories
```

**Add validation for race data:**

```typescript
} else if (category === 'races.data') {
    // Validate custom race data structure
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const prefix = item.race ? `Race "${item.race}"` : `Item at index ${i}`;

        if (!item.race || typeof item.race !== 'string') {
            errors.push(`${prefix} Missing or invalid 'race' property`);
        }

        if (!item.ability_bonuses || typeof item.ability_bonuses !== 'object') {
            errors.push(`${prefix} Missing or invalid 'ability_bonuses'`);
        }

        if (typeof item.speed !== 'number' || item.speed < 0) {
            errors.push(`${prefix} Invalid 'speed' (must be >= 0)`);
        }

        if (!Array.isArray(item.traits)) {
            errors.push(`${prefix} Missing or invalid 'traits' array`);
        }
    }
}
```

**Deliverable:** Custom race data registration support

---

## Phase 6: Documentation

### 6.1 Update DATA_ENGINE_REFERENCE.md

**File:** `/Users/jasondesante/playlist-data-engine/DATA_ENGINE_REFERENCE.md`

**Add Sections:**
1. Skill Prerequisites - New subsection in Skills section
2. Spell Prerequisites - New subsection in Spells section
3. Custom Races - New subsection in Extensibility section
4. Race Trait Prerequisites - New subsection in Features section

**Each section should include:**
- Interface definitions
- Validation rules
- Usage examples
- Cross-references

**Deliverable:** Updated reference documentation

---

### 6.2 Update USAGE_IN_OTHER_PROJECTS.md

**File:** `/Users/jasondesante/playlist-data-engine/USAGE_IN_OTHER_PROJECTS.md`

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
        level: 5
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

**Custom Races:**

```typescript
import { ExtensionManager } from 'playlist-data-engine';

// Register custom race data
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision']
}]);

// Register the race name
manager.register('races', ['Dragonkin'], { validate: true });

// Register racial traits
manager.register('racialTraits', [{
    id: 'dragonkin_scales',
    name: 'Draconic Scales',
    race: 'Dragonkin',  // Use custom race name
    prerequisites: {
        abilities: { CON: 13 }  // Requires 13 CON for tough scales
    },
    effects: [
        { type: 'passive_modifier', target: 'ac', value: 1 }
    ],
    source: 'custom'
}]);
```

**Deliverable:** Usage documentation with examples

---

## Phase 7: Testing

### 7.1 Unit Tests

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/skillPrerequisites.test.ts` (NEW)

**Test Coverage:**
- [ ] Validate skill prerequisites (level, abilities, class, race, skills, features)
- [ ] Reject skills with unmet prerequisites
- [ ] Skills with no prerequisites always available
- [ ] Multiple prerequisite types combined (AND logic)
- [ ] SkillAssigner filters skills by prerequisites
- [ ] Dragon-only skills (feature-based)

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/spellPrerequisites.test.ts` (NEW)

**Test Coverage:**
- [ ] Validate spell prerequisites (level, abilities, features, spells)
- [ ] Reject spells with unmet prerequisites
- [ ] Spells with no prerequisites always available
- [ ] SpellManager filters spells by prerequisites
- [ ] Dragon-themed spells (feature-based)

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/customRaces.test.ts` (NEW)

**Test Coverage:**
- [ ] Register custom race with ExtensionManager
- [ ] Custom race data retrieved correctly
- [ ] AbilityScoreCalculator applies custom race bonuses
- [ ] Custom racial traits with prerequisite validation
- [ ] Character generation with custom race
- [ ] Validation rejects invalid race data

**Deliverable:** Complete unit test coverage

---

### 7.2 Integration Tests

**File:** `/Users/jasondesante/playlist-data-engine/tests/integration/prerequisitesAndRaces.integration.test.ts` (NEW)

**Test Scenarios:**
- [ ] Generate character with skill prerequisites met
- [ ] Generate character with skill prerequisites unmet (skill not assigned)
- [ ] Level up character, new skills with prerequisites become available
- [ ] Generate spellcaster with spell prerequisites
- [ ] Custom race character with correct bonuses
- [ ] Custom race with racial trait prerequisites
- [ ] Dragon Sorcerer with dragon-only skills/spells
- [ ] Save and load character with all prerequisite data

**Deliverable:** Complete integration test coverage

---

## Implementation Summary

### Key Files to Create

1. **Type Definitions**
   - `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillTypes.ts` - Add SkillPrerequisite
   - `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` - Add SpellPrerequisite, update Spell/Race interfaces

2. **Core Systems**
   - `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillValidator.ts` - Add prerequisite validation
   - `/Users/jasondesante/playlist-data-engine/src/core/spells/SpellValidator.ts` - NEW
   - `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillRegistry.ts` - Add prerequisite validation

3. **Generators**
   - `/Users/jasondesante/playlist-data-engine/src/core/generation/SkillAssigner.ts` - Filter by prerequisites
   - `/Users/jasondesante/playlist-data-engine/src/core/generation/SpellManager.ts` - Filter by prerequisites
   - `/Users/jasondesante/playlist-data-engine/src/core/generation/AbilityScoreCalculator.ts` - Support custom races

4. **Extensibility**
   - `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts` - Race validation, races.data category
   - `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` - RACE_DATA refactoring

5. **Documentation**
   - `/Users/jasondesante/playlist-data-engine/docs/PREREQUISITES_AND_RACES.md` (NEW) - Complete reference
   - `/Users/jasondesante/playlist-data-engine/DATA_ENGINE_REFERENCE.md` - Add sections
   - `/Users/jasondesante/playlist-data-engine/USAGE_IN_OTHER_PROJECTS.md` - Add usage examples

### Key Files to Modify

| File | Changes |
|------|---------|
| `src/core/skills/SkillTypes.ts` | Add SkillPrerequisite, update CustomSkill |
| `src/utils/constants.ts` | Add SpellPrerequisite, update Spell/Race interfaces, add getRaceData() |
| `src/core/skills/SkillValidator.ts` | Add prerequisite validation |
| `src/core/generation/SkillAssigner.ts` | Filter skills by prerequisites |
| `src/core/generation/SpellManager.ts` | Filter spells by prerequisites, update initializeSpells() signature |
| `src/core/generation/CharacterGenerator.ts` | Pass character to SpellManager |
| `src/core/generation/AbilityScoreCalculator.ts` | Use getRaceData() helper |
| `src/core/extensions/ExtensionManager.ts` | Update race validation, add races.data category |
| `src/core/features/FeatureTypes.ts` | Already has prerequisite system (reuse pattern) |

---

## Complete Phase Checklist

### Phase 1: Research & Analysis
- [x] Analyze current skill architecture
- [x] Analyze current spell architecture
- [x] Analyze current race architecture

### Phase 2: Interface Design
- [ ] Add SkillPrerequisite interface
- [ ] Add SpellPrerequisite interface
- [ ] Design race extensibility strategy

### Phase 3: Skill Prerequisites
- [ ] Create SkillValidator prerequisite validation
- [ ] Update SkillAssigner for filtering
- [ ] Update SkillRegistry

### Phase 4: Spell Prerequisites
- [ ] Create SpellValidator
- [ ] Update SpellManager for filtering
- [ ] Update CharacterGenerator

### Phase 5: Custom Races
- [ ] Update ExtensionManager race validation
- [ ] Create RACE_DATA extensibility
- [ ] Update AbilityScoreCalculator
- [ ] Add races.data category to ExtensionManager

### Phase 6: Documentation
- [ ] Update DATA_ENGINE_REFERENCE.md
- [ ] Update USAGE_IN_OTHER_PROJECTS.md

### Phase 7: Testing
- [ ] Write unit tests for skill prerequisites
- [ ] Write unit tests for spell prerequisites
- [ ] Write unit tests for custom races
- [ ] Write integration tests

---

## Examples: Dragon-Themed Content

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
    prerequisites: {
        features: ['dragon_bloodline'],
        abilities: { CHA: 16 }
    }
};
```

### Custom Race

```typescript
// Register custom race data
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision']
}]);

// Register the race name
manager.register('races', ['Dragonkin']);

// Register racial trait with prerequisite
manager.register('racialTraits', [{
    id: 'dragonkin_scales',
    name: 'Draconic Scales',
    race: 'Dragonkin',
    prerequisites: {
        abilities: { CON: 13 }  // Tough scales
    },
    effects: [
        { type: 'passive_modifier', target: 'ac', value: 1 }
    ],
    source: 'custom'
}]);
```

---

## Notes

- **Backward Compatibility**: All changes are additive; existing skills/spells/races continue to work
- **Follows Phase 11 Pattern**: Reuse FeaturePrerequisite validation pattern for consistency
- **Custom Races**: Requires source code type change OR type augmentation in user's project
- **Validation**: Can be disabled with `{ validate: false }` for advanced users
- **Performance**: Prerequisite filtering happens at generation time, not runtime

