// In-game HUD: the turn bar with the End Turn action, and the party panel of
// hero health chips.
export class HUD {
  constructor(hudEl, partyEl, cb) {
    this.hudEl = hudEl;
    this.partyEl = partyEl;
    this.cb = cb;
  }

  show() {
    this.hudEl.style.display = 'block';
    this.partyEl.style.display = 'flex';
  }

  update(snap, myPeerId) {
    const t = snap.turn;
    const active = snap.heroes.find((h) => h.id === t.order[t.idx]);
    const myTurn = snap.phase === 'playing' && active && active.owner === myPeerId;

    let phaseLabel = 'Hero phase';
    if (snap.phase === 'won') phaseLabel = 'Victory';
    else if (snap.phase === 'lost') phaseLabel = 'Defeat';

    const hint = myTurn
      ? 'Click a glowing tile to move · click a monster to attack'
      : active
        ? `Waiting for ${active.name}…`
        : '';

    this.hudEl.innerHTML = `
      <div id="turnbar">
        <div class="phase">${phaseLabel}</div>
        <div class="active">${active ? active.name : '—'}</div>
        <div class="move">${snap.phase === 'playing' ? `Movement left: <b>${t.movePoints}</b>${t.attacked ? ' · attacked' : ''}` : ''}</div>
        <div id="actions">
          <button id="hud-end" ${myTurn ? '' : 'disabled'}>End turn</button>
        </div>
        <div class="move" style="margin-top:8px;color:var(--muted)">${hint}</div>
      </div>`;
    const end = this.hudEl.querySelector('#hud-end');
    if (end) end.onclick = () => this.cb.onEndTurn(active?.id);

    this.partyEl.innerHTML = snap.heroes
      .map((h) => {
        const pct = Math.max(0, (h.body / h.maxBody) * 100);
        const isActive = h.id === t.order[t.idx];
        return `<div class="herochip ${isActive ? 'active' : ''} ${h.alive ? '' : 'dead'}">
          <div class="hn">${h.name} ${h.owner === myPeerId ? '<span class="hyou">you</span>' : ''}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="stat">Body ${h.body}/${h.maxBody} · Atk ${h.attack} · Def ${h.defend}</div>
        </div>`;
      })
      .join('');
  }
}
