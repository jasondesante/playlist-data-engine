# Data Model: Core Data Engine

## Core Entities

### ServerlessPlaylist
Container for playlist metadata and tracks.

- **name**: string - Playlist name
- **description**: string (optional) - Playlist description
- **image**: string - URL to playlist cover art
- **creator**: string - Wallet address of curator
- **genre**: string (optional) - General genre
- **tags**: string[] (optional) - Search tags
- **tracks**: PlaylistTrack[] - Array of flattened track objects

### PlaylistTrack
Single source of truth for a track, merging blockchain data with parsed metadata.

**Identity & Blockchain Data:**
- **id**: string - Format: `${chain_name}-${token_address}-${token_id}`
- **uuid**: string - Unique instance ID for game engine
- **playlist_index**: number - Order in playlist
- **chain_name**: string - e.g. "ethereum", "optimism"
- **token_address**: string - Contract address (or 0x0 for files)
- **token_id**: string - Token ID (or 0 for files)
- **platform**: string - Platform identifier

**Content Data:**
- **title**: string - Extracted via naming logic
- **artist**: string - Extracted via artist logic
- **description**: string (optional) - Track description
- **album**: string (optional) - Album name

**Assets:**
- **image_url**: string - Result of image extraction logic
- **audio_url**: string - Result of audio extraction logic
- **duration**: number - In seconds

**Meta Tags:**
- **genre**: string - Primary genre
- **tags**: string[] - All tags (lowercased)
- **bpm**: number (optional) - Beats per minute
- **key**: string (optional) - Musical key

**Raw Attributes:**
- **attributes**: Record<string, string | number> (optional) - Edge case data

## Audio Analysis

### AudioProfile
Result of "Triple Tap" frequency analysis.

**Frequency Dominance:**
- **bass_dominance**: number (0-1) - 20Hz-250Hz energy
- **mid_dominance**: number (0-1) - 250Hz-4kHz energy
- **treble_dominance**: number (0-1) - 4kHz-20kHz energy
- **average_amplitude**: number (0-1) - Overall volume/energy

**Advanced Metrics (Optional):**
- **spectral_centroid**: number (optional) - Brightness of sound
- **spectral_rolloff**: number (optional) - High frequency drop-off point
- **zero_crossing_rate**: number (optional) - Percussiveness indicator
- **duration**: number - Confirmed duration in seconds

**Visual Data:**
- **colorPalette**: ColorPalette (optional) - Only present if image analyzed

### ColorPalette
Dominant colors extracted from album artwork.

- **primary**: string - Most common color (hex: "#A1B2C3")
- **secondary**: string - 2nd most common color
- **tertiary**: string - 3rd most common color
- **accent**: string - 4th most common color
- **brightness**: number (0-1) - Average luminance
- **saturation**: number (0-1) - Average saturation
- **is_monochrome**: boolean - True if all colors are grayscale

## Character System

### CharacterSheet
Full D&D 5e-inspired character object.

**Core Identity:**
- **name**: string - Generated character name
- **title**: string (optional) - e.g. "Thumping Midnight City the Bard"
- **level**: number (1-20)
- **experience_points**: number

**D&D Core Stats:**
- **race**: Race - Character race (deterministic from seed)
- **class**: Class - Character class (from audio profile)
- **background**: Background (optional)
- **alignment**: Alignment (optional)

**Ability Scores:**
- **ability_scores**: AbilityScores - STR, DEX, CON, INT, WIS, CHA (3-20)
- **ability_modifiers**: AbilityModifiers - Derived modifiers (-4 to +5)

**Combat Stats:**
- **hit_points**: { current: number, maximum: number, temporary: number }
- **armor_class**: number
- **initiative_bonus**: number
- **speed**: number - In feet

**Proficiencies:**
- **proficiency_bonus**: number - Based on level
- **saving_throws**: SavingThrows - Boolean for each ability
- **skills**: SkillProficiencies - 18 skills with proficiency levels

**Combat Abilities:**
- **attacks**: Attack[] - Available attacks
- **spells_known**: Spell[] (optional) - Known spells
- **spell_slots**: SpellSlots (optional) - Available spell slots

**Features & Abilities:**
- **class_features**: ClassFeature[] - Class-specific features
- **racial_traits**: RacialTrait[] - Race-specific traits
- **feats**: Feat[] - Acquired feats

**Equipment:**
- **inventory**: InventoryItem[] - All items
- **equipped_items**: EquippedItems - Currently equipped
- **currency**: { gold: number, silver: number, copper: number }

**Personality (Optional):**
- **personality_traits**: string[] (optional)
- **ideals**: string[] (optional)
- **bonds**: string[] (optional)
- **flaws**: string[] (optional)

**Visuals:**
- **appearance**: CharacterAppearance - Rendering data

**Progression:**
- **listening_sessions**: ListeningSession[] - Session history
- **total_listening_time**: number - Total seconds
- **tracks_mastered**: string[] - Track UUIDs

### AbilityScores
D&D 5e ability scores (3-20 range, 10 is baseline).

- **strength**: number
- **dexterity**: number
- **constitution**: number
- **intelligence**: number
- **wisdom**: number
- **charisma**: number

### AbilityModifiers
Calculated modifiers: `(score - 10) / 2` rounded down.

- **strength**: number (-4 to +5)
- **dexterity**: number
- **constitution**: number
- **intelligence**: number
- **wisdom**: number
- **charisma**: number

### SkillProficiencies
18 D&D skills with proficiency levels.

**STR-based:**
- **athletics**: ProficiencyLevel

**DEX-based:**
- **acrobatics**: ProficiencyLevel
- **sleight_of_hand**: ProficiencyLevel
- **stealth**: ProficiencyLevel

**INT-based:**
- **arcana**: ProficiencyLevel
- **history**: ProficiencyLevel
- **investigation**: ProficiencyLevel
- **nature**: ProficiencyLevel
- **religion**: ProficiencyLevel

**WIS-based:**
- **animal_handling**: ProficiencyLevel
- **insight**: ProficiencyLevel
- **medicine**: ProficiencyLevel
- **perception**: ProficiencyLevel
- **survival**: ProficiencyLevel

**CHA-based:**
- **deception**: ProficiencyLevel
- **intimidation**: ProficiencyLevel
- **performance**: ProficiencyLevel
- **persuasion**: ProficiencyLevel

### ProficiencyLevel
- **'none'** - No bonus
- **'proficient'** - Add proficiency bonus
- **'expertise'** - Double proficiency bonus

### CharacterAppearance
Visual customization data.

**Deterministic (from seed):**
- **body_type**: 'slender' | 'athletic' | 'muscular' | 'stocky'
- **skin_tone**: string - Hex color
- **hair_style**: number - Style catalog index
- **hair_color**: string - Hex color
- **eye_color**: string - Hex color
- **facial_features**: number - Variant ID

**Dynamic (from audio/visual):**
- **primary_color**: string - Armor/clothing (from album art)
- **secondary_color**: string - Accent color
- **aura_color**: string (optional) - For magical classes

**Equipment Visuals:**
- **armor_appearance**: { type: ArmorType, style_id: number }
- **weapon_appearance**: { type: WeaponType, style_id: number }
- **accessory_slots**: { head?, neck?, back?, hands?: InventoryItem }

## Environmental & Gaming Context

### EnvironmentalContext
Real-world sensor data for gameplay bonuses.

**Sensor Data:**
- **location**: GeolocationData (optional)
- **motion**: MotionData (optional)
- **weather**: WeatherData (optional)
- **light**: LightData (optional)

**Derived Gameplay Data:**
- **biome**: 'urban' | 'forest' | 'desert' | 'mountain' | 'water' | 'tundra' (optional)
- **time_of_day**: 'dawn' | 'day' | 'dusk' | 'night' (optional)
- **season**: 'spring' | 'summer' | 'autumn' | 'winter' (optional)
- **environmental_xp_modifier**: number (0.5 to 3.0)

### GeolocationData
GPS and location data.

- **latitude**: number
- **longitude**: number
- **altitude**: number (optional) - Meters above sea level
- **accuracy**: number - Meters
- **altitude_accuracy**: number (optional)
- **heading**: number (optional) - Direction 0-360 degrees
- **speed**: number (optional) - Meters per second
- **timestamp**: number - Unix timestamp

### MotionData
Accelerometer and gyroscope data.

- **acceleration**: { x: number, y: number, z: number } - m/s²
- **acceleration_with_gravity**: { x: number, y: number, z: number }
- **rotation_rate**: { alpha: number, beta: number, gamma: number } - deg/s
- **movement_intensity**: number (0-1) - Calculated from acceleration
- **activity_type**: 'stationary' | 'walking' | 'running' | 'driving' | 'unknown'
- **timestamp**: number

### WeatherData
Weather API data.

- **temperature**: number - Celsius
- **feels_like**: number - Apparent temperature
- **humidity**: number - Percentage
- **pressure**: number - hPa
- **weather_type**: 'clear' | 'clouds' | 'rain' | 'snow' | 'thunderstorm' | 'mist' | 'fog'
- **wind_speed**: number - m/s
- **wind_direction**: number - Degrees
- **visibility**: number - Meters
- **is_night**: boolean - Based on sunrise/sunset
- **moon_phase**: number (optional) - 0.0 to 1.0
- **timestamp**: number

### GamingContext
Steam and Discord gaming activity data.

- **isActivelyGaming**: boolean
- **platformSource**: 'steam' | 'discord' | 'both' | 'none'
- **currentGame**: { name: string, source: 'steam' | 'discord', genre?: string[], sessionDuration?: number, partySize?: number } (optional)
- **totalGamingMinutes**: number - Lifetime gaming while listening
- **gamesPlayedWhileListening**: string[] - Unique game titles
- **lastUpdated**: number - Timestamp

## Progression System

### ListeningSession
Record of a single listening session with bonuses.

- **track_uuid**: string
- **start_time**: number - Unix timestamp
- **end_time**: number - Unix timestamp
- **duration_seconds**: number
- **base_xp_earned**: number
- **bonus_xp**: number
- **environmental_context**: EnvironmentalContext (optional)
- **gaming_context**: GamingContext (optional)
- **activity_type**: string (optional)
- **total_xp_earned**: number

## Type Enums

### Race
- 'Human' | 'Elf' | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling'

### CharacterClass
- 'Barbarian' | 'Bard' | 'Cleric' | 'Druid' | 'Fighter' | 'Monk' | 'Paladin' | 'Ranger' | 'Rogue' | 'Sorcerer' | 'Warlock' | 'Wizard'

### DamageType
- Physical: 'slashing' | 'piercing' | 'bludgeoning'
- Elemental: 'fire' | 'cold' | 'lightning' | 'thunder' | 'poison' | 'acid'
- Magical: 'necrotic' | 'radiant' | 'psychic' | 'force'

### SpellSchool
- 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation'

## Validation Rules

### PlaylistTrack Validation
- **audio_url**: Must be valid URL. 404s mark track as "Unsummonable" (excluded)
- **duration**: Must be positive number
- **id**: Must follow format `${chain_name}-${token_address}-${token_id}`

### CharacterSheet Validation
- **ability_scores**: Each score 3-20 range
- **level**: 1-20 range
- **hit_points.current**: Cannot exceed maximum
- **proficiency_bonus**: Calculated from level: `Math.floor((level - 1) / 4) + 2`

### EnvironmentalContext Validation
- **environmental_xp_modifier**: 0.5 to 3.0 range (capped)
- **movement_intensity**: 0.0 to 1.0 range
- **temperature**: Reasonable range (-50 to 60 Celsius)

### GamingContext Validation
- **totalGamingMinutes**: Non-negative
- **sessionDuration**: Non-negative
