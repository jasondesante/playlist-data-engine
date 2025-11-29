# Research: Core Data Engine

**Feature**: Core Data Engine
**Date**: 2025-11-29
**Updated**: 2025-11-29

## Decisions

### 1. Deterministic Hashing
- **Decision**: Use `murmurhash-v3` for deterministic seeding.
- **Rationale**: Fast, standard, and produces consistent 32-bit integers suitable for seeding RNGs. Widely used in game development for procedural generation.
- **Alternatives**: `crypto.createHash` (too slow/heavy for client-side), `Math.random` (not deterministic).

### 2. Audio Analysis Strategy
- **Decision**: Use `OfflineAudioContext` for analysis where possible to run faster than real-time.
- **Rationale**: Allows processing buffers without playing them. Can analyze 3-minute track in < 1 second.
- **Alternatives**: `AudioContext` (real-time, requires playback time).

### 3. Isomorphic Audio
- **Decision**: Abstract audio fetching and decoding behind an interface `IAudioProvider`.
- **Rationale**: Browsers use `fetch` + `decodeAudioData`. Node.js needs a different approach (or a polyfill). For the prototype, we focus on the Browser implementation as per clarifications.
- **Alternatives**: Dual implementation (rejected due to complexity for MVP).

### 4. D&D 5e Rules Source
- **Decision**: Implement a simplified subset of SRD 5.1 rules hardcoded as data structures.
- **Rationale**: No need for an external API; rules are static. Avoids network dependency and API costs.
- **Alternatives**: D&D Beyond API (requires partnership), Open5e API (network dependency).

### 5. Color Palette Extraction
- **Decision**: Use k-means clustering with median cut as fallback.
- **Rationale**: K-means provides better color separation for vibrant images. Median cut is faster for simple images.
- **Alternatives**: Octree quantization (more complex), simple histogram (less accurate).
- **Implementation**: HTML5 Canvas `getImageData()` at 100x100px resolution for performance.

### 6. Environmental Sensors
- **Decision**: Use native browser APIs with explicit permission requests.
- **Rationale**: No external dependencies, privacy-first design, graceful degradation.
- **APIs**:
  - Geolocation: `navigator.geolocation` (97% browser support)
  - Motion: `DeviceMotionEvent` and `DeviceOrientationEvent` (95% mobile, 70% desktop)
  - Light: `AmbientLightSensor` (experimental, < 30% support - optional enhancement)
- **Alternatives**: Third-party sensor libraries (rejected due to privacy concerns and bundle size).

### 7. Weather API Integration
- **Decision**: Use OpenWeatherMap API with developer-provided API key.
- **Rationale**: Free tier available, comprehensive data, good documentation.
- **Alternatives**: WeatherAPI.com (similar), AccuWeather (more expensive).
- **Privacy**: Weather data fetched client-side, no server-side storage.

### 8. Gaming Platform Integration
- **Decision**: Steam Web API + Discord Rich Presence with CORS-compliant proxy or backend service.
- **Rationale**: 
  - Steam: Most comprehensive gaming platform, Web API provides game metadata
  - Discord: Popular for gaming communities, Rich Presence shows current activity
- **Challenges**:
  - Steam Web API requires server-side calls (CORS restrictions)
  - Discord RPC requires desktop app or OAuth2 for web
- **Solution**: Provide proxy implementation example, allow developers to implement backend
- **Alternatives**: Epic Games API (less comprehensive), Xbox Live API (requires partnership).

### 9. Character Naming Engine
- **Decision**: Implement 3-format weighted random system with deterministic seed.
- **Rationale**: Provides variety while maintaining determinism. Weighted probabilities ensure most common formats appear more frequently.
- **Formats**:
  1. Class Title (50%): "Midnight City the Bard"
  2. Adjective Construct (30%): "Thumping Midnight City"
  3. Clan Construct (20%): "Midnight City of M83"
- **Alternatives**: Single format (too repetitive), fully random (not deterministic).

### 10. Skill Proficiency System
- **Decision**: Implement full 18-skill D&D 5e system with proficiency levels.
- **Rationale**: Enables deep character customization and gameplay mechanics.
- **Proficiency Levels**: none, proficient (+proficiency bonus), expertise (double proficiency bonus)
- **Alternatives**: Simplified 6-skill system (rejected due to reduced depth).

### 11. Spell System
- **Decision**: Hardcode spell lists and slot tables from SRD 5.1.
- **Rationale**: Static data, no need for dynamic loading. Reduces bundle size vs. full spell database.
- **Scope**: Include cantrips + levels 1-9 for all spellcasting classes.
- **Alternatives**: External spell API (network dependency), full spell database (large bundle).

### 12. XP Calculation
- **Decision**: Base XP = 1 XP per second of listening, with multiplicative bonuses.
- **Rationale**: Simple, intuitive, and scales well with environmental/gaming bonuses.
- **Bonus System**:
  - Environmental: 1.0x - 2.0x (running, weather, altitude, etc.)
  - Gaming: 1.0x - 1.75x (genre, party, session duration)
  - Compound: Capped at 3.0x total
- **Alternatives**: Fixed XP per track (doesn't reward engagement), exponential scaling (too complex).

### 13. Combat Engine (Optional)
- **Decision**: Implement simplified D&D 5e combat with initiative, attacks, and spells.
- **Rationale**: Enables tactical RPG gameplay for advanced developers.
- **Scope**: Turn-based, initiative rolls, attack rolls, damage calculation, spell casting.
- **Alternatives**: Real-time combat (too complex), no combat (limits use cases).
- **Note**: Marked as optional (Phase 6) to avoid scope creep.

### 14. Testing Strategy
- **Decision**: Use Vitest with comprehensive mocking for external dependencies.
- **Rationale**: Fast, Vite-compatible, excellent mocking support for APIs and sensors.
- **Mock Data**: Provide fixtures for playlists, audio buffers, images, sensor data, gaming data.
- **Alternatives**: Jest (slower, less Vite integration), Mocha (requires more setup).

### 15. Performance Optimization
- **Decision**: Use Web Workers for audio analysis and color extraction.
- **Rationale**: Prevents blocking main thread, improves perceived performance.
- **Implementation**: Optional enhancement, graceful fallback to main thread.
- **Alternatives**: Service Workers (overkill), synchronous processing (blocks UI).

### 16. Privacy & Security
- **Decision**: No server-side storage of sensor or gaming data by default.
- **Rationale**: Privacy-first design, GDPR/CCPA compliant.
- **Implementation**:
  - All sensor access requires explicit opt-in
  - Clear permission dialogs explaining data usage
  - Option to use bonuses without sharing data (honor system)
  - Gaming data never shared with third parties
- **Alternatives**: Server-side analytics (rejected due to privacy concerns).

## Open Questions

- **Q1**: Should we provide a default weather API key for demos?
  - **A**: No, require developers to provide their own to avoid abuse.

- **Q2**: Should combat engine be in separate package?
  - **A**: No, keep as optional feature in main package with tree-shaking.

- **Q3**: Should we support custom D&D homebrew rules?
  - **A**: Not in MVP, but design interfaces to allow extension.

## Next Steps

1. Implement Phase 0 (Foundation) first
2. Gather feedback on MVP before proceeding to advanced features
3. Consider community contributions for spell database expansion
4. Monitor browser API support for sensors and adjust graceful degradation
