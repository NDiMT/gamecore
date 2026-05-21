export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

export const TESTING_GREEN_BG = false;
export const TESTING_BG_COLOR = "#00b04f";

export const ROOM_PREFIX = "chronos-greenhouse-v1-";

export const SEED_TYPES = ["mati", "donti", "stagona", "ftero", "kyklos"];

export const SEEDS = {
  mati:    { id: "mati",    label: "Μάτι",    bagFrame: "bag_mati",    plantFrames: ["mati_0","mati_1","mati_2","mati_3"] },
  donti:   { id: "donti",   label: "Δόντι",   bagFrame: "bag_donti",   plantFrames: ["donti_0","donti_1","donti_2","donti_3"] },
  stagona: { id: "stagona", label: "Σταγόνα", bagFrame: "bag_stagona", plantFrames: ["stagona_0","stagona_1","stagona_2","stagona_3"] },
  ftero:   { id: "ftero",   label: "Φτερό",   bagFrame: "bag_ftero",   plantFrames: ["ftero_0","ftero_1","ftero_2","ftero_3"] },
  kyklos:  { id: "kyklos",  label: "Κύκλος",  bagFrame: "bag_kyklos",  plantFrames: ["kyklos_0","kyklos_1","kyklos_2","kyklos_3"] },
};

export const POTS = [
  { id: 0, placement: "window", labelGr: "παράθυρο",      x: 545, y: 720 },
  { id: 1, placement: "dry",    labelGr: "ξερή γωνία",    x: 140, y: 1010 },
  { id: 2, placement: "water",  labelGr: "δίπλα στο νερό", x: 605, y: 1010 },
  { id: 3, placement: "shade",  labelGr: "σκιά",          x: 180, y: 720 },
  { id: 4, placement: "center", labelGr: "κέντρο",        x: 365, y: 870 },
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

const SHEET_W = 941;
const SHEET_H = 1672;
const PLANT_ROW_H = 209;
const PLANT_COL_W = 235;
const BAG_COL_W = 157;
const CAN_COL_W = 235;
const TOOL_COL_W = 188;
const ROW_BAGS_Y = 1045;
const ROW_CANS_Y = 1254;
const ROW_TOOLS_Y = 1463;

export const FRAMES = {};
SEED_TYPES.forEach((type, row) => {
  for (let stage = 0; stage < 4; stage++) {
    FRAMES[`${type}_${stage}`] = { x: stage * PLANT_COL_W, y: row * PLANT_ROW_H, w: PLANT_COL_W, h: PLANT_ROW_H };
  }
});
FRAMES.pot_empty   = { x: 0,                y: ROW_BAGS_Y, w: BAG_COL_W, h: PLANT_ROW_H };
FRAMES.bag_mati    = { x: 1 * BAG_COL_W,    y: ROW_BAGS_Y, w: BAG_COL_W, h: PLANT_ROW_H };
FRAMES.bag_donti   = { x: 2 * BAG_COL_W,    y: ROW_BAGS_Y, w: BAG_COL_W, h: PLANT_ROW_H };
FRAMES.bag_stagona = { x: 3 * BAG_COL_W,    y: ROW_BAGS_Y, w: BAG_COL_W, h: PLANT_ROW_H };
FRAMES.bag_ftero   = { x: 4 * BAG_COL_W,    y: ROW_BAGS_Y, w: BAG_COL_W, h: PLANT_ROW_H };
FRAMES.bag_kyklos  = { x: 5 * BAG_COL_W,    y: ROW_BAGS_Y, w: BAG_COL_W, h: PLANT_ROW_H };
FRAMES.can_0       = { x: 0,                y: ROW_CANS_Y, w: CAN_COL_W, h: PLANT_ROW_H };
FRAMES.can_1       = { x: 1 * CAN_COL_W,    y: ROW_CANS_Y, w: CAN_COL_W, h: PLANT_ROW_H };
FRAMES.can_2       = { x: 2 * CAN_COL_W,    y: ROW_CANS_Y, w: CAN_COL_W, h: PLANT_ROW_H };
FRAMES.can_3       = { x: 3 * CAN_COL_W,    y: ROW_CANS_Y, w: CAN_COL_W, h: PLANT_ROW_H };
FRAMES.tool_dirt   = { x: 0,                y: ROW_TOOLS_Y, w: TOOL_COL_W, h: PLANT_ROW_H };
FRAMES.tool_shovel = { x: 1 * TOOL_COL_W,   y: ROW_TOOLS_Y, w: TOOL_COL_W, h: PLANT_ROW_H };
FRAMES.tool_seeds  = { x: 2 * TOOL_COL_W,   y: ROW_TOOLS_Y, w: TOOL_COL_W, h: PLANT_ROW_H };
FRAMES.tool_sprout = { x: 3 * TOOL_COL_W,   y: ROW_TOOLS_Y, w: TOOL_COL_W, h: PLANT_ROW_H };
FRAMES.tool_root   = { x: 4 * TOOL_COL_W,   y: ROW_TOOLS_Y, w: TOOL_COL_W, h: PLANT_ROW_H };
