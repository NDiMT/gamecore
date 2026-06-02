// HeroQuest combat resolution. The combat die has six faces:
//   3 × skull, 2 × white shield, 1 × black shield.
const FACES = ['skull', 'skull', 'skull', 'white', 'white', 'black'];

export function rollCombatDie(rng) {
  return FACES[Math.floor(rng() * 6)];
}

export function rollMovement(rng) {
  // 2d6, like the tabletop movement roll.
  return rng.int(1, 6) + rng.int(1, 6);
}

// Resolve one attack. `attackerIsHero` decides which shield colour blocks.
// Returns the dice rolled plus the net damage dealt.
export function resolveAttack(rng, attackDice, defendDice, attackerIsHero) {
  const atk = [];
  for (let i = 0; i < attackDice; i++) atk.push(rollCombatDie(rng));
  const def = [];
  for (let i = 0; i < defendDice; i++) def.push(rollCombatDie(rng));

  const skulls = atk.filter((f) => f === 'skull').length;
  // Heroes are attacked-back by monsters: the defender blocks with their own
  // shield colour. A defending hero blocks white shields; a monster blocks
  // black shields. `attackerIsHero` tells us who is defending.
  const blockFace = attackerIsHero ? 'black' : 'white';
  const shields = def.filter((f) => f === blockFace).length;

  return { atk, def, skulls, shields, damage: Math.max(0, skulls - shields) };
}
