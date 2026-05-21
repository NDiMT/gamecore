import Peer from "peerjs";
import { ROOM_PREFIX } from "../constants.js";

const ICE = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
  { urls: "turn:openrelay.metered.ca:80",                       username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443",                      username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp",        username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:standard.relay.metered.ca:80",                  username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:standard.relay.metered.ca:443",                 username: "openrelayproject", credential: "openrelayproject" },
];

function randCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = ""; for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

class NetworkSingleton {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.myCode = "";
    this.listeners = new Set();
    this.connected = false;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(ev) {
    for (const fn of this.listeners) fn(ev);
  }

  host(onCode) {
    this.myCode = randCode();
    this.isHost = true;
    this.peer = new Peer(ROOM_PREFIX + this.myCode, { config: { iceServers: ICE }, debug: 1 });
    this.peer.on("open", () => onCode && onCode(this.myCode));
    this.peer.on("connection", (c) => { this.conn = c; this.wire(); });
    this.peer.on("error", (e) => this.emit({ type: "error", error: e }));
  }

  join(code, onStatus) {
    this.isHost = false;
    onStatus && onStatus("Σύνδεση…");
    this.peer = new Peer(ROOM_PREFIX + "j-" + randCode(), { config: { iceServers: ICE }, debug: 1 });
    this.peer.on("open", () => {
      onStatus && onStatus("Αναζήτηση…");
      this.conn = this.peer.connect(ROOM_PREFIX + code, { reliable: true });
      this.wire();
      setTimeout(() => {
        if (!this.connected) {
          onStatus && onStatus("Δεν συνδέθηκε. Δοκίμασε ίδιο WiFi ή Chrome/Safari (όχι in-app).");
        }
      }, 20000);
    });
    this.peer.on("error", (e) => {
      const msg = e.type === "peer-unavailable" ? "δωμάτιο δεν υπάρχει" : (e.type || "σφάλμα");
      onStatus && onStatus("Σφάλμα: " + msg);
      this.emit({ type: "error", error: e });
    });
  }

  wire() {
    this.conn.on("open", () => {
      this.connected = true;
      this.emit({ type: "open" });
    });
    this.conn.on("data", (msg) => this.emit({ type: "data", msg }));
    this.conn.on("close", () => { this.connected = false; this.emit({ type: "close" }); });
    this.conn.on("error", (e) => this.emit({ type: "error", error: e }));
  }

  send(type, payload) {
    if (!this.conn || !this.conn.open) return;
    try { this.conn.send({ type, payload }); } catch (e) { console.warn(e); }
  }
}

export const network = new NetworkSingleton();
