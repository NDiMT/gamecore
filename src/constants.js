export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

export const TESTING_GREEN_BG = false;
export const TESTING_BG_COLOR = "#00b04f";

export const ROOM_PREFIX = "chronos-greenhouse-v2-";

export const SEED_TYPES = ["mati", "donti", "stagona", "ftero", "kyklos"];

export const SEEDS = {
  mati:    { id: "mati",    label: "Μάτι",    bagFrame: "bag_mati",    plantFrames: ["mati_0","mati_1","mati_2","mati_3"] },
  donti:   { id: "donti",   label: "Δόντι",   bagFrame: "bag_donti",   plantFrames: ["donti_0","donti_1","donti_2","donti_3"] },
  stagona: { id: "stagona", label: "Σταγόνα", bagFrame: "bag_stagona", plantFrames: ["stagona_0","stagona_1","stagona_2","stagona_3"] },
  ftero:   { id: "ftero",   label: "Φτερό",   bagFrame: "bag_ftero",   plantFrames: ["ftero_0","ftero_1","ftero_2","ftero_3"] },
  kyklos:  { id: "kyklos",  label: "Κύκλος",  bagFrame: "bag_kyklos",  plantFrames: ["kyklos_0","kyklos_1","kyklos_2","kyklos_3"] },
};

export const POTS = [
  { id: 0, placement: "window", labelGr: "παράθυρο",       x: 545, y: 720 },
  { id: 1, placement: "dry",    labelGr: "ξερή γωνία",     x: 140, y: 1010 },
  { id: 2, placement: "water",  labelGr: "δίπλα στο νερό", x: 605, y: 1010 },
  { id: 3, placement: "shade",  labelGr: "σκιά",           x: 180, y: 720 },
  { id: 4, placement: "center", labelGr: "κέντρο",         x: 365, y: 870 },
];

export const SEED_SHELF = [
  { type: "mati",    x: 90,  y: 1170 },
  { type: "donti",   x: 215, y: 1170 },
  { type: "stagona", x: 340, y: 1170 },
  { type: "ftero",   x: 465, y: 1170 },
  { type: "kyklos",  x: 590, y: 1170 },
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

export const TEX_PLANTS = "plants";
export const TEX_ROOM = "room";

function rect(x, y, w, h) { return { x, y, w, h }; }

const PLANT_BANDS = {
  mati:    { y: 27,   h: 261 },
  donti:   { y: 302,  h: 245 },
  stagona: { y: 560,  h: 230 },
  ftero:   { y: 790,  h: 220 },
  kyklos:  { y: 1010, h: 218 },
};

const PLANT_COLS = [
  [80, 180],
  [245, 380],
  [430, 620],
  [640, 890],
];

const BAGS_Y = 1245;
const BAGS_H = 148;
const BAGS = {
  pot_empty:   [40, 180],
  bag_mati:    [210, 335],
  bag_donti:   [360, 485],
  bag_stagona: [505, 625],
  bag_ftero:   [650, 775],
  bag_kyklos:  [785, 910],
};

const CANS_Y = 1419;
const CANS_H = 139;
const CANS = [
  [40, 220],
  [240, 410],
  [455, 660],
  [695, 855],
];

export const FRAMES = {};
SEED_TYPES.forEach((type) => {
  const band = PLANT_BANDS[type];
  PLANT_COLS.forEach(([x0, x1], stage) => {
    FRAMES[`${type}_${stage}`] = rect(x0, band.y, x1 - x0, band.h);
  });
});
Object.entries(BAGS).forEach(([name, [x0, x1]]) => {
  FRAMES[name] = rect(x0, BAGS_Y, x1 - x0, BAGS_H);
});
CANS.forEach(([x0, x1], i) => {
  FRAMES[`can_${i}`] = rect(x0, CANS_Y, x1 - x0, CANS_H);
});
