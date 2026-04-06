/**
 * Mock Gaming Platform Data
 * Provides realistic mock data for Steam API testing
 */

import type { GamingContext } from '../../src/core/types/Progression';

/**
 * Mock Steam API response for GetRecentlyPlayedGames
 * Real API returns: { response: { games: [...], total_count: ... } }
 */
export const mockSteamAPI_RecentlyPlayed = {
  response: {
    games: [
      {
        appid: 730,
        name: 'Counter-Strike 2',
        playtime_forever: 45600,
        playtime_2weeks: 780,
        playtime_linux_forever: 0,
        playtime_mac_forever: 0,
        playtime_windows_forever: 45600,
        rtime_last_played: 1701000000,
        playtime_disconnected: 0
      },
      {
        appid: 812140,
        name: 'Elden Ring',
        playtime_forever: 120000,
        playtime_2weeks: 240,
        playtime_linux_forever: 0,
        playtime_mac_forever: 0,
        playtime_windows_forever: 120000,
        rtime_last_played: 1700900000,
        playtime_disconnected: 0
      },
      {
        appid: 1313860,
        name: 'Hades II',
        playtime_forever: 8400,
        playtime_2weeks: 120,
        playtime_linux_forever: 0,
        playtime_mac_forever: 0,
        playtime_windows_forever: 8400,
        rtime_last_played: 1701100000,
        playtime_disconnected: 0
      }
    ],
    total_count: 45
  }
};

/**
 * Mock Steam game schema (metadata)
 */
export const mockSteamAPI_GameSchema = {
  game: {
    gameName: 'Elden Ring',
    gameVersion: '1.12',
    availableGameStats: {
      stats: [
        { name: 'Total_Playtime', displayName: 'Total Playtime' },
        { name: 'Boss_Defeats', displayName: 'Bosses Defeated' }
      ]
    }
  }
};

/**
 * Gaming context for no active game
 */
export const mockGamingContext_NoGame: GamingContext = {
  isActivelyGaming: false,
  platformSource: 'none',
  currentGame: undefined,
  totalGamingMinutes: 0,
  gamesPlayedWhileListening: [],
  lastUpdated: Date.now()
};

/**
 * Gaming context for playing action game
 */
export const mockGamingContext_ActionGame: GamingContext = {
  isActivelyGaming: true,
  platformSource: 'steam',
  currentGame: {
    name: 'Counter-Strike 2',
    source: 'steam',
    genre: ['Action', 'Competitive', 'Shooter'],
    sessionDuration: 30,  // 30 minutes
    partySize: 1
  },
  totalGamingMinutes: 780,
  gamesPlayedWhileListening: ['Counter-Strike 2'],
  lastUpdated: Date.now()
};

/**
 * Gaming context for playing RPG
 */
export const mockGamingContext_RPGGame: GamingContext = {
  isActivelyGaming: true,
  platformSource: 'steam',
  currentGame: {
    name: 'Elden Ring',
    source: 'steam',
    genre: ['Action RPG', 'Fantasy', 'Dark Fantasy'],
    sessionDuration: 120,  // 2 hours
    partySize: 1
  },
  totalGamingMinutes: 120,
  gamesPlayedWhileListening: ['Elden Ring'],
  lastUpdated: Date.now()
};

/**
 * Gaming context for playing strategy game
 */
export const mockGamingContext_StrategyGame: GamingContext = {
  isActivelyGaming: true,
  platformSource: 'steam',
  currentGame: {
    name: 'Civilization VI',
    source: 'steam',
    genre: ['Strategy', 'Turn-Based', '4X'],
    sessionDuration: 60,  // 1 hour
    partySize: 1
  },
  totalGamingMinutes: 600,
  gamesPlayedWhileListening: ['Civilization VI'],
  lastUpdated: Date.now()
};

/**
 * Gaming context for multiplayer game with party
 */
export const mockGamingContext_MultiplayerGame: GamingContext = {
  isActivelyGaming: true,
  platformSource: 'steam',
  currentGame: {
    name: 'Baldur\'s Gate 3',
    source: 'steam',
    genre: ['RPG', 'Multiplayer', 'Fantasy'],
    sessionDuration: 240,  // 4 hours
    partySize: 4
  },
  totalGamingMinutes: 900,
  gamesPlayedWhileListening: ['Baldur\'s Gate 3', 'Elden Ring'],
  lastUpdated: Date.now()
};

/**
 * Get gaming context for a specific scenario
 */
export function getMockGamingContext(scenario: 'none' | 'action' | 'rpg' | 'strategy' | 'multiplayer'): GamingContext {
  switch (scenario) {
    case 'none':
      return mockGamingContext_NoGame;
    case 'action':
      return mockGamingContext_ActionGame;
    case 'rpg':
      return mockGamingContext_RPGGame;
    case 'strategy':
      return mockGamingContext_StrategyGame;
    case 'multiplayer':
      return mockGamingContext_MultiplayerGame;
    default:
      return mockGamingContext_NoGame;
  }
}

/**
 * Calculate expected gaming bonus for a scenario
 * Formula: 1.0 + base_bonus + genre_bonuses + multiplayer_bonus + duration_bonus
 * - Base: 0.25 (always)
 * - Genre: RPG +0.2, Action +0.15, Strategy +0.1 (can stack)
 * - Multiplayer: +0.15 if partySize > 1
 * - Duration: up to +0.2 for 4+ hours (scales: hours/4 * 0.2)
 */
export function getExpectedGamingBonus(scenario: 'none' | 'action' | 'rpg' | 'strategy' | 'multiplayer'): number {
  switch (scenario) {
    case 'none':
      return 1.0;  // No bonus (not actively gaming)
    case 'action':
      // 1.0 + 0.25 (base) + 0.15 (action) + 0.025 (30min/4hr * 0.2) = 1.425
      return 1.425;
    case 'rpg':
      // 1.0 + 0.25 (base) + 0.2 (rpg matches first in "Action RPG") + 0.1 (2hr/4hr * 0.2) = 1.55
      // Note: 'Action RPG' matches 'rpg' first due to else-if logic, so only +0.2 from rpg
      return 1.55;
    case 'strategy':
      // 1.0 + 0.25 (base) + 0.1 (strategy) + 0.05 (1hr/4hr * 0.2) = 1.4
      return 1.4;
    case 'multiplayer':
      // 1.0 + 0.25 (base) + 0.2 (rpg) + 0.15 (multiplayer) + 0.2 (4hr/4hr * 0.2) = 1.8
      // But capped at 1.75 (maxGamingModifier) per documented design
      return 1.75;
    default:
      return 1.0;
  }
}

/**
 * Mock Steam app list response
 * Used to map app IDs to game names
 */
export const mockSteamAPI_AppList = {
  applist: {
    apps: [
      { appid: 730, name: 'Counter-Strike 2' },
      { appid: 812140, name: 'Elden Ring' },
      { appid: 1313860, name: 'Hades II' },
      { appid: 289070, name: 'Civilization VI' },
      { appid: 1238140, name: 'Baldur\'s Gate 3' },
      { appid: 1172620, name: 'Valheim' },
      { appid: 1091500, name: 'Cyberpunk 2077' }
    ]
  }
};

/**
 * Helper to create a custom gaming context
 */
export function createCustomGamingContext(overrides: Partial<GamingContext>): GamingContext {
  return {
    isActivelyGaming: overrides.isActivelyGaming ?? true,
    platformSource: overrides.platformSource ?? 'steam',
    currentGame: overrides.currentGame,
    totalGamingMinutes: overrides.totalGamingMinutes ?? 0,
    gamesPlayedWhileListening: overrides.gamesPlayedWhileListening ?? [],
    lastUpdated: overrides.lastUpdated ?? Date.now()
  };
}

/**
 * Simulate gaming session with varying duration and bonus calculations
 */
export interface GameSessionScenario {
  name: string;
  context: GamingContext;
  expectedBonus: number;
  description: string;
}

export const gamingSessionScenarios: GameSessionScenario[] = [
  {
    name: 'Solo Action Game - Short Session',
    context: mockGamingContext_ActionGame,
    expectedBonus: 1.425,  // 1.0 + 0.25 (base) + 0.15 (action) + 0.025 (30min session)
    description: 'Playing CS2 for 30 minutes solo'
  },
  {
    name: 'Solo RPG Game - Long Session',
    context: {
      ...mockGamingContext_RPGGame,
      currentGame: {
        ...mockGamingContext_RPGGame.currentGame!,
        sessionDuration: 240  // 4+ hours
      }
    },
    expectedBonus: 1.75,  // 1.0 + 0.25 (base) + 0.2 (rpg) + 0.15 (action) + 0.2 (4hr session) = 1.8, capped at 1.75
    description: 'Playing Elden Ring for 4+ hours (includes session duration bonus)'
  },
  {
    name: 'Multiplayer RPG - Party of 4',
    context: mockGamingContext_MultiplayerGame,
    expectedBonus: 1.75,  // 1.0 + 0.25 (base) + 0.2 (rpg) + 0.15 (multiplayer) + 0.2 (4hr session) = 1.8, capped at 1.75
    description: 'Playing BG3 with party of 4 for 4+ hours'
  },
  {
    name: 'Not Gaming',
    context: mockGamingContext_NoGame,
    expectedBonus: 1.0,  // No bonus
    description: 'No active game'
  }
];
