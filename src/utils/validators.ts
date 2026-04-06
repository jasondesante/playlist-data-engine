/**
 * Zod validation schemas for data validation
 */

import { z } from 'zod';
import { DEFAULT_CLASSES } from '../core/types/Character.js';

// String values of default classes for Zod validation
const DEFAULT_CLASS_VALUES = DEFAULT_CLASSES.map(c => c as string) as [string, ...string[]];

/**
 * Playlist Track schema
 */
export const PlaylistTrackSchema = z.object({
    id: z.string(),
    uuid: z.string(),
    playlist_index: z.number().nonnegative(),
    chain_name: z.string(),
    token_address: z.string().optional(),
    token_id: z.string().optional(),
    tx_id: z.string().optional(),
    platform: z.string(),
    title: z.string(),
    artist: z.string(),
    description: z.string().optional(),
    album: z.string().optional(),
    image_url: z.string().url(),
    image_thumb_url: z.string().url().optional(),
    audio_url: z.string().url(),
    audio_url_lossless: z.string().url().optional(),
    duration: z.number().nonnegative(),
    genre: z.string(),
    tags: z.array(z.string()),
    bpm: z.number().positive().optional(),
    key: z.string().optional(),
    attributes: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
}).refine(
    (track) => {
        // For Arweave (AR) chain: must have tx_id
        if (track.chain_name === 'AR') {
            return !!track.tx_id;
        }
        // For other chains: must have token_address and token_id
        return !!track.token_address && !!track.token_id;
    },
    {
        message: 'AR chain tracks must have tx_id; other chains must have token_address and token_id',
        path: ['chain_name'],
    }
);

/**
 * Serverless Playlist schema
 */
export const ServerlessPlaylistSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    image: z.string().url(),
    creator: z.string(),
    genre: z.string().optional(),
    tags: z.array(z.string()).optional(),
    tracks: z.array(PlaylistTrackSchema),
});

/**
 * Audio Profile schema
 */
export const AudioProfileSchema = z.object({
    bass_dominance: z.number().min(0).max(1),
    mid_dominance: z.number().min(0).max(1),
    treble_dominance: z.number().min(0).max(1),
    average_amplitude: z.number().min(0).max(1),
    spectral_centroid: z.number().optional(),
    spectral_rolloff: z.number().optional(),
    zero_crossing_rate: z.number().optional(),
    color_palette: z.object({
        colors: z.array(z.string()),
        primary_color: z.string(),
        secondary_color: z.string().optional(),
        accent_color: z.string().optional(),
        brightness: z.number().min(0).max(1),
        saturation: z.number().min(0).max(1),
        is_monochrome: z.boolean(),
    }).optional(),
    analysis_metadata: z.object({
        duration_analyzed: z.number().positive(),
        full_buffer_analyzed: z.boolean(),
        sample_positions: z.array(z.number()),
        analyzed_at: z.string(),
    }),
});

/**
 * Ability Scores schema
 */
export const AbilityScoresSchema = z.object({
    STR: z.number().min(1).max(20),
    DEX: z.number().min(1).max(20),
    CON: z.number().min(1).max(20),
    INT: z.number().min(1).max(20),
    WIS: z.number().min(1).max(20),
    CHA: z.number().min(1).max(20),
});

/**
 * Character Sheet schema
 */
export const CharacterSheetSchema = z.object({
    name: z.string(),
    race: z.enum(['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling']),
    class: z.enum(DEFAULT_CLASS_VALUES),
    level: z.number().min(1).max(20),
    ability_scores: AbilityScoresSchema,
    ability_modifiers: AbilityScoresSchema,
    proficiency_bonus: z.number().min(2).max(6),
    hp: z.object({
        current: z.number().nonnegative(),
        max: z.number().positive(),
        temp: z.number().nonnegative(),
    }),
    armor_class: z.number().positive(),
    initiative: z.number(),
    speed: z.number().positive(),
    skills: z.record(z.string(), z.enum(['none', 'proficient', 'expertise'])),
    saving_throws: z.record(z.string(), z.boolean()),
    racial_traits: z.array(z.string()),
    class_features: z.array(z.string()),
    spells: z.object({
        spell_slots: z.record(z.string(), z.object({
            total: z.number().nonnegative(),
            used: z.number().nonnegative(),
        })),
        known_spells: z.array(z.string()),
        cantrips: z.array(z.string()),
    }).optional(),
    equipment: z.object({
        weapons: z.array(z.string()),
        armor: z.array(z.string()),
        items: z.array(z.string()),
    }).optional(),
    appearance: z.object({
        body_type: z.string(),
        skin_tone: z.string(),
        hair_style: z.string(),
        hair_color: z.string(),
        eye_color: z.string(),
        facial_features: z.array(z.string()),
        primary_color: z.string().optional(),
        secondary_color: z.string().optional(),
        aura_color: z.string().optional(),
    }).optional(),
    xp: z.object({
        current: z.number().nonnegative(),
        next_level: z.number().positive(),
    }),
    seed: z.string(),
    generated_at: z.string(),
});
