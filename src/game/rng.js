// Small seedable PRNG (mulberry32). Only the host rolls dice / generates the
// map, so a deterministic generator keeps host behaviour reproducible for
// debugging without needing to sync RNG state to clients.
export function makeRng(seed = (Math.random() * 2 ** 32) >>> 0) {
  let a = seed >>> 0;
  const rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (min, max) => min + Math.floor(rng() * (max - min + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.seed = seed;
  return rng;
}
