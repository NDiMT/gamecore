// Spellbooks for the caster classes. Each spell has a number of `charges` that
// last for the whole quest. `damage` spells hit a visible monster for a fixed
// amount with no defence roll; `heal` spells restore an ally's body.
// Factory functions return fresh copies so each hero owns its own charges.
export const SPELLBOOKS = {
  wizard: () => [
    { id: 'fireball', name: 'Ball of Flame', kind: 'damage', power: 3, charges: 2 },
    { id: 'frost', name: 'Frost Shard', kind: 'damage', power: 2, charges: 1 },
    { id: 'heal', name: 'Heal Body', kind: 'heal', power: 4, charges: 2 },
  ],
  elf: () => [
    { id: 'gust', name: 'Gust of Wind', kind: 'damage', power: 2, charges: 1 },
    { id: 'heal', name: 'Heal Body', kind: 'heal', power: 2, charges: 1 },
  ],
};

export function spellbookFor(cls) {
  return SPELLBOOKS[cls] ? SPELLBOOKS[cls]() : [];
}
