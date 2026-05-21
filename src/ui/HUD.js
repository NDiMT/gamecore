import { DIAL_RIDDLE, DIAL_FUTURE_LABELS, DIAL_SOLUTION, PLATE_FUTURE_STATUS, LEVER_HINT_PAST, LEVER_HINT_FUTURE, WIN_MESSAGE } from "../constants.js";

export class HUD {
  constructor(state) {
    this.state = state;
    this.dom = document.getElementById("hud");
    this.eraBadge = document.getElementById("era-badge");
    this.frags = document.getElementById("frag-row");
    this.peer = document.getElementById("peer-status");
    this.toast = document.getElementById("toast");
    this.inspectBtn = document.getElementById("inspect-btn");
    this.inspectModal = document.getElementById("inspect-modal");
    this.inspectBody = document.getElementById("inspect-body");
    this.inspectClose = document.getElementById("inspect-close");
    this.winOverlay = document.getElementById("win-overlay");
    this.eraToggle = document.getElementById("era-toggle");
    this.chatToggle = document.getElementById("chat-toggle");
    this.chatPanel = document.getElementById("chat-panel");
    this.chatMessages = document.getElementById("chat-messages");
    this.chatInput = document.getElementById("chat-input");
    this.chatSend = document.getElementById("chat-send");

    this.inspectBtn.addEventListener("click", () => this.openInspect());
    this.inspectClose.addEventListener("click", () => this.closeInspect());
    this.eraToggle.addEventListener("click", () => {
      if (this.state.role) return;
      this.state.setEra(this.state.era === "past" ? "future" : "past");
    });
    this.chatToggle.addEventListener("click", () => this.toggleChat());
    this.chatSend.addEventListener("click", () => this.sendChat());
    this.chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") this.sendChat(); });

    state.on(() => this.refresh());
    this.refresh();
  }

  refresh() {
    if (this.state.era === "past") {
      this.eraBadge.textContent = "⌛ 1872 · παρελθόν";
      this.eraBadge.style.background = "#c9a25c";
      this.eraBadge.style.color = "#1a0e08";
    } else {
      this.eraBadge.textContent = "✦ 2287 · μέλλον";
      this.eraBadge.style.background = "#4a7dc9";
      this.eraBadge.style.color = "#fff";
    }
    this.frags.innerHTML = "";
    const order = [
      { key: "dial",  emoji: "◎", color: "#c94f4f" },
      { key: "plate", emoji: "▣", color: "#4fc97a" },
      { key: "lever", emoji: "⇅", color: "#4f7fc9" },
    ];
    order.forEach(({ key, emoji, color }) => {
      const f = document.createElement("div");
      f.className = "frag";
      if (this.state.fragments[key]) {
        f.style.background = color;
        f.style.color = "#fff";
        f.style.borderColor = "#fff";
      }
      f.textContent = emoji;
      this.frags.appendChild(f);
    });
    if (this.state.escaped) this.showWin();
  }

  setPeer(online) {
    this.peer.textContent = online ? "● live" : "○ off";
    this.peer.style.color = online ? "#8df0a8" : "#ff9b95";
  }

  openInspect() {
    const era = this.state.era;
    let html = "";
    if (era === "past") {
      html += "<h3>σημείωμα στο τραπέζι</h3>";
      html += "<div class='paper'>";
      DIAL_RIDDLE.forEach((r, i) => {
        html += `<p><strong>${i + 1}.</strong> ${r.replace(/\n/g, "<br>")}</p>`;
      });
      html += "</div>";
      html += "<h3>χάραξη στον τοίχο</h3>";
      html += `<div class='paper' style='font-family: monospace;'>${LEVER_HINT_PAST.replace(/\n/g, "<br>")}</div>`;
    } else {
      html += "<h3>επιγραφή πάνω από τους μηχανισμούς</h3>";
      html += "<div class='paper diary'>";
      html += "<p>τα τρία γραμμένα σύμβολα:</p>";
      html += `<p style='font-size:32px; text-align:center; letter-spacing:24px;'>${DIAL_FUTURE_LABELS.join("")}</p>`;
      html += "</div>";
      html += "<h3>πινακίδα στο πάτωμα</h3>";
      html += "<div class='paper diary'>";
      html += "<p>κατάσταση πλακών (αριστερά → δεξιά):</p>";
      html += "<ul>";
      PLATE_FUTURE_STATUS.forEach((s, i) => {
        html += `<li>Πλάκα ${i + 1}: <em>${s}</em></li>`;
      });
      html += "</ul>";
      html += "</div>";
      html += "<h3>σκουριασμένος καθρέφτης</h3>";
      html += `<div class='paper diary'>${LEVER_HINT_FUTURE.replace(/\n/g, "<br>")}</div>`;
    }
    this.inspectBody.innerHTML = html;
    this.inspectModal.style.display = "flex";
  }

  closeInspect() { this.inspectModal.style.display = "none"; }

  showWin() {
    this.winOverlay.style.display = "flex";
    document.getElementById("win-text").textContent = WIN_MESSAGE;
  }

  showToast(msg) {
    this.toast.textContent = msg;
    this.toast.style.opacity = "1";
    clearTimeout(this._tt);
    this._tt = setTimeout(() => this.toast.style.opacity = "0", 2200);
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
}
