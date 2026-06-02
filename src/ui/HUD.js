import { idx } from '../game/grid.js';

// In-game HUD: the turn bar with all hero actions, and the party panel of hero
// health chips. `map` is set once the dungeon is built so we can tell whether
// the active hero is standing in a searchable room.
export class HUD {
  constructor(hudEl, partyEl, cb) {
    this.hudEl = hudEl;
    this.partyEl = partyEl;
    this.cb = cb;
    this.map = null;
  }

  show() {
    this.hudEl.style.display = 'block';
    this.partyEl.style.display = 'flex';
  }

  // `ui` carries transient client state, e.g. { pendingSpell }.
  update(snap, myPeerId, ui = {}) {
    const t = snap.turn;
    const active = snap.heroes.find((h) => h.id === t.order[t.idx]);
    const myTurn = snap.phase === 'playing' && active && active.owner === myPeerId;

    let phaseLabel = 'Hero phase';
    if (snap.phase === 'won') phaseLabel = 'Victory';
    else if (snap.phase === 'lost') phaseLabel = 'Defeat';

    let hint = '';
    if (ui.pendingSpell) {
      hint = `Casting ${ui.pendingSpell.name} — click a ${ui.pendingSpell.kind === 'heal' ? 'hero' : 'monster'} (or End turn to cancel)`;
    } else if (myTurn) {
      hint = 'Click a glowing tile to move · click a monster to attack';
    } else if (active) {
      hint = `Waiting for ${active.name}…`;
    }

    this.hudEl.innerHTML = `
      <div id="turnbar">
        <div class="phase">${phaseLabel}</div>
        <div class="active">${active ? active.name : '—'}</div>
        <div class="move">${snap.phase === 'playing' ? `Movement left: <b>${t.movePoints}</b>${t.acted ? ' · acted' : ''}` : ''}</div>
        <div id="actions">${this._actionButtons(snap, active, myTurn, ui)}</div>
        <div class="move" style="margin-top:8px;color:var(--muted)">${hint}</div>
      </div>`;
    this._wireActions(active);

    this.partyEl.innerHTML = snap.heroes
      .map((h) => {
        const pct = Math.max(0, (h.body / h.maxBody) * 100);
        const isActive = h.id === t.order[t.idx];
        const extras = [];
        if (h.gold) extras.push(`💰${h.gold}`);
        if (h.potions) extras.push(`🧪${h.potions}`);
        return `<div class="herochip ${isActive ? 'active' : ''} ${h.alive ? '' : 'dead'}">
          <div class="hn">${h.name} ${h.owner === myPeerId ? '<span class="hyou">you</span>' : ''}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="stat">Body ${h.body}/${h.maxBody} · Atk ${h.attack} · Def ${h.defend}${extras.length ? ' · ' + extras.join(' ') : ''}</div>
        </div>`;
      })
      .join('');
  }

  _actionButtons(snap, active, myTurn, ui) {
    const btns = [`<button id="hud-end" ${myTurn ? '' : 'disabled'}>End turn</button>`];
    if (!myTurn || !active) return btns.join('');

    const acted = snap.turn.acted;

    // Search (once per room, costs the action).
    if (this.map) {
      const room = this.map.room[idx(this.map, active.x, active.y)];
      const searchable = room >= 0 && !snap.roomSearched.includes(room);
      btns.push(`<button id="hud-search" ${acted || !searchable ? 'disabled' : ''}>Search</button>`);
    }

    // Drink potion (free action).
    if (active.potions > 0) {
      btns.push(`<button id="hud-drink" ${active.body >= active.maxBody ? 'disabled' : ''}>Drink potion (${active.potions})</button>`);
    }

    // Spells (cost the action; clicking arms a target selection).
    for (const s of active.spells || []) {
      const disabled = acted || s.charges <= 0;
      const armed = ui.pendingSpell && ui.pendingSpell.id === s.id;
      btns.push(
        `<button class="spell ${armed ? 'primary' : ''}" data-spell="${s.id}" ${disabled ? 'disabled' : ''}>${s.name} (${s.charges})</button>`
      );
    }
    return btns.join('');
  }

  _wireActions(active) {
    const end = this.hudEl.querySelector('#hud-end');
    if (end) end.onclick = () => this.cb.onEndTurn(active?.id);
    const search = this.hudEl.querySelector('#hud-search');
    if (search) search.onclick = () => this.cb.onSearch(active?.id);
    const drink = this.hudEl.querySelector('#hud-drink');
    if (drink) drink.onclick = () => this.cb.onDrink(active?.id);
    this.hudEl.querySelectorAll('button.spell').forEach((b) => {
      b.onclick = () => this.cb.onSelectSpell(active?.id, b.dataset.spell);
    });
  }
}
