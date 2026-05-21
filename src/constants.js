export const ROOM_PREFIX = "chronos-mystery-v1-";

export const CHAMBER_SKY = "sky";
export const CHAMBER_ROOT = "root";

export const PALETTE_SKY = {
  fog: 0x06081a,
  floor: 0x1a1c30,
  wall: 0x161830,
  ceil: 0x080820,
  trim: 0x9aafff,
  glow: 0x88aaff,
  star: 0xffe5b0,
  metal: 0x6680b8,
  ambient: 0x202850,
};

export const PALETTE_ROOT = {
  fog: 0x0e0805,
  floor: 0x2a1a10,
  wall: 0x3a2818,
  ceil: 0x1a0e08,
  trim: 0xc9a25c,
  glow: 0xffb05a,
  star: 0xffd680,
  metal: 0x7a5a30,
  ambient: 0x3a2418,
};

export const CONSTELLATION_TARGET = [
  { x: -2.5, y: 2.0 },
  { x: -0.8, y: 3.2 },
  { x: 0.6,  y: 2.6 },
  { x: 1.8,  y: 3.8 },
  { x: 2.8,  y: 1.8 },
];

export const CONSTELLATION_TOLERANCE = 0.55;

export const ALTAR_SLOTS = 3;
export const ALTAR_SOLUTION = ["spiral", "wave", "eye"];

export const CRYSTAL_FACETS = 3;
export const CRYSTAL_SOLUTION = [2, 0, 1];

export const CHAMBER_LABEL = {
  sky:  { title: "Αίθουσα του Σιωπηλού Ουρανού", short: "ΟΥΡΑΝΟΣ" },
  root: { title: "Αίθουσα των Ριζών", short: "ΡΙΖΕΣ" },
};

export const HINTS_SKY = [
  "Πέντε φώτα κρέμονται από το τίποτα. Άγγιξέ τα — θυμούνται που στέκονταν.",
  "Όταν ο ουρανός θυμηθεί το σχήμα του, η πέτρα δίπλα μου ραγίζει αλλιώς.",
  "Ο κρύσταλλος ξυπνά μόνο όταν εκείνη φυτέψει.",
];

export const HINTS_ROOT = [
  "Το χρηματοκιβώτιο κοιμάται. Θέλει αυτόν που μετράει τα αστέρια.",
  "Σπείρε τρεις σπόρους στη σωστή σειρά — οι ρίζες ξέρουν ονόματα.",
  "Όταν τελειώσω εδώ, εκείνος μπορεί να γυρίσει την πέτρα του.",
];

export const SIGIL_DEFS = {
  spiral: { label: "Έλικα", glyph: "༄" },
  wave:   { label: "Κύμα",  glyph: "≋" },
  eye:    { label: "Μάτι",  glyph: "◉" },
  flame:  { label: "Φλόγα", glyph: "▲" },
  moon:   { label: "Σελήνη",glyph: "☾" },
};

export const SIGIL_OPTIONS = ["spiral", "wave", "eye", "flame", "moon"];

export const WIN_MESSAGE = "Η πύλη ανοίγει. Ένας κόσμος φωτίζει τον άλλον.";
