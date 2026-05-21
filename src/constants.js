export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

export const TESTING_GREEN_BG = true;
export const TESTING_BG_COLOR = "#00b04f";
export const PRODUCTION_BG_COLOR = "#1a1108";

export const SEED_TYPES = ["mati", "donti", "stagona", "ftero", "kyklos"];

export const SEEDS = {
  mati:    { id: "mati",    label: "Μάτι",     color: 0xd86060, glyph: "◉" },
  donti:   { id: "donti",   label: "Δόντι",    color: 0xe8d8b0, glyph: "▼" },
  stagona: { id: "stagona", label: "Σταγόνα",  color: 0x6ba8ff, glyph: "💧" },
  ftero:   { id: "ftero",   label: "Φτερό",    color: 0xb89cff, glyph: "❦" },
  kyklos:  { id: "kyklos",  label: "Κύκλος",   color: 0x7ade7a, glyph: "○" },
};

export const POT_PLACEMENTS = ["window", "dry", "water", "shade", "center"];

export const POTS = [
  { id: 0, placement: "window", labelGr: "παράθυρο",   x: 540, y: 760 },
  { id: 1, placement: "dry",    labelGr: "ξερή γωνία",  x: 130, y: 990 },
  { id: 2, placement: "water",  labelGr: "δίπλα στο νερό", x: 590, y: 990 },
  { id: 3, placement: "shade",  labelGr: "σκιά",        x: 180, y: 760 },
  { id: 4, placement: "center", labelGr: "κέντρο",      x: 360, y: 880 },
];

export const SEED_SHELF = [
  { type: "mati",    x: 110, y: 1140 },
  { type: "donti",   x: 230, y: 1140 },
  { type: "stagona", x: 350, y: 1140 },
  { type: "ftero",   x: 470, y: 1140 },
  { type: "kyklos",  x: 590, y: 1140 },
];

export const SOLUTION = {
  window: "ftero",
  water:  "stagona",
  center: "kyklos",
};

export const HINT_NOTE_TEXT = "Ό,τι σπάρθηκε πριν,\nακόμα θυμάται το φως.";

export const DIARY_TEXT = [
  "Εκείνο που ήθελε αέρα",
  "μεγάλωσε προς το σπασμένο παράθυρο.",
  "",
  "Εκείνο που ήπιε πολύ",
  "δεν σταμάτησε να κλαίει.",
  "",
  "Εκείνο που δεν είχε αρχή,",
  "έκλεισε τον εαυτό του σε ένα τέλος.",
].join("\n");

export const WIN_TEXT = "Το δωμάτιο θυμήθηκε σωστά.";

export const ERA_PAST = "past";
export const ERA_FUTURE = "future";

export const COLORS = {
  potBase: 0x4a2e1a,
  potRim: 0x6a4828,
  potShadow: 0x2a1810,
  soilDark: 0x2a1808,
  soilLight: 0x4a2e1a,
  noteBg: 0xd9c89a,
  noteText: 0x3a2818,
  diaryBg: 0xa0a8b0,
  diaryText: 0x1a1820,
  doorClosed: 0x3a2818,
  doorOpen: 0xc9a25c,
  ui: 0xf0d9a8,
  uiDim: 0x8a7a5a,
  green: 0x00b04f,
};
