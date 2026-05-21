import { CHAMBER_LABEL, HINTS_SKY, HINTS_ROOT, WIN_MESSAGE, SIGIL_DEFS, ALTAR_SOLUTION } from "../constants.js";

export class HUD {
  constructor(state) {
    this.state = state;
    this.title = document.getElementById("chamber-title");
    this.subtitle = document.getElementById("chamber-sub");
    this.peer = document.getElementById("peer-status");
    this.toast = document.getElementById("toast");
    this.inspectBtn = document.getElementById("inspect-btn");
    this.inspectModal = document.getElementById("inspect-modal");
    this.inspectBody = document.getElementById("inspect-body");
    this.inspectClose = document.getElementById("inspect-close");
    this.chatToggle = document.getElementById("chat-toggle");
    this.chatPanel = document.getElementById("chat-panel");
    this.chatMessages = document.getElementById("chat-messages");
    this.chatInput = document.getElementById("chat-input");
    this.chatSend = document.getElementById("chat-send");
    this.chatClose = document.getElementById("chat-close");
    this.winOverlay = document.getElementById("win-overlay");
    this.winText = document.getElementById("win-text");
    this.progress = document.getElementById("progress");
    this.tapRipple = document.getElementById("tap-ripple");

    this.inspectBtn.addEventListener("click", () => { this.openInspect(); this.haptic(); });
    this.inspectClose.addEventListener("click", () => { this.closeInspect(); this.haptic(); });
    this.chatToggle.addEventListener("click", () => { this.toggleChat(); this.haptic(); });
    this.chatClose.addEventListener("click", () => this.toggleChat(false));
    this.chatSend.addEventListener("click", () => this.sendChat());
    this.chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") this.sendChat(); });

    document.addEventListener("pointerdown", (e) => this.spawnRipple(e.clientX, e.clientY));

    state.on((ev) => this.handleStateEvent(ev));
    this.refresh();
  }

  handleStateEvent(ev) {
    this.refresh();
    if (ev.type === "constellation-solved") this.showToast("Ο ουρανός θυμήθηκε. Κάτι ραγίζει αλλού.", "win");
    if (ev.type === "altar-solved") this.showToast("Οι ρίζες πέρασαν το όνομα. Ο κρύσταλλος ξυπνά.", "win");
    if (ev.type === "crystal-solved") this.showToast("Η πύλη ξυπνά.", "win");
    if (ev.type === "gate-locked") this.showToast("Η πύλη δεν είναι έτοιμη.", "fail");
    if (ev.type === "escaped") this.showWin();
    if (ev.type === "chat") this.appendChat(ev.text, ev.who === "me" ? "mine" : "them");
  }

  refresh() {
    if (this.state.chamber) {
      const lab = CHAMBER_LABEL[this.state.chamber];
      this.title.textContent = lab.short;
      this.subtitle.textContent = lab.title;
      document.body.classList.remove("chamber-sky", "chamber-root");
      document.body.classList.add(this.state.chamber === "sky" ? "chamber-sky" : "chamber-root");
    }
    const stages = [
      { name: "Αστερισμός", done: this.state.constellationSolved },
      { name: "Ριζωμένο",   done: this.state.altarSolved },
      { name: "Κρύσταλλος", done: this.state.crystalSolved },
    ];
    this.progress.innerHTML = "";
    stages.forEach((s, i) => {
      const dot = document.createElement("div");
      dot.className = "stage" + (s.done ? " done" : "") + ((!s.done && i === stages.findIndex(x => !x.done)) ? " current" : "");
      dot.title = s.name;
      this.progress.appendChild(dot);
    });
  }

  setPeer(online) {
    this.peer.textContent = online ? "● ζωντανός" : "○ off-line";
    this.peer.dataset.state = online ? "live" : "off";
  }

  openInspect() {
    const ch = this.state.chamber;
    const hints = ch === "sky" ? HINTS_SKY : HINTS_ROOT;
    let html = `<div class="paper-title">Φύλλα Σημείωσης</div>`;
    hints.forEach((h, i) => {
      html += `<div class="paper-line"><span class="paper-num">${i + 1}</span><span>${h}</span></div>`;
    });
    if (ch === "root" && this.state.vaultOpen) {
      html += `<div class="paper-title">Σύμβολα του χρηματοκιβωτίου</div>`;
      html += `<div class="paper-glyphs">`;
      ALTAR_SOLUTION.forEach((s) => {
        html += `<div class="glyph">${SIGIL_DEFS[s].glyph}<span>${SIGIL_DEFS[s].label}</span></div>`;
      });
      html += `</div>`;
    }
    this.inspectBody.innerHTML = html;
    this.inspectModal.classList.add("open");
  }

  closeInspect() { this.inspectModal.classList.remove("open"); }

  showToast(msg, kind = "info") {
    this.toast.textContent = msg;
    this.toast.dataset.kind = kind;
    this.toast.classList.add("show");
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toast.classList.remove("show"), 2600);
  }

  showWin() {
    this.winOverlay.classList.add("open");
    this.winText.textContent = WIN_MESSAGE;
  }

  toggleChat(force) {
    if (force === false) this.chatPanel.classList.remove("open");
    else this.chatPanel.classList.toggle("open");
    if (this.chatPanel.classList.contains("open")) {
      this.chatToggle.classList.remove("has-unread");
      setTimeout(() => this.chatInput.focus(), 100);
    }
  }

  sendChat() {
    const txt = this.chatInput.value.trim();
    if (!txt) return;
    this.state.sendChat(txt);
    this.chatInput.value = "";
  }

  appendChat(text, side) {
    const el = document.createElement("div");
    el.className = "msg " + side;
    el.textContent = text;
    this.chatMessages.appendChild(el);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    if (side === "them" && !this.chatPanel.classList.contains("open")) {
      this.chatToggle.classList.add("has-unread");
    }
  }

  spawnRipple(x, y) {
    const r = document.createElement("div");
    r.className = "ripple";
    r.style.left = x + "px";
    r.style.top = y + "px";
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 700);
  }

  haptic() { if (navigator.vibrate) navigator.vibrate(8); }
}
