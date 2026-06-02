// The four classic heroes. Stats follow the tabletop: attack/defend are the
// number of combat dice rolled, body is hit points, mind is willpower (used by
// future spell mechanics), and every hero rolls 2d6 for movement.
export const HERO_CLASSES = {
  barbarian: {
    id: 'barbarian',
    name: 'Barbarian',
    color: 0xd14b3a,
    attack: 3,
    defend: 2,
    body: 8,
    mind: 2,
    blurb: 'Body 8 · Atk 3 · Def 2',
  },
  dwarf: {
    id: 'dwarf',
    name: 'Dwarf',
    color: 0xc9962f,
    attack: 2,
    defend: 2,
    body: 7,
    mind: 3,
    blurb: 'Body 7 · Atk 2 · Def 2',
  },
  elf: {
    id: 'elf',
    name: 'Elf',
    color: 0x4caf6f,
    attack: 2,
    defend: 2,
    body: 6,
    mind: 4,
    blurb: 'Body 6 · Atk 2 · Def 2',
  },
  wizard: {
    id: 'wizard',
    name: 'Wizard',
    color: 0x6a7bd6,
    attack: 1,
    defend: 2,
    body: 4,
    mind: 6,
    blurb: 'Body 4 · Atk 1 · Def 2',
  },
};

export const HERO_ORDER = ['barbarian', 'dwarf', 'elf', 'wizard'];
