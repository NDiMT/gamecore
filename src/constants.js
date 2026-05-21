export const ROOM_PREFIX = "chronos-3d-v1-";

export const ERA_PAST = "past";
export const ERA_FUTURE = "future";

export const ROOM = {
  width: 10,
  depth: 12,
  height: 5,
};

export const COLORS_PAST = {
  floor: 0x6b4a2a,
  wall: 0x8a6a44,
  ceil: 0x4a3018,
  trim: 0xc9a25c,
  metal: 0xb0986a,
  stone: 0x8a8275,
  glass: 0x88aacc,
  glow: 0xffcf6a,
  fog: 0x2a1a10,
  ambient: 0x4a3020,
};

export const COLORS_FUTURE = {
  floor: 0x404858,
  wall: 0x3a4252,
  ceil: 0x202028,
  trim: 0x4a7dc9,
  metal: 0x5a6878,
  stone: 0x6a6e74,
  glass: 0x6090c0,
  glow: 0x87b8ff,
  fog: 0x0a1020,
  ambient: 0x1a2030,
};

export const DIAL_SOLUTION = [3, 7, 5];
export const DIAL_RIDDLE = [
  "Ο δράκος που γεννήθηκε από φωτιά,\nμετράει τα κέρατά του από τρία.",
  "Όταν η σελήνη χάνεται και επιστρέφει,\nεπτά νύχτες πέρασαν.",
  "Στο χέρι σου τα δάχτυλα μετριούνται\nκαι στο πέλμα τα ίδια κρατάς.",
];
export const DIAL_FUTURE_LABELS = ["🐉", "🌙", "✋"];

export const PLATE_SOLUTION = [true, false, true, true];
export const PLATE_FUTURE_STATUS = ["ακέραιη", "σπασμένη", "ακέραιη", "ακέραιη"];

export const LEVER_SOLUTION = ["up", "down", "up"];
export const LEVER_HINT_PAST = "Στον τοίχο: τρεις γραμμές\nπάνω-κάτω-πάνω χαραγμένες.";
export const LEVER_HINT_FUTURE = "Λεκές μεταλλικός: \nαπό 3 διακόπτες ένας έχει σκουριά κατεβασμένη.";

export const WIN_MESSAGE = "Η Πύλη του Χρόνου ξυπνά.";
