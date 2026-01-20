# Core Data Engine - Consolidation Checklist

## Purpose
This is a **one-time review tool** to help consolidate 6 spec files (~1,600 lines) into a minimal, non-redundant set. The goal: reduce to 1-2 files (< 500 lines) that capture everything without repetition.

---

## Current State (6 files, ~1,600 lines)

| File | Lines | Purpose | Redundancy Issues |
|------|-------|---------|-------------------|
| **spec.md** | 321 | User stories, requirements, acceptance criteria | Overlaps with tasks.md |
| **data-model.md** | 334 | Type definitions and validation | Should be reference section |
| **plan.md** | 337 | Architecture, phases, project structure | Overlaps with spec.md |
| **research.md** | 137 | Technology decisions | Brief annotations in main doc |
| **tasks.md** | 357 | Detailed task breakdown | Duplicates user stories |
| **This file** | ~150 | One-time review tool | DELETE after consolidation |

---

## Consolidation Goal

**Target**: 1-2 files, < 500 lines total

**Proposed Structure:**
- **SPEC.md** - Single source of truth (features, data models, tasks)
- **(Optional) DECISIONS.md** - Brief technology rationale

---

## Step 1: Feature Implementation Status

Mark what's actually implemented. This tells us what to KEEP in the final spec.

**Legend**: ✅ Fully implemented | ⚠️ Partial | ❌ Not implemented

#### Feature 1: Playlist Parsing & Metadata
- [x] Arweave/JSON input acceptance
- [x] Metadata extraction with priority queues
- [x] Deterministic seed generation
- [x] Audio URL validation (404 = "Unsummonable")
- **Status**: _____ / 4

#### Feature 2: Audio Analysis ("Triple Tap")
- [x] 5%/40%/70% sampling
- [x] Bass/mid/treble dominance
- [x] Short file handling (< 3s)
- [x] Advanced metrics (optional)
- **Status**: 4 / 4

#### Feature 3: Visual Analysis
- [x] Color palette extraction
- [x] 4 dominant colors
- [x] Brightness/saturation/monochrome
- **Status**: 3 / 3

#### Feature 4: Character Generation
- [ ] D&D 5e character sheets
- [ ] Audio → ability score mapping
- [ ] Deterministic race/class
- [ ] Racial bonuses
- **Status**: _____ / 4

#### Feature 5: Character Naming
- [ ] 3-format weighted (50/30/20)
- [ ] Title cleaning
- [ ] Adjective generation
- **Status**: _____ / 3

#### Feature 6: Advanced Character System
- [ ] 18 D&D skills with proficiencies
- [ ] Class-based proficiencies
- [ ] Spell lists and slots
- [ ] Equipment and inventory
- [ ] Character appearance
- **Status**: _____ / 5

#### Feature 7: Environmental Sensors
- [ ] GPS/motion/weather/light
- [ ] Activity type detection
- [ ] Biome detection
- [ ] XP modifiers (capped 3.0x)
- [ ] Permission handling
- **Status**: _____ / 5

#### Feature 8: Gaming Platform Integration
- [ ] Steam/Discord integration
- [ ] Gaming bonus calculation
- [ ] Compound modifiers
- [ ] Polling with backoff
- **Status**: _____ / 4

#### Feature 9: Progression System
- [ ] XP calculation (1 XP/sec)
- [ ] D&D 5e level thresholds
- [ ] Level-up mechanics
- [ ] Track mastery
- **Status**: _____ / 4

#### Feature 10: Combat Engine (Optional)
- [ ] Initiative rolls
- [ ] Attack/damage resolution
- [ ] Critical hits
- [ ] Spell casting
- **Status**: _____ / 4

---

## Step 2: File-by-File Analysis

Identify UNIQUE content to keep vs. redundant content to remove.

### spec.md (321 lines)
**Keep:**
- [ ] Functional requirements (FR-001 to FR-042)
- [ ] Non-functional requirements (NFR-001 to NFR-008)
- [ ] Success criteria (SC-001 to SC-013)
- [ ] Edge cases

**Remove (duplicates):**
- [ ] User stories (covered in tasks)
- [ ] Acceptance scenarios (covered in tasks)
- [ ] Clarifications (obsolete)

### data-model.md (334 lines)
**Keep:**
- [ ] Type definitions (if not in code)

**Remove:**
- [ ] If types are documented in code via JSDoc

### plan.md (337 lines)
**Keep:**
- [ ] Architecture diagram
- [ ] Data flow overview
- [ ] Phased delivery summary

**Remove (duplicates):**
- [ ] Detailed task breakdown (duplicates tasks.md)
- [ ] Risk mitigation (obsolete)

### research.md (137 lines)
**Keep:**
- [ ] Technology choices (briefly as annotations)

**Remove:**
- [ ] Open questions (answered)
- [ ] Next steps (obsolete)

### tasks.md (357 lines)
**Keep:**
- [ ] Implementation status

**Remove (duplicates):**
- [ ] Detailed task descriptions (if implementation complete)
- [ ] Dependency mapping (no longer needed)

---

## Step 3: Proposed Final Structure

Choose one:

**Option A: Single Comprehensive Spec**
```
SPEC.md (~300-400 lines)
├── Overview
├── Features (10 sections: description, requirements, data types, status)
├── Data Models (compact reference)
├── Architecture (brief)
└── Implementation Status
```

**Option B: Two Focused Files**
```
SPEC.md (~250 lines) - Features, requirements, data types, status
DECISIONS.md (~100 lines) - Architecture, technology choices
```

**Option C: Code-First**
```
No separate spec files - document everything in code via JSDoc
One simple README.md with overview and links
```

**My choice**: **Option B** - Two Focused Files

**Rationale**:
- Implementation is complete (426 tests, 98.4% pass rate)
- Type definitions are now in code via TypeScript/JSDoc
- Keeping features/requirements separate from technology decisions improves maintainability
- Two files keeps documentation focused without being overwhelming

---

## Step 4: Consolidation Actions

1. [x] Choose final structure (A, B, or C) - **Selected Option B**
2. [ ] Create new consolidated file(s)
3. [ ] Delete redundant files
4. [ ] Update cross-references
5. [ ] DELETE this checklist (one-time tool)

---

## Files to Review

Read each file once, then consolidate:

- [ ] spec.md - What's essential here?
- [ ] data-model.md - Can this be inline or in code?
- [ ] plan.md - What's actually useful?
- [ ] research.md - Any decisions worth keeping?
- [ ] tasks.md - Is this complete and still needed?

---

## Success Metric

**Before**: 6 files, ~1,600 lines
**After**: 1-2 files, < 500 lines

**Quality test**: Can I find everything without jumping between files?
