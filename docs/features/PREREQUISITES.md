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

### SkillPrerequisite

*Also known as: skill requirements, skill conditions*

Defines conditions that must be met before a character can gain proficiency in a skill.

**Location:** [`src/core/skills/SkillTypes.ts`](src/core/skills/SkillTypes.ts#L23-L47)

| Property | Type | Description |
|----------|------|-------------|
| `level` | `number?` | Minimum character level required |
| `abilities` | `Partial<Record<Ability, number>>?` | Minimum ability scores (STR/DEX/CON/INT/WIS/CHA) |
| `class` | `Class?` | Specific class required |
| `race` | `Race?` | Specific race required |
| `skills` | `string[]?` | Skills that must be proficient first (by skill ID) |
| `features` | `string[]?` | Features that must be learned first (by feature ID) |
| `spells` | `string[]?` | Spells that must be known first (by spell name) |
| `custom` | `string?` | Custom condition description (display only) |

### CustomSkill.prerequisites

**Location:** [`src/core/skills/SkillTypes.ts`](src/core/skills/SkillTypes.ts#L128)

The `CustomSkill` interface includes an optional `prerequisites?: SkillPrerequisite` property. When specified, the skill is filtered out during character generation if prerequisites are unmet.

### Validation

Skill prerequisites are validated automatically during:

1. **Skill Registration**: Schema validation ensures prerequisite structure is valid
2. **Skill Assignment**: During character generation, skills with unmet prerequisites are filtered out
3. **Manual Validation**: Use `SkillValidator.validateSkillPrerequisites()` or `SkillQuery.validatePrerequisites()`

### Example Skills with Prerequisites

| Skill | Prerequisites Used |
|-------|-------------------|
| Dragon Smithing | `features`, `level`, `class` |
| Advanced Arcana | `abilities`, `skills`, `level` |
| Spell Mastery | `spells`, `class`, `level` |
| Dwarven Warfare | `race` |

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const skills = [
    {
        id: 'dragon_smithing',
        name: 'Dragon Smithing',
        description: 'Craft weapons from dragon scales',
        ability: 'INT' as const,
        prerequisites: {
            features: ['draconic_bloodline'],
            level: 5,
            class: 'Sorcerer' as const
        },
        source: 'custom' as const
    },
    {
        id: 'advanced_arcana',
        name: 'Advanced Arcana',
        description: 'Cast complex spells and understand magical theory',
        ability: 'INT' as const,
        prerequisites: {
            abilities: { INT: 16 },
            skills: ['arcana'],
            level: 7
        },
        source: 'custom' as const
    },
    {
        id: 'spell_mastery',
        name: 'Spell Mastery',
        description: 'Improved control over known spells',
        ability: 'INT' as const,
        prerequisites: {
            spells: ['Fireball', 'Lightning Bolt'],
            class: 'Wizard' as const,
            level: 10
        },
        source: 'custom' as const
    },
    {
        id: 'dwarven_warfare',
        name: 'Dwarven Warfare',
        description: 'Advanced dwarven combat techniques',
        ability: 'STR' as const,
        prerequisites: {
            race: 'Dwarf' as const
        },
        source: 'custom' as const
    }
];

ExtensionManager.getInstance().register('skills', skills);
```

## Spell Prerequisites

Spells can have prerequisites that must be met before they can be learned.

### SpellPrerequisite

*Also known as: spell requirements, spell conditions*

Defines conditions that must be met before a spellcaster can learn a spell.

**Location:** [`src/core/spells/SpellTypes.ts`](src/core/spells/SpellTypes.ts#L32-L59)

| Property | Type | Description |
|----------|------|-------------|
| `level` | `number?` | Minimum character level |
| `casterLevel` | `number?` | Minimum spellcaster level (if different from character level) |
| `abilities` | `Partial<Record<Ability, number>>?` | Minimum ability scores |
| `class` | `Class?` | Specific class required |
| `race` | `Race?` | Specific race required |
| `features` | `string[]?` | Features that must be learned first (by feature ID) |
| `spells` | `string[]?` | Spells that must be known first (by spell name) |
| `skills` | `string[]?` | Skills that must be proficient first (by skill ID) |
| `custom` | `string?` | Custom condition description (display only) |

### Spell.prerequisites

**Location:** [`src/core/spells/SpellTypes.ts`](src/core/spells/SpellTypes.ts#L80)

The `Spell` interface includes an optional `prerequisites?: SpellPrerequisite` property. `SpellManager` automatically filters spells by prerequisites during character generation.

### Validation

Spell prerequisites are validated automatically during:

1. **Spell Registration**: Schema validation via `SpellValidator.validateSpell()`
2. **Spell Assignment**: During character generation, `SpellManager` filters spells by prerequisites
3. **Manual Validation**: Use `SpellValidator.validateSpellPrerequisites()`

### Example Spells with Prerequisites

```typescript
import { ExtensionManager, SpellManager, CharacterGenerator } from 'playlist-data-engine';

// Spell with feature + ability prerequisites
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

// Spell with level + class + spell prerequisites
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
        level: 17,
        class: 'Wizard',
        spells: ['Fireball']
    }
};

// Spell with skill prerequisites
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
        skills: ['arcana']
    }
};

const manager = ExtensionManager.getInstance();
manager.register('spells', [dragonBreath, limitedMeteorSwarm, arcaneSwordSpell]);

// SpellManager automatically filters spells by prerequisites during character generation
const character = CharacterGenerator.generate(seed, audioProfile, track);
const knownSpells = SpellManager.getKnownSpells(character.class, character.level, character);
// Only includes spells whose prerequisites are met
```

---

## Feature Prerequisites

Features (class features and racial traits) can have prerequisites that must be met.

### FeaturePrerequisite

*Also known as: feature requirements, trait conditions*

Defines conditions for class features and racial traits. Note: `SkillPrerequisite` and `SpellPrerequisite` follow the same pattern for consistency.

**Location:** [`src/core/features/FeatureTypes.ts`](src/core/features/FeatureTypes.ts#L67-L94)

| Property | Type | Description |
|----------|------|-------------|
| `level` | `number?` | Minimum level required |
| `features` | `string[]?` | Features that must be learned first (by ID) |
| `abilities` | `Partial<Record<Ability, number>>?` | Minimum ability scores required |
| `class` | `Class?` | Specific class required |
| `race` | `Race?` | Specific race required |
| `subrace` | `string?` | Specific subrace required (e.g., 'High Elf', 'Hill Dwarf') |
| `skills` | `string[]?` | Skills that must be proficient first (by skill ID) |
| `spells` | `string[]?` | Spells that must be known first (by spell name) |
| `custom` | `string?` | Custom condition description (display only) |

### Validation

Feature prerequisites are validated via `FeatureQuery.validatePrerequisites()` which checks level, abilities, class, race, subrace, skills, spells, features, and custom conditions.

### Example Features with Prerequisites

| Feature | Type | Prerequisites Used |
|---------|------|-------------------|
| Arcane Mastery | Class feature | `skills`, `level` |
| Spellblade | Class feature | `spells`, `features` |
| Elven Battle Training | Racial trait | `skills`, `level` |

```typescript
import { ExtensionManager } from 'playlist-data-engine';

// Class features
ExtensionManager.getInstance().register('classFeatures', [
    {
        id: 'arcane_mastery',
        name: 'Arcane Mastery',
        description: 'Bonus to spellcasting based on Arcana skill',
        type: 'passive' as const,
        level: 10,
        class: 'Wizard' as const,
        prerequisites: {
            skills: ['arcana'],
            level: 10
        },
        effects: [
            { type: 'passive_modifier' as const, target: 'spell_save_dc', value: 1 }
        ],
        source: 'custom' as const
    },
    {
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
    }
]);

// Racial traits
ExtensionManager.getInstance().register('racialTraits', [{
    id: 'elven_battle_training',
    name: 'Elven Battle Training',
    description: 'Advanced elven combat techniques',
    type: 'active' as const,
    race: 'Elf' as const,
    prerequisites: {
        skills: ['athletics', 'perception'],
        level: 3
    },
    effects: [
        { type: 'passive_modifier' as const, target: 'initiative', value: 2 }
    ],
    source: 'custom' as const
}]);
```

## Validation System

### ValidationResult Interfaces

| Type | Location | Properties |
|------|----------|------------|
| `ValidationResult` | [`src/core/features/FeatureTypes.ts`](src/core/features/FeatureTypes.ts#L238-L247) | `valid: boolean`, `unmet?: string[]`, `errors?: string[]` |
| `SkillValidationResult` | [`src/core/skills/SkillTypes.ts`](src/core/skills/SkillTypes.ts#L239-L244) | `valid: boolean`, `errors: string[]` (required) |
| `SpellValidationResult` | Inferred from `SpellValidator` | `valid: boolean`, `errors: string[]` (required) |

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

| Field | Schema Validation | Runtime Check |
|-------|------------------|---------------|
| `level` | Number between 1-20 | Compares character level against required |
| `abilities` | Valid ability keys, scores 1-20 | Checks ability scores meet minimum |
| `class` | Valid D&D 5e class or registered custom class | Matches character's class |
| `race` | Valid default race or registered custom race | Matches character's race |
| `subrace` | Non-empty string | Matches character's subrace |
| `features` | Array of feature ID strings | IDs in `class_features` array |
| `skills` | Valid skill IDs (lowercase_with_underscores) | Skills proficient or expertise |
| `spells` | Array of spell name strings | In `known_spells` or `cantrips` |
| `custom` | String | Displayed only, not validated |

---

## Examples

### Subrace-Specific Prerequisites

Races with subraces can have traits that only apply to specific subraces using the `subrace` prerequisite field:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

// Register a custom race with subraces
const manager = ExtensionManager.getInstance();
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);
manager.register('races', ['Dragonkin']);

// Register a subrace-specific trait
manager.register('racialTraits', [{
    id: 'fire_dragonkin_fire_resistance',
    name: 'Fire Resistance',
    description: 'You have resistance to fire damage.',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',
    prerequisites: { subrace: 'Fire Dragonkin' },  // Only Fire Dragonkin get this
    effects: [
        { type: 'ability_unlock', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
}]);
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

---

## API Reference

### SkillValidator

**Location:** [`src/core/skills/SkillValidator.ts`](src/core/skills/SkillValidator.ts)

| Method | Returns | Description |
|--------|---------|-------------|
| `validateSkillPrerequisites(prerequisites, character)` | `SkillValidationResult` | Validate skill prerequisites against a character |
| `validateSkill(skill)` | `SkillValidationResult` | Validate skill schema including prerequisites |

### SpellValidator

**Location:** [`src/core/spells/SpellValidator.ts`](src/core/spells/SpellValidator.ts)

| Method | Returns | Description |
|--------|---------|-------------|
| `validateSpellPrerequisites(prerequisites, character)` | `SpellValidationResult` | Validate spell prerequisites against a character |
| `validateSpell(spell)` | `boolean` | Validate spell schema including prerequisites |

### FeatureQuery

**Location:** [`src/core/features/FeatureQuery.ts`](src/core/features/FeatureQuery.ts)

| Method | Returns | Description |
|--------|---------|-------------|
| `validatePrerequisites(feature, character)` | `ValidationResult` | Validate feature prerequisites against a character |
| `meetsPrerequisites(feature, character)` | `boolean` | Boolean check if prerequisites are met |
| `getRacialTraitsForSubrace(race, subrace)` | `RacialTrait[]` | Get traits for a specific subrace |

### SkillQuery

**Location:** [`src/core/skills/SkillQuery.ts`](src/core/skills/SkillQuery.ts)

| Method | Returns | Description |
|--------|---------|-------------|
| `validatePrerequisites(skill, character)` | `SkillValidationResult` | Validate skill prerequisites via SkillQuery |

### ExtensionManager

**Location:** [`src/core/extensions/ExtensionManager.ts`](src/core/extensions/ExtensionManager.ts)

| Method | Returns | Description |
|--------|---------|-------------|
| `register(category, items, options?)` | `void` | Register custom races, spells, skills, features, or other content |

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
