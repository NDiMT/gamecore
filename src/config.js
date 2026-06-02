// Global tuning constants for the dungeon and presentation.
export const TILE = 1; // world units per grid square
export const WALL_H = 1.1; // wall height in world units

// Map generation bounds.
export const MAP_W = 24;
export const MAP_H = 18;

export const MAX_PLAYERS = 4;

// Corridor tiles within this Chebyshev radius of a hero are revealed.
export const CORRIDOR_SIGHT = 3;

// PeerJS room ids are prefixed so we never collide with other apps on the
// public broker. The lobby shows/accepts just the short suffix.
export const ROOM_PREFIX = 'gamecore-hq-';
