# Prerequisites Reference

Complete guide to the prerequisite system for skills, spells, and features in the Playlist Data Engine.

---

## Table of Contents

1. [Overview](#overview)
2. [Skill Prerequisites](#skill-prerequisites)
3. [Spell Prerequisites](#spell-prerequisites)
4. [Feature Prerequisites](#feature-prerequisites)
5. [Validation System](#validation-system)
6. [Examples](#examples)
7. [API Reference](#api-reference)
8. [Best Practices](#best-practices)

---

## Overview

The Playlist Data Engine supports a comprehensive prerequisite system that allows skills, spells, and features to require specific conditions before they can be learned or used.

### Key Features

- **Skill Prerequisites**: Skills can require levels, abilities, other skills, features, or spells
- **Spell Prerequisites**: Spells can require levels, abilities, features, other spells, or skills
- **Feature Prerequisites**: Features can require levels, abilities, skills, spells, or subraces

### Design Principles

- **Backward Compatible**: Existing skills, spells, races, and characters continue to work
- **Consistent Pattern**: All prerequisite types follow the same `FeaturePrerequisite` pattern
- **Validation First**: All prerequisites validated before assignment
- **Type Safe**: Full TypeScript type safety maintained
- **Extensible**: Custom content registered same as default content

---

## Skill Prerequisites

Skills can have prerequisites that must be met before a character can gain proficiency in them.

### SkillPrerequisite Interface

```typescript
interface SkillPrerequisite {
    /** Minimum character level required */
    level?: number;

    /** Minimum ability scores required */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race required */
    race?: Race;

    /** Specific subrace required (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

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

### CustomSkill with Prerequisites

```typescript
interface CustomSkill {
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

    /** Prerequisites for learning this skill */
    prerequisites?: SkillPrerequisite;
}
```

### Validation

Skill prerequisites are validated automatically during:

1. **Skill Registration**: Schema validation ensures prerequisite structure is valid
2. **Skill Assignment**: During character generation, skills with unmet prerequisites are filtered out
3. **Manual Validation**: Use `SkillValidator.validateSkillPrerequisites()` or `SkillQuery.validatePrerequisites()`

### Example Skill with Prerequisites

```typescript
import { SkillQuery } from 'playlist-data-engine';

// Advanced skill requiring a specific feature
const dragonSmithing = {
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT' as const,
    prerequisites: {
        features: ['draconic_bloodline'],  // Requires Sorcerer feature
        level: 5,
        class: 'Sorcerer' as const
    },
    source: 'custom' as const
};

ExtensionManager.getInstance().register('skills', [dragonSmithing]);
// Cache is automatically invalidated after registration

// ===== SKILL WITH ABILITY SCORE AND SKILL PREREQUISITES =====
// Advanced Arcana: Requires INT 16 and proficiency in Arcana
const advancedArcana = {
    id: 'advanced_arcana',
    name: 'Advanced Arcana',
    description: 'Cast complex spells and understand magical theory',
    ability: 'INT' as const,
    prerequisites: {
        abilities: { INT: 16 },  // Requires INT 16 or higher
        skills: ['arcana'],       // Must already know Arcana
        level: 7
    },
    source: 'custom' as const
};

ExtensionManager.getInstance().register('skills', [advancedArcana]);

// ===== SKILL WITH SPELL PREREQUISITES =====
// Spell Mastery: Requires knowing specific spells first
const spellMasterySkill = {
    id: 'spell_mastery',
    name: 'Spell Mastery',
    description: 'Improved control over known spells',
    ability: 'INT' as const,
    prerequisites: {
        spells: ['Fireball', 'Lightning Bolt'],  // Must know these spells
        class: 'Wizard' as const,
        level: 10
    },
    source: 'custom' as const
};

ExtensionManager.getInstance().register('skills', [spellMasterySkill]);

// ===== SKILL WITH RACE PREREQUISITES =====
// Dwarven Combat Training: Dwarf only
const dwarvenCombat = {
    id: 'dwarven_warfare',
    name: 'Dwarven Warfare',
    description: 'Advanced dwarven combat techniques',
    ability: 'STR' as const,
    prerequisites: {
        race: 'Dwarf' as const
    },
    source: 'custom' as const
};

ExtensionManager.getInstance().register('skills', [dwarvenCombat]);

// ===== VALIDATING SKILL PREREQUISITES =====
import { SkillQuery, SkillValidator, CharacterGenerator } from 'playlist-data-engine';

const query = SkillQuery.getInstance();
const character = CharacterGenerator.generate(seed, audioProfile, track);
const skill = query.getSkill('dragon_smithing');

if (skill && skill.prerequisites) {
    const result = SkillValidator.validateSkillPrerequisites(skill.prerequisites, character);

    if (!result.valid) {
        console.log('Unmet prerequisites:', result.errors);
        // Output example: ["Requires feature: draconic_bloodline", "Requires level 5 (current: 1)"]
    }
}

// Skills with unmet prerequisites are automatically
// filtered out during character generation
```

## Spell Prerequisites

Spells can have prerequisites that must be met before they can be learned.

### SpellPrerequisite Interface

```typescript
interface SpellPrerequisite {
    /** Minimum character level */
    level?: number;

    /** Minimum spellcaster level (if different from character level) */
    casterLevel?: number;

    /** Minimum ability scores */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race required */
    race?: Race;

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

### Spell with Prerequisites

```typescript
import type { SpellSchool } from 'playlist-data-engine';

interface Spell {
    /** Unique identifier (optional for backward compatibility) */
    id?: string;

    name: string;
    level: number;           // 0-9 (0 = cantrips)
    school: SpellSchool;     // D&D 5e schools of magic
    casting_time: string;
    range: string;
    components: string[];
    duration: string;
    description?: string;

    /** Prerequisites for learning this spell */
    prerequisites?: SpellPrerequisite;
}
```

### Validation

Spell prerequisites are validated automatically during:

1. **Spell Registration**: Schema validation via `SpellValidator.validateSpell()`
2. **Spell Assignment**: During character generation, `SpellManager` filters spells by prerequisites
3. **Manual Validation**: Use `SpellValidator.validateSpellPrerequisites()`

### Example Spell with Prerequisites

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

ExtensionManager.getInstance().register('spells', [dragonBreath]);
```

---

## Feature Prerequisites

Features (class features and racial traits) can have prerequisites that must be met.

### FeaturePrerequisite Interface

```typescript
interface FeaturePrerequisite {
    /** Minimum level required */
    level?: number;

    /** Features that must be learned first (by ID) */
    features?: string[];

    /** Minimum ability scores required */
    abilities?: Partial<Record<Ability, number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race required */
    race?: Race;

    /** Specific subrace required (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Custom condition description */
    custom?: string;
}
```

### Validation

Feature prerequisites are validated via `FeatureQuery.validatePrerequisites()` which checks:

- Level requirement
- Ability scores
- Class requirement
- Race requirement
- **Subrace requirement**
- **Skill prerequisites** (skills must be proficient or expertise)
- **Spell prerequisites** (spells must be in known_spells)
- Feature prerequisites (features must be in class_features)
- Custom conditions

### Example Feature with Skill/Spell Prerequisites

```typescript
import { FeatureQuery } from 'playlist-data-engine';

const arcaneMastery = {
    id: 'arcane_mastery',
    name: 'Arcane Mastery',
    description: 'Bonus to spellcasting based on Arcana skill',
    type: 'passive' as const,
    level: 10,
    class: 'Wizard' as const,
    prerequisites: {
        skills: ['arcana'],  // Requires Arcana proficiency
        level: 10
    },
    effects: [
        { type: 'passive_modifier' as const, target: 'spell_save_dc', value: 1 }
    ],
    source: 'custom' as const
};

ExtensionManager.getInstance().register('classFeatures', [arcaneMastery]);
// Cache is automatically invalidated after registration

// ===== FEATURE REQUIRING SPELL KNOWLEDGE =====
// Spellblade: Requires knowing specific spells
const spellblade = {
    id: 'spellblade',
    name: 'Spellblade',
    description: 'Channel spells through your weapon',
    type: 'active' as const,
    level: 10,
    class: 'Eldritch Knight' as const,
    prerequisites: {
        spells: ['Green-Flame Blade', 'Booming Blade'],
        features: ['weapon_bond']
    },
    effects: [
        { type: 'passive_modifier' as const, target: 'spell_strike_damage', value: 4 }
    ],
    source: 'custom' as const
};

ExtensionManager.getInstance().register('classFeatures', [spellblade]);

// ===== RACIAL TRAIT WITH SKILL PREREQUISITES =====
// Elven Battle Training: Requires proficiency in combat skills
const elvenBattleTraining = {
    id: 'elven_battle_training',
    name: 'Elven Battle Training',
    description: 'Advanced elven combat techniques',
    type: 'active' as const,
    race: 'Elf' as const,
    prerequisites: {
        skills: ['athletics', 'perception'],  // Must have both skills
        level: 3
    },
    effects: [
        { type: 'passive_modifier' as const, target: 'initiative', value: 2 }
    ],
    source: 'custom' as const
};

ExtensionManager.getInstance().register('racialTraits', [elvenBattleTraining]);

// ===== VALIDATE FEATURE PREREQUISITES =====
import { FeatureQuery, CharacterGenerator } from 'playlist-data-engine';

const query = FeatureQuery.getInstance();
const character = CharacterGenerator.generate(seed, audioProfile, track, { forceName: 'Elf Warrior' });
const features = query.getClassFeatures('Wizard', character.level);
const feature = features.find(f => f.id === 'arcane_mastery');

if (feature) {
    const result = query.validatePrerequisites(feature, character);

    if (!result.valid) {
        console.log('Cannot learn feature:', result.unmet || result.errors);
    }
}

// Features with unmet prerequisites are automatically
// excluded during character generation
```

## Validation System

### ValidationResult Interfaces

Different validators return slightly different result types:

#### Feature ValidationResult (FeatureQuery)

```typescript
interface ValidationResult {
    /** Whether all prerequisites are met */
    valid: boolean;

    /** Array of prerequisite descriptions that are not met */
    unmet?: string[];

    /** Detailed error messages */
    errors?: string[];
}
```

#### Skill ValidationResult (SkillValidator)

```typescript
interface SkillValidationResult {
    /** Whether all prerequisites are met */
    valid: boolean;

    /** Array of error messages (required, empty if valid) */
    errors: string[];
}
```

#### Spell ValidationResult (SpellValidator)

```typescript
interface SpellValidationResult {
    /** Whether all prerequisites are met */
    valid: boolean;

    /** Array of error messages (required, empty if valid) */
    errors: string[];
}
```

**Note**: FeatureQuery's `ValidationResult` includes both `unmet` and `errors` (optional), while SkillValidator and SpellValidator return `SkillValidationResult` and `SpellValidationResult` with a required `errors` array only.

### Skill Validation

```typescript
import { SkillValidator, SkillQuery } from 'playlist-data-engine';

// Direct validation
const result = SkillValidator.validateSkillPrerequisites(
    skill.prerequisites,
    character
);

// Via registry
const result2 = SkillQuery.getInstance().validatePrerequisites(skill, character);

if (!result.valid) {
    console.log('Unmet prerequisites:', result.errors);
}
```

### Spell Validation

```typescript
import { SpellValidator, validateSpellPrerequisites } from 'playlist-data-engine';

// Direct validation
const result = SpellValidator.validateSpellPrerequisites(
    spell.prerequisites,
    character
);

// Helper function
const result2 = validateSpellPrerequisites(spell.prerequisites, character);

if (!result.valid) {
    console.log('Unmet prerequisites:', result.errors);
}
```

### Feature Validation

```typescript
import { FeatureQuery } from 'playlist-data-engine';

const registry = FeatureQuery.getInstance();

const result = registry.validatePrerequisites(feature, character);

// Access unmet prerequisites (FeatureQuery-specific)
if (!result.valid) {
    console.log('Unmet prerequisites:', result.unmet || result.errors);
}

// Or check boolean directly
const canLearn = registry.meetsPrerequisites(feature, character);
```

---

### Prerequisite Validation Rules

When validating prerequisites, the system performs the following checks for each field:

**`validatePrerequisites()` in FeatureValidator checks:**

- **`level`** - Must be a number between 1 and 20
- **`abilities`** - Must be a record with valid ability keys (STR, DEX, CON, INT, WIS, CHA) and scores between 1-20
- **`class`** - Must be a valid default D&D 5e class or a custom class registered via ExtensionManager
- **`race`** - Must be a valid default race or a custom race registered via ExtensionManager
- **`subrace`** - Must be a non-empty string (for subrace-specific prerequisites)
- **`features`** - Must be an array of feature ID strings
- **`skills`** - Must be an array of valid skill IDs (lowercase_with_underscores format)
- **`spells`** - Must be an array of spell name strings
- **`custom`** - Must be a string (manual condition description for display purposes only)

**Runtime Validation:**

During runtime validation (when checking if a character meets prerequisites):

- **Level** - Compares character's `level` against required level
- **Abilities** - Checks if character's ability scores meet minimum values
- **Class** - Checks if character's `class` matches required class
- **Race** - Checks if character's `race` matches required race
- **Subrace** - Checks if character's `subrace` matches required subrace
- **Features** - Checks if required feature IDs are in character's `class_features` array
- **Skills** - Checks if required skills are proficient or expertise (based on skill proficiency level)
- **Spells** - Checks if required spells are in character's `known_spells` or `cantrips` arrays
- **Custom** - Displayed as an unmet prerequisite but not programmatically validated

---

## Examples

### Complete Example: Dragon-Themed Content

```typescript
import { SkillQuery, FeatureQuery, ExtensionManager } from 'playlist-data-engine';

// 1. Register a custom race with subraces
const manager = ExtensionManager.getInstance();

manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

manager.register('races', ['Dragonkin']);

// 2. Register a subrace-specific trait
ExtensionManager.getInstance().register('racialTraits', [{
    id: 'fire_dragonkin_fire_resistance',
    name: 'Fire Resistance',
    description: 'You have resistance to fire damage.',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',
    prerequisites: { subrace: 'Fire Dragonkin' },
    effects: [
        { type: 'ability_unlock', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
}]);
// Cache is automatically invalidated after registration

// 3. Register a skill with prerequisites (feature + level + class)
ExtensionManager.getInstance().register('skills', [{
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],
        level: 5,
        class: 'Sorcerer'
    },
    source: 'custom'
}]);
// Cache is automatically invalidated after registration

// 4. Register a spell with prerequisites
manager.register('spells', [{
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
}]);

// 5. Register a feature with skill prerequisite
ExtensionManager.getInstance().register('classFeatures', [{
    id: 'arcane_smith',
    name: 'Arcane Smith',
    description: 'Can enchant magical items',
    type: 'active',
    level: 7,
    class: 'Wizard',
    prerequisites: {
        skills: ['arcana'],
        level: 7
    },
    effects: [
        { type: 'ability_unlock', target: 'item_enchantment', value: true }
    ],
    source: 'custom'
}]);
// Cache is automatically invalidated after registration
```

### Example: Validation in Character Generation

```typescript
import { SkillValidator, SpellValidator } from 'playlist-data-engine';

// During character generation, skills/spells are filtered by prerequisites

// Check if a character can learn a skill
const skillResult = SkillValidator.validateSkillPrerequisites(
    customSkill.prerequisites,
    character
);

if (skillResult.valid) {
    // Assign the skill
} else {
    console.log('Cannot learn skill:', skillResult.unmet);
}

// Check if a character can learn a spell
const spellResult = SpellValidator.validateSpellPrerequisites(
    customSpell.prerequisites,
    character
);

if (spellResult.valid) {
    // Add to known spells
} else {
    console.log('Cannot learn spell:', spellResult.unmet);
}
```

### Example: Prerequisite Chains

Skills and spells can form chains by requiring each other:

```typescript
// Basic skill
const herbLore = {
    id: 'herb_lore',
    name: 'Herb Lore',
    ability: 'WIS',
    source: 'custom'
};

// Advanced skill requiring the basic one
const advancedHerbalism = {
    id: 'advanced_herbalism',
    name: 'Advanced Herbalism',
    ability: 'INT',
    prerequisites: {
        skills: ['herb_lore'],  // Must know Herb Lore first
        level: 5
    },
    source: 'custom'
};

// Master skill requiring both
const masterHerbalist = {
    id: 'master_herbalist',
    name: 'Master Herbalist',
    ability: 'INT',
    prerequisites: {
        skills: ['herb_lore', 'advanced_herbalism'],
        features: [' Herbalist_certification'],
        level: 10
    },
    source: 'custom'
};
```


### Spells with Prerequisites

Spells can have prerequisites that must be met before a spellcaster can learn them. This allows for specialized spells that require specific features, abilities, spells, skills, level, or class.

```typescript
import { SpellValidator, SpellManager, ExtensionManager } from 'playlist-data-engine';

// ===== SPELL WITH FEATURE PREREQUISITES =====
// Dragon Breath: Requires Draconic Bloodline feature
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

// ===== SPELL WITH LEVEL AND CLASS PREREQUISITES =====
// Meteor Swarm: High-level evocation spell
const limitedMeteorSwarm = {
    id: 'limited_meteor_swarm',
    name: 'Meteor Swarm',
    level: 9,
    school: 'Evocation',
    casting_time: '1 action',
    range: '1 mile',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: 'Blazing orbs rain down',
    prerequisites: {
        level: 17,  // Character must be level 17+
        class: 'Wizard',
        spells: ['Fireball']  // Must know Fireball first
    }
};

// ===== SPELL WITH SKILL PREREQUISITES =====
// Arcane Sword: Requires Arcana proficiency
const arcaneSwordSpell = {
    id: 'arcane_sword',
    name: 'Arcane Sword',
    level: 5,
    school: 'Evocation',
    casting_time: '1 bonus action',
    range: '60 ft',
    components: ['V', 'S', 'M'],
    duration: 'Concentration, 1 minute',
    description: 'Summon a sword of pure magic',
    prerequisites: {
        skills: ['arcana']  // Requires Arcana proficiency
    }
};

// ===== REGISTER CUSTOM SPELLS =====
const manager = ExtensionManager.getInstance();
manager.register('spells', [dragonBreath, limitedMeteorSwarm, arcaneSwordSpell]);

// ===== VALIDATE SPELL PREREQUISITES =====
const character = CharacterGenerator.generate(seed, audioProfile, track, {forceName: 'Sorcerer'});
const spell = SPELL_DATABASE['dragon_breath'];

if (spell.prerequisites) {
    const result = SpellValidator.validateSpellPrerequisites(spell.prerequisites, character);

    if (!result.valid) {
        console.log('Cannot learn this spell:', result.unmet);
    }
}

// During character generation, SpellManager automatically filters
// out spells that have unmet prerequisites
const knownSpells = SpellManager.getKnownSpells(
    character.class,
    character.level,
    character  // Pass character for prerequisite filtering
);
// Only includes spells whose prerequisites are met
```

---

## API Reference

### SkillValidator

- `validateSkillPrerequisites(prerequisites, character)` - Validate skill prerequisites against a character

### SpellValidator

- `validateSpellPrerequisites(prerequisites, character)` - Validate spell prerequisites against a character
- `validateSpell(spell)` - Validate spell schema including prerequisites

### FeatureQuery

- `validatePrerequisites(feature, character)` - Validate feature prerequisites
- `meetsPrerequisites(feature, character)` - Boolean check if prerequisites are met
- `getRacialTraitsForSubrace(race, subrace)` - Get traits for a specific subrace

### SkillQuery

- `validatePrerequisites(skill, character)` - Validate skill prerequisites

### ExtensionManager

- `register(category, items, options)` - Register custom races, spells, or other content

---

## Best Practices

1. **Use Prerequisites Judiciously**: Not every skill/spell needs prerequisites. Use them for:
   - Advanced/specialized content
   - Class or race-specific abilities
   - Progression chains (basic → advanced → master)

2. **Provide Clear Descriptions**: When a prerequisite isn't met, the error message should clearly explain why

3. **Test Prerequisite Chains**: If skills/spells require each other, ensure there are no circular dependencies

4. **Consider Custom Conditions**: Use the `custom` field for prerequisites that don't fit the standard types

5. **Document Custom Content**: When creating custom content with prerequisites, document the requirements clearly

---

## See Also

- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [CUSTOM_CONTENT.md](CUSTOM_CONTENT.md) - Custom races and classes guide
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [EXTENSIBILITY_GUIDE.md](EXTENSIBILITY_GUIDE.md) - Custom content registration
- [XP_AND_STATS.md](XP_AND_STATS.md) - Progression and level requirements
- [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md) - Equipment with prerequisites
