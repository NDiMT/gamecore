// Monster archetypes. `move` is how many squares the creature may travel on a
// GM turn. Heroes block hits with white shields; monsters block with black
// shields, so monster `defend` dice are comparatively weak.
export const MONSTERS = {
  goblin: { id: 'goblin', name: 'Goblin', color: 0x5b7d3a, attack: 2, defend: 1, body: 1, move: 6 },
  orc: { id: 'orc', name: 'Orc', color: 0x7a5a30, attack: 3, defend: 2, body: 1, move: 5 },
  skeleton: { id: 'skeleton', name: 'Skeleton', color: 0xcdc9bd, attack: 2, defend: 2, body: 1, move: 4 },
  gargoyle: { id: 'gargoyle', name: 'Gargoyle', color: 0x4a4458, attack: 4, defend: 4, body: 3, move: 4, boss: true },
};

// Weighted pool used when populating ordinary rooms.
export const FODDER = ['goblin', 'goblin', 'orc', 'skeleton'];
