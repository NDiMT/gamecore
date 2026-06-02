import { HERO_CLASSES, HERO_ORDER } from '../data/heroes.js';

// DOM lobby: create or join a room, pick a hero, see who's connected.
// Communicates with App via the callbacks passed to the constructor.
export class Lobby {
  constructor(el, cb) {
    this.el = el;
    this.cb = cb;
    this.myCls = null;
    this._renderHome();
  }

  _card(inner) {
    this.el.innerHTML = `<div class="card">${inner}</div>`;
  }

  _renderHome() {
    this._card(`
      <h1>GameCore</h1>
      <p class="sub">A co-op HeroQuest dungeon crawl · up to 4 heroes over WebRTC</p>
      <div class="field">
        <label>Your name</label>
        <input id="lb-name" maxlength="14" placeholder="Adventurer" />
      </div>
      <div class="field">
        <button id="lb-host" class="primary" style="width:100%">Create a room</button>
      </div>
      <div class="field">
        <label>Join an existing room</label>
        <div class="row">
          <input id="lb-code" maxlength="4" placeholder="CODE" style="text-transform:uppercase" />
          <button id="lb-join" style="flex:0 0 110px">Join</button>
        </div>
      </div>
      <div class="status" id="lb-status"></div>
    `);
    const name = () => this.el.querySelector('#lb-name').value.trim() || 'Adventurer';
    this.el.querySelector('#lb-host').onclick = () => {
      this.setStatus('Creating room…');
      this.cb.onHost(name());
    };
    this.el.querySelector('#lb-join').onclick = () => {
      const code = this.el.querySelector('#lb-code').value.trim().toUpperCase();
      if (code.length < 4) return this.setStatus('Enter a 4-character code', true);
      this.setStatus('Connecting…');
      this.cb.onJoin(code, name());
    };
  }

  // Shown once we're in a room (host or client).
  showRoom({ isHost, code }) {
    this.isHost = isHost;
    const classCards = HERO_ORDER.map((id) => {
      const c = HERO_CLASSES[id];
      return `<div class="classcard" data-cls="${id}">
        <div class="cn">${c.name}</div><div class="cs">${c.blurb}</div></div>`;
    }).join('');
    this._card(`
      <h1>Room ${code}</h1>
      <p class="sub">${isHost ? 'Share this code with your party.' : 'Connected. Pick your hero.'}</p>
      ${isHost ? `<div class="field"><div class="roomcode" id="lb-room">${code}</div></div>` : ''}
      <div class="field">
        <label>Choose your hero</label>
        <div class="classgrid">${classCards}</div>
      </div>
      <div class="field">
        <label>Party</label>
        <ul class="playerlist" id="lb-players"></ul>
      </div>
      ${isHost ? `<button id="lb-start" class="primary" style="width:100%" disabled>Begin the quest</button>` : ''}
      <div class="status" id="lb-status">Waiting…</div>
    `);

    if (isHost) {
      const rc = this.el.querySelector('#lb-room');
      rc.onclick = () => navigator.clipboard?.writeText(code).then(() => this.setStatus('Code copied!'));
      this.el.querySelector('#lb-start').onclick = () => this.cb.onStart();
    }
    this.el.querySelectorAll('.classcard').forEach((card) => {
      card.onclick = () => {
        if (card.classList.contains('taken')) return;
        this.myCls = card.dataset.cls;
        this.cb.onPick(this.myCls);
      };
    });
  }

  setPlayers(players, myPeerId) {
    const list = this.el.querySelector('#lb-players');
    if (!list) return;
    list.innerHTML = players
      .map((p) => {
        const me = p.peerId === myPeerId;
        const cls = p.cls ? HERO_CLASSES[p.cls].name : '—';
        return `<li class="${me ? 'me' : ''}">${p.name} <span style="float:right">${cls}${me ? ' (you)' : ''}</span></li>`;
      })
      .join('');

    // Grey out classes already taken by someone else; mark mine selected.
    const taken = new Set(players.filter((p) => p.peerId !== myPeerId).map((p) => p.cls));
    this.el.querySelectorAll('.classcard').forEach((card) => {
      card.classList.toggle('taken', taken.has(card.dataset.cls));
      card.classList.toggle('sel', card.dataset.cls === this.myCls);
    });

    const start = this.el.querySelector('#lb-start');
    if (start) {
      const everyonePicked = players.length >= 1 && players.every((p) => p.cls);
      start.disabled = !everyonePicked;
    }
  }

  setStatus(text, isErr = false) {
    const s = this.el.querySelector('#lb-status');
    if (s) {
      s.textContent = text;
      s.classList.toggle('err', isErr);
    }
  }

  hide() {
    this.el.classList.add('hidden');
  }
  show() {
    this.el.classList.remove('hidden');
  }
}
