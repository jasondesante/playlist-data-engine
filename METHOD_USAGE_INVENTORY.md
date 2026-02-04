# Method Usage Inventory

## Purpose
This document tracks all usages of redundant registration methods that need to be migrated to ExtensionManager.register().

## Methods to Remove

| Registry | Method | Line Range | Count (estimated) |
|----------|--------|------------|-------------------|
| **SpellRegistry** | `registerSpell()` | 88-107 | ~6 test calls |
| **SpellRegistry** | `registerSpells()` | 116-137 | ~2 test calls |
| **SpellRegistry** | `registerClassSpellList()` | 147-169 | 0 test calls |
| **SkillRegistry** | `registerSkill()` | 80-104 | ~86 test calls |
| **SkillRegistry** | `registerSkills()` | 114-149 | ~5 test calls |
| **FeatureRegistry** | `registerClassFeature()` | 91-123 | ~35 test calls |
| **FeatureRegistry** | `registerClassFeatures()` | 125-168 | ~12 test calls |
| **FeatureRegistry** | `registerRacialTrait()` | 170-202 | ~40 test calls |
| **FeatureRegistry** | `registerRacialTraits()` | 204-247 | ~10 test calls |

---

## Detailed Usage Locations

### SpellRegistry.registerSpell()

**Source File:** `src/core/spells/SpellRegistry.ts` (lines 97-116)

**Test Usages:**
- `tests/documentation/examples-compilation.test.ts:1381` - test for delegation
- `tests/documentation/examples-compilation.test.ts:1400` - registration test
- `tests/documentation/examples-compilation.test.ts:1541` - registration test

**Documentation Usages:**
- `docs/DATA_ENGINE_REFERENCE.md:4941` - API documentation
- `docs/DATA_ENGINE_REFERENCE.md:5024` - Quick reference table
- `docs/DATA_ENGINE_REFERENCE.md:5044` - Usage guidance
- `docs/EXTENSIBILITY_GUIDE.md:490` - Example code

---

### SpellRegistry.registerSpells()

**Source File:** `src/core/spells/SpellRegistry.ts` (lines 125-146)

**Test Usages:**
- `tests/documentation/examples-compilation.test.ts:1467` - batch registration
- `tests/documentation/examples-compilation.test.ts:1509` - batch registration

**Documentation Usages:**
- `DATA_ENGINE_REFERENCE.md:4942` - API documentation
- `DATA_ENGINE_REFERENCE.md:5025` - Quick reference table

---

### SpellRegistry.registerClassSpellList()

**Source File:** `src/core/spells/SpellRegistry.ts` (lines 156-178)

**Note:** This method has special validation logic that validates spell IDs exist before registration. This validation needs to be moved to ExtensionManager before removing the method.

**Test Usages:** None found in tests

**Documentation Usages:**
- `DATA_ENGINE_REFERENCE.md:4943` - API documentation
- `DATA_ENGINE_REFERENCE.md:5026` - Quick reference table
- `DATA_ENGINE_REFERENCE.md:5046` - Usage guidance

---

### SkillRegistry.registerSkill()

**Source File:** `src/core/skills/SkillRegistry.ts` (lines 80-104)

**Test Usages:**
- `tests/documentation/examples-compilation.test.ts:785` - skill registration
- `tests/documentation/examples-compilation.test.ts:800` - skill registration
- `tests/documentation/examples-compilation.test.ts:815` - skill registration
- `tests/documentation/prerequisitesExamples.test.ts:88` - with getInstance()
- `tests/documentation/prerequisitesExamples.test.ts:106` - direct registry call
- `tests/documentation/prerequisitesExamples.test.ts:148` - direct registry call
- `tests/documentation/prerequisitesExamples.test.ts:485` - with getInstance()
- `tests/documentation/prerequisitesExamples.test.ts:564` - direct registry call
- `tests/integration/phase15.fullCustomContent.integration.test.ts:188` - in loop
- `tests/integration/phase15.fullCustomContent.integration.test.ts:534` - in loop
- `tests/integration/phase15.fullCustomContent.integration.test.ts:592` - direct call
- `tests/integration/phase15.fullCustomContent.integration.test.ts:604` - invalid skill
- `tests/integration/phase15.fullCustomContent.integration.test.ts:882` - invalid skill
- `tests/integration/phase15.fullCustomContent.integration.test.ts:1091` - direct call
- `tests/integration/phase15.fullCustomContent.integration.test.ts:1173` - object literal
- `tests/integration/prerequisitesAndRaces.integration.test.ts:159` - advanced skill
- `tests/integration/prerequisitesAndRaces.integration.test.ts:190` - dragon skill
- `tests/integration/prerequisitesAndRaces.integration.test.ts:225` - master skill
- `tests/integration/prerequisitesAndRaces.integration.test.ts:250` - sorcery skill
- `tests/integration/prerequisitesAndRaces.integration.test.ts:277` - level 5 skill
- `tests/integration/prerequisitesAndRaces.integration.test.ts:627` - dragon smithing
- `tests/integration/prerequisitesAndRaces.integration.test.ts:628` - dragon lore
- `tests/integration/prerequisitesAndRaces.integration.test.ts:710` - advanced skill
- `tests/integration/prerequisitesAndRaces.integration.test.ts:788` - complex skill
- `tests/integration/prerequisitesAndRaces.integration.test.ts:1012` - empty prereq skill
- `tests/integration/prerequisitesAndRaces.integration.test.ts:1073` - skill A
- `tests/integration/prerequisitesAndRaces.integration.test.ts:1074` - skill B
- `tests/integration/prerequisitesAndRaces.integration.test.ts:1116` - level 1 skill
- `tests/integration/prerequisitesAndRaces.integration.test.ts:1117` - level 5 skill
- `tests/integration/prerequisitesAndRaces.integration.test.ts:1118` - level 10 skill
- `tests/integration/customFeaturesSkills.integration.test.ts:324` - custom skill
- `tests/integration/customFeaturesSkills.integration.test.ts:360` - in loop
- `tests/integration/customFeaturesSkills.integration.test.ts:390` - custom skill
- `tests/integration/customFeaturesSkills.integration.test.ts:429` - custom skill
- `tests/integration/customFeaturesSkills.integration.test.ts:471` - custom skill
- `tests/integration/customFeaturesSkills.integration.test.ts:545` - custom skill
- `tests/integration/customFeaturesSkills.integration.test.ts:549` - in try-catch
- `tests/integration/customFeaturesSkills.integration.test.ts:683` - STR skill
- `tests/integration/customFeaturesSkills.integration.test.ts:684` - INT skill
- `tests/integration/customFeaturesSkills.integration.test.ts:714` - combat skill
- `tests/integration/customFeaturesSkills.integration.test.ts:715` - social skill
- `tests/unit/skills.test.ts:257` - custom skill 1
- `tests/unit/skills.test.ts:258` - custom skill 2
- `tests/unit/skills.test.ts:285` - custom skill
- `tests/unit/skills.test.ts:319` - in loop
- `tests/unit/skills.test.ts:374` - custom skill
- `tests/unit/skills.test.ts:425` - in loop
- `tests/unit/skills.test.ts:446` - custom skill
- `tests/unit/skills.test.ts:476` - custom skill
- `tests/unit/skills.test.ts:515` - in loop
- `tests/unit/skills.test.ts:550` - custom skill
- `tests/unit/skills.test.ts:580` - in loop
- `tests/unit/skills.test.ts:605` - custom skill
- `tests/unit/skills.test.ts:624` - custom skill
- `tests/unit/skills.test.ts:645` - in loop
- `tests/unit/skills.test.ts:670` - in loop
- `tests/unit/skillPrerequisites.test.ts:828` - custom skill
- `tests/unit/skillPrerequisites.test.ts:850` - advanced skill
- `tests/unit/skillPrerequisites.test.ts:873` - mid-level skill
- `tests/unit/skillPrerequisites.test.ts:895` - high INT skill
- `tests/unit/skillPrerequisites.test.ts:921` - sorcerer skill
- `tests/unit/skillPrerequisites.test.ts:944` - elf skill
- `tests/unit/skillPrerequisites.test.ts:967` - advanced skill
- `tests/unit/skillPrerequisites.test.ts:990` - dragon skill
- `tests/unit/skillPrerequisites.test.ts:1013` - pyromancy skill
- `tests/unit/skillPrerequisites.test.ts:1042` - skill with prereqs
- `tests/unit/skillPrerequisites.test.ts:1067` - dragon smithing
- `tests/unit/skillPrerequisites.test.ts:1145` - dragon skill
- `tests/unit/skillPrerequisites.test.ts:1168` - dragon skill
- `tests/unit/skillRegistry.test.ts:72` - custom skill
- `tests/unit/skillRegistry.test.ts:121` - skill
- `tests/unit/skillRegistry.test.ts:124` - in try-catch
- `tests/unit/skillRegistry.test.ts:138` - invalid skill
- `tests/unit/skillRegistry.test.ts:152` - invalid skill
- `tests/unit/skillRegistry.test.ts:166` - valid skill
- `tests/unit/skillRegistry.test.ts:445` - custom skill
- `tests/unit/skillRegistry.test.ts:461` - no category skill
- `tests/unit/skillRegistry.test.ts:474` - multi-category skill
- `tests/unit/skillRegistry.test.ts:492` - tagged skill
- `tests/unit/skillRegistry.test.ts:512` - custom props skill
- `tests/unit/skillRegistry.test.ts:532` - armored skill
- `tests/unit/skillRegistry.test.ts:546` - no penalty skill
- `tests/unit/skillRegistry.test.ts:596` - in try-catch
- `tests/unit/skillRegistry.test.ts:626` - custom skill
- `tests/unit/skillRegistry.test.ts:746` - advanced skill
- `tests/unit/skillRegistry.test.ts:772` - high INT skill
- `tests/unit/skillRegistry.test.ts:804` - wizard skill
- `tests/unit/skillRegistry.test.ts:830` - elf skill
- `tests/unit/skillRegistry.test.ts:856` - advanced arcana skill
- `tests/unit/skillRegistry.test.ts:882` - feature skill
- `tests/unit/skillRegistry.test.ts:908` - pyromancy skill
- `tests/unit/skillRegistry.test.ts:950` - multi prereq skill

**Documentation Usages:**
- `docs/DATA_ENGINE_REFERENCE.md:4686` - API documentation
- `docs/DATA_ENGINE_REFERENCE.md:4779` - Quick reference table
- `docs/DATA_ENGINE_REFERENCE.md:4798` - Usage guidance
- `USAGE_IN_OTHER_PROJECTS.md:1156` - Example (commented out)
- `docs/PREREQUISITES.md:128` - Example code
- `docs/EXTENSIBILITY_GUIDE.md:1030` - Note about wrapper
- `docs/EXTENSIBILITY_GUIDE.md:1113` - Example (commented)
- `tests/verification/dragon-skill-example.compile.test.ts:19` - Example (commented)
- `tests/verification/custom-content-examples.compile.test.ts:157` - Example (commented)

---

### SkillRegistry.registerSkills()

**Source File:** `src/core/skills/SkillRegistry.ts` (lines 114-149)

**Test Usages:**
- `tests/documentation/examples-compilation.test.ts:693` - batch registration
- `tests/unit/skillRegistry.test.ts:101` - custom skills array
- `tests/unit/skillRegistry.test.ts:198` - custom skills array
- `tests/unit/skillRegistry.test.ts:416` - custom skills array
- `tests/unit/skillRegistry.test.ts:653` - custom skills array
- `tests/unit/skillRegistry.test.ts:1013` - skills array

**Documentation Usages:**
- `DATA_ENGINE_REFERENCE.md:4687` - API documentation
- `DATA_ENGINE_REFERENCE.md:4780` - Quick reference table
- `docs/EXTENSIBILITY_GUIDE.md:777` - Note about wrapper pattern
- `docs/EXTENSIBILITY_GUIDE.md:1030` - Note about wrapper

---

### FeatureRegistry.registerClassFeature()

**Source File:** `src/core/features/FeatureRegistry.ts` (lines 91-115)

**Test Usages:**
- `tests/documentation/examples-compilation.test.ts:573` - feature registration
- `tests/documentation/examples-compilation.test.ts:602` - arcance smith feature
- `tests/documentation/prerequisitesExamples.test.ts:313` - with getInstance()
- `tests/documentation/prerequisitesExamples.test.ts:335` - direct registry call
- `tests/documentation/prerequisitesExamples.test.ts:373` - direct registry call
- `tests/documentation/prerequisitesExamples.test.ts:411` - direct registry call
- `tests/documentation/prerequisitesExamples.test.ts:525` - with getInstance()
- `tests/documentation/prerequisitesExamples.test.ts:598` - arc smith feature
- `tests/integration/featureIntegration.test.ts:437` - custom feature
- `tests/integration/featureIntegration.test.ts:455` - invalid feature
- `tests/integration/featureIntegration.test.ts:476` - feature
- `tests/integration/prerequisitesAndRaces.integration.test.ts:646` - dragon magic
- `tests/integration/prerequisitesAndRaces.integration.test.ts:873` - arcane smith
- `tests/integration/prerequisitesAndRaces.integration.test.ts:874` - battle caster
- `tests/integration/prerequisitesAndRaces.integration.test.ts:875` - mastery feature
- `tests/integration/prerequisitesAndRaces.integration.test.ts:1037` - feature with spell prereq
- `tests/integration/prerequisitesAndRaces.integration.test.ts:1157` - sneak attack fighter
- `tests/integration/phase15.fullCustomContent.integration.test.ts:180` - in loop
- `tests/integration/phase15.fullCustomContent.integration.test.ts:354` - level 1 feature
- `tests/integration/phase15.fullCustomContent.integration.test.ts:355` - level 3 feature
- `tests/integration/phase15.fullCustomContent.integration.test.ts:356` - level 5 feature
- `tests/integration/phase15.fullCustomContent.integration.test.ts:416` - base feature
- `tests/integration/phase15.fullCustomContent.integration.test.ts:417` - advanced feature
- `tests/integration/phase15.fullCustomContent.integration.test.ts:454` - con boost feature
- `tests/integration/phase15.fullCustomContent.integration.test.ts:851` - invalid feature
- `tests/integration/phase15.fullCustomContent.integration.test.ts:961` - feature 1
- `tests/integration/phase15.fullCustomContent.integration.test.ts:965` - feature 2
- `tests/integration/phase15.fullCustomContent.integration.test.ts:985` - feature with invalid chain
- `tests/integration/phase15.fullCustomContent.integration.test.ts:1011` - invalid feature
- `tests/integration/phase15.fullCustomContent.integration.test.ts:1116` - custom feature
- `tests/integration/phase15.fullCustomContent.integration.test.ts:1148` - object literal
- `tests/integration/customFeaturesSkills.integration.test.ts:80` - custom feature
- `tests/integration/customFeaturesSkills.integration.test.ts:122` - in loop
- `tests/integration/customFeaturesSkills.integration.test.ts:153` - custom feature
- `tests/integration/customFeaturesSkills.integration.test.ts:184` - high level feature
- `tests/integration/customFeaturesSkills.integration.test.ts:417` - custom feature
- `tests/integration/customFeaturesSkills.integration.test.ts:459` - custom feature
- `tests/integration/customFeaturesSkills.integration.test.ts:526` - custom feature
- `tests/integration/customFeaturesSkills.integration.test.ts:530` - in try-catch
- `tests/integration/customFeaturesSkills.integration.test.ts:569` - invalid feature
- `tests/integration/customFeaturesSkills.integration.test.ts:597` - custom feature
- `tests/integration/customFeaturesSkills.integration.test.ts:649` - level 1 feature
- `tests/integration/customFeaturesSkills.integration.test.ts:650` - level 5 feature
- `tests/unit/levelUpProcessor.test.ts:152` - custom feature
- `tests/unit/levelUpProcessor.test.ts:206` - custom feature
- `tests/unit/levelUpProcessor.test.ts:233` - custom feature
- `tests/unit/levelUpProcessor.test.ts:253` - custom feature
- `tests/unit/levelUpProcessor.test.ts:275` - custom feature
- `tests/unit/levelUpProcessor.test.ts:330` - advanced feature
- `tests/unit/levelUpProcessor.test.ts:349` - barbarian feature
- `tests/unit/levelUpProcessor.test.ts:370` - elf feature
- `tests/unit/levelUpProcessor.test.ts:391` - elf feature
- `tests/unit/levelUpProcessor.test.ts:418` - stat bonus feature
- `tests/unit/levelUpProcessor.test.ts:485` - no effect feature
- `tests/unit/levelUpProcessor.test.ts:515` - skill feature
- `tests/unit/levelUpProcessor.test.ts:542` - speed feature
- `tests/unit/levelUpProcessor.test.ts:568` - custom feature
- `tests/unit/levelUpProcessor.test.ts:745` - custom feature
- `tests/unit/levelUpProcessor.test.ts:766` - effect feature
- `tests/unit/levelUpProcessor.test.ts:840` - custom barbarian feature
- `tests/unit/levelUpProcessor.test.ts:882` - feature with effect
- `tests/unit/featureRegistry.test.ts:118` - custom feature
- `tests/unit/featureRegistry.test.ts:163` - feature
- `tests/unit/featureRegistry.test.ts:166` - in try-catch
- `tests/unit/featureRegistry.test.ts:404` - feature
- `tests/unit/featureRegistry.test.ts:967` - base feature
- `tests/unit/featureRegistry.test.ts:1016` - second feature
- `tests/unit/featureRegistry.test.ts:1126` - base feature

**Documentation Usages:**
- `docs/DATA_ENGINE_REFERENCE.md:4334` - API documentation
- `docs/DATA_ENGINE_REFERENCE.md:4463` - Quick reference table
- `docs/DATA_ENGINE_REFERENCE.md:4494` - Usage guidance
- `docs/PREREQUISITES.md:298` - Example code
- `docs/PREREQUISITES.md:505` - Example code
- `docs/EXTENSIBILITY_GUIDE.md:757` - Note about wrapper
- `docs/EXTENSIBILITY_GUIDE.md:763` - Example
- `docs/EXTENSIBILITY_GUIDE.md:838` - Example (commented)
- `docs/EXTENSIBILITY_GUIDE.md:1821` - Error example

---

### FeatureRegistry.registerClassFeatures()

**Source File:** `src/core/features/FeatureRegistry.ts` (lines 125-160)

**Test Usages:**
- `tests/documentation/examples-compilation.test.ts:523` - batch registration
- `tests/integration/phase15.fullCustomContent.integration.test.ts:1060` - large feature set
- `tests/unit/featureRegistry.test.ts:146` - custom features
- `tests/unit/featureRegistry.test.ts:191` - barbarian + fighter
- `tests/unit/featureRegistry.test.ts:348` - test features
- `tests/unit/featureRegistry.test.ts:1349` - features array
- `tests/unit/featureRegistry.test.ts:1402` - features array
- `tests/unit/featureRegistry.test.ts:1475` - features array
- `tests/unit/featureRegistry.test.ts:1536` - features array
- `tests/unit/featureRegistry.test.ts:1618` - features array
- `tests/unit/levelUpProcessor.test.ts:184` - custom features
- `tests/unit/levelUpProcessor.test.ts:305` - base + advanced
- `tests/unit/levelUpProcessor.test.ts:459` - features array
- `tests/unit/levelUpProcessor.test.ts:611` - base + advanced
- `tests/unit/levelUpProcessor.test.ts:656` - features array
- `tests/unit/levelUpProcessor.test.ts:713` - features array
- `tests/unit/levelUpProcessor.test.ts:813` - base + complex

**Documentation Usages:**
- `DATA_ENGINE_REFERENCE.md:4335` - API documentation
- `DATA_ENGINE_REFERENCE.md:4464` - Quick reference table
- `docs/EXTENSIBILITY_GUIDE.md:757` - Note about wrapper
- `docs/EXTENSIBILITY_GUIDE.md:770` - Example

---

### FeatureRegistry.registerRacialTrait()

**Source File:** `src/core/features/FeatureRegistry.ts` (lines 170-194)

**Test Usages:**
- `tests/integration/phase15.fullCustomContent.integration.test.ts:184` - in loop
- `tests/integration/phase15.fullCustomContent.integration.test.ts:867` - invalid trait
- `tests/integration/phase15.fullCustomContent.integration.test.ts:1162` - object literal
- `tests/integration/racialTraitIntegration.test.ts:429` - custom trait
- `tests/integration/racialTraitIntegration.test.ts:447` - invalid trait
- `tests/integration/racialTraitIntegration.test.ts:467` - trait
- `tests/documentation/prerequisitesExamples.test.ts:539` - trait
- `tests/integration/customFeaturesSkills.integration.test.ts:222` - custom trait
- `tests/integration/customFeaturesSkills.integration.test.ts:267` - in loop
- `tests/integration/customFeaturesSkills.integration.test.ts:302` - high elf trait
- `tests/integration/subraceStatBonus.integration.test.ts:79` - hill dwarf wisdom
- `tests/integration/subraceStatBonus.integration.test.ts:124` - mountain dwarf strength
- `tests/integration/subraceStatBonus.integration.test.ts:163` - hill dwarf wisdom
- `tests/integration/subraceStatBonus.integration.test.ts:200` - high elf cantrip
- `tests/integration/subraceStatBonus.integration.test.ts:240` - high elf only
- `tests/integration/prerequisitesAndRaces.integration.test.ts:460` - high elf trait
- `tests/integration/prerequisitesAndRaces.integration.test.ts:461` - wood elf trait
- `tests/integration/prerequisitesAndRaces.integration.test.ts:554` - dragon trait
- `tests/integration/prerequisitesAndRaces.integration.test.ts:585` - dragon only trait
- `tests/integration/prerequisitesAndRaces.integration.test.ts:753` - high elf trait
- `tests/unit/subraces.test.ts:266` - in loop
- `tests/unit/subraces.test.ts:414` - high elf only
- `tests/unit/subraces.test.ts:415` - wood elf only
- `tests/unit/subraces.test.ts:461` - no prereq trait
- `tests/unit/subraces.test.ts:601` - in loop
- `tests/unit/subraces.test.ts:723` - fire dragonkin
- `tests/unit/subraces.test.ts:724` - ice dragonkin
- `tests/unit/subraces.test.ts:725` - base dragonkin
- `tests/unit/subraces.test.ts:763` - lightning dragonkin
- `tests/unit/subraces.test.ts:838` - hill dwarf
- `tests/unit/subraces.test.ts:839` - mountain dwarf
- `tests/unit/subraces.test.ts:840` - duergar
- `tests/unit/subraces.test.ts:923` - no prereq trait
- `tests/unit/subraces.test.ts:945` - base trait
- `tests/unit/subraces.test.ts:973` - in loop
- `tests/unit/subraces.test.ts:1028` - in loop
- `tests/unit/subraces.test.ts:1050` - dwarf trait
- `tests/unit/subraces.test.ts:1124` - hill dwarf
- `tests/unit/subraces.test.ts:1166` - high elf
- `tests/unit/featureRegistry.test.ts:212` - custom trait
- `tests/unit/featureRegistry.test.ts:251` - trait
- `tests/unit/featureRegistry.test.ts:254` - in try-catch
- `tests/unit/featureRegistry.test.ts:424` - trait
- `tests/unit/customRaces.test.ts:366` - dragon trait
- `tests/unit/customRaces.test.ts:405` - high elf spell
- `tests/unit/customRaces.test.ts:448` - dragon only
- `tests/unit/customRaces.test.ts:635` - base trait
- `tests/unit/customRaces.test.ts:636` - high elf

**Documentation Usages:**
- `docs/DATA_ENGINE_REFERENCE.md:4344` - API documentation
- `docs/DATA_ENGINE_REFERENCE.md:4469` - Quick reference table
- `docs/DATA_ENGINE_REFERENCE.md:4498` - Usage guidance
- `USAGE_IN_OTHER_PROJECTS.md:1127` - Example
- `docs/CUSTOM_CONTENT.md:240` - Example
- `docs/PREREQUISITES.md:461` - Example
- `docs/EXTENSIBILITY_GUIDE.md:777` - Note about wrapper pattern
- `docs/EXTENSIBILITY_GUIDE.md:965` - Note about wrapper
- `docs/EXTENSIBILITY_GUIDE.md:1864` - Error example
- `tests/verification/custom-content-examples.compile.test.ts:154` - Example (commented)

---

### FeatureRegistry.registerRacialTraits()

**Source File:** `src/core/features/FeatureRegistry.ts` (lines 204-239)

**Test Usages:**
- `tests/documentation/examples-compilation.test.ts:638` - batch registration
- `tests/unit/featureRegistry.test.ts:236` - custom traits
- `tests/unit/featureRegistry.test.ts:275` - elf + dwarf
- `tests/unit/featureRegistry.test.ts:301` - high elf + wood elf
- `tests/unit/featureRegistry.test.ts:462` - test traits
- `tests/unit/featureRegistry.test.ts:496` - generic + high elf
- `tests/unit/featureRegistry.test.ts:1350` - traits array
- `tests/unit/featureRegistry.test.ts:1441` - traits array
- `tests/unit/featureRegistry.test.ts:1476` - traits array
- `tests/unit/featureRegistry.test.ts:1537` - traits array
- `tests/unit/featureRegistry.test.ts:1587` - traits array

**Documentation Usages:**
- `DATA_ENGINE_REFERENCE.md:4345` - API documentation
- `DATA_ENGINE_REFERENCE.md:4470` - Quick reference table
- `docs/EXTENSIBILITY_GUIDE.md:777` - Note about wrapper pattern
- `docs/EXTENSIBILITY_GUIDE.md:965` - Note about wrapper

---

## Summary Statistics

| Registry | Total Methods | Files Affected (Tests) | Files Affected (Docs) |
|----------|--------------|------------------------|----------------------|
| SpellRegistry | 3 | 1 | 3 |
| SkillRegistry | 2 | 8 | 7 |
| FeatureRegistry | 4 | 12 | 5 |
| **Total** | **9** | **21** | **15** |

## Categories of Usage

### Production Code
- None found (all usage is in tests and documentation)

### Test Files
- Unit tests: `tests/unit/*.test.ts`
- Integration tests: `tests/integration/*.test.ts`
- Documentation tests: `tests/documentation/*.test.ts`
- Verification tests: `tests/verification/*.test.ts`

### Documentation Files
- `docs/DATA_ENGINE_REFERENCE.md`
- `docs/EXTENSIBILITY_GUIDE.md`
- `docs/PREREQUISITES.md`
- `docs/CUSTOM_CONTENT.md`
- `USAGE_IN_OTHER_PROJECTS.md`

### Plan Files
- `PLAN_REMOVE_REDUNDANT_REGISTRY_METHODS.md` (references to methods)
- `PLAN_REGISTRY_CONSOLIDATION.md` (historical context)
