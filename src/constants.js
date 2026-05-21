export const ROOM_PREFIX = "chronos-mystery-v2-";

export const CHAMBER_SKY = "sky";
export const CHAMBER_ROOT = "root";

export const PALETTE_SKY = {
  fog: 0x040614,
  floor: 0x0c1024,
  wall: 0x10142a,
  ceil: 0x05071a,
  trim: 0x9aafff,
  glow: 0x88aaff,
  star: 0xfff0c8,
  metal: 0x5a7090,
  ambient: 0x101830,
};

export const PALETTE_ROOT = {
  fog: 0x080502,
  floor: 0x1f1208,
  wall: 0x2a1810,
  ceil: 0x130905,
  trim: 0xd4a060,
  glow: 0xffb050,
  star: 0xffd680,
  metal: 0x8a6028,
  ambient: 0x2a1810,
};

export const STAR_MAP_SIZE = 12;
export const STAR_MAP_SOLUTION = [1, 3, 5, 8, 10];
export const STAR_MAP_POSITIONS = [
  { x: -3.2, y: 3.6 }, { x: -2.0, y: 2.4 }, { x: -1.4, y: 4.1 },
  { x: -0.6, y: 3.1 }, { x:  0.2, y: 4.0 }, { x:  0.8, y: 2.3 },
  { x:  1.4, y: 4.2 }, { x:  2.1, y: 3.1 }, { x:  2.8, y: 1.8 },
  { x: -2.8, y: 1.6 }, { x:  0.0, y: 1.5 }, { x:  3.2, y: 4.0 },
];

export const COMBO_DISCS = 4;
export const COMBO_SYMBOLS = ["☉", "☽", "✦", "❋", "◈", "↟"];
export const COMBO_NAMES   = ["Ήλιος", "Σελήνη", "Κάλλος", "Άνθος", "Πέτρα", "Όρος"];
export const COMBO_SOLUTION = [3, 0, 5, 2];

export const TOWER_COUNT = 5;
export const TOWER_SEQUENCE = [2, 4, 0, 3, 1];

export const HINTS_SKY = [
  "Δώδεκα φώτα ψιθυρίζουν στον τοίχο σου. Μόνο πέντε είναι αλήθεια — η σύντροφος έχει τον χάρτη τους.",
  "Όταν οι ρίζες ξυπνήσουν, πέντε πύργοι θα ανθίσουν εδώ. Άγγιξέ τους με τάξη — η σειρά γραμμένη όχι σ' αυτόν τον κόσμο.",
];

export const HINTS_ROOT = [
  "Έχω χάρτη του ουρανού — πέντε σημεία σημαδεμένα. Διηγήσου τα στο σύντροφο.",
  "Τέσσερις δίσκοι, έξι σύμβολα. Ένα μου ψιθύρισε ο πάπυρος. Τρία θα τα δει εκείνη στους τοίχους.",
  "Ποίημα για τους πύργους:\nπρώτη η κάτω αριστερά,\nμετά η κάτω δεξιά,\nμετά η ψηλή στην κορυφή,\nμετά η δεξιά πλευρά,\nκαι τέλος η αριστερή.",
];

export const PAPYRUS_FRAGMENT_ROOT = "Ο πρώτος δίσκος δείχνει το \"❋\".";

export const PAPYRUS_FRAGMENT_SKY_WALL = [
  { wall: "north", symbol: "↟" },
  { wall: "east", symbol: "☉" },
  { wall: "west", symbol: "✦" },
];

export const WIN_MESSAGE = "Δύο αίθουσες — ένα αναπνοή. Η πύλη ανοίγει.";

export const STAR_MAP_REFERENCE = STAR_MAP_SOLUTION.map(i => STAR_MAP_POSITIONS[i]);
