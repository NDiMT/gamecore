import { Peer } from 'peerjs';
import { ROOM_PREFIX } from '../config.js';

// Thin wrapper over PeerJS. Signaling goes through the public PeerJS broker;
// once connected, all game traffic flows peer-to-peer over reliable data
// channels in a star around the host.
//
// Events (subscribe via on(name, cb)):
//   'open'        host: room code is ready / client: connected to host
//   'connect'     host only: a client's data channel opened  -> peerId
//   'data'        { from, msg }
//   'disconnect'  a peer's channel closed                    -> peerId
//   'error'       -> Error
export class Net {
  constructor() {
    this.peer = null;
    this.isHost = false;
    this.conns = new Map(); // host: peerId -> DataConnection
    this.hostConn = null; //  client: connection to host
    this.handlers = {};
  }

  on(name, cb) {
    (this.handlers[name] ||= []).push(cb);
    return this;
  }
  emit(name, payload) {
    (this.handlers[name] || []).forEach((cb) => cb(payload));
  }

  get id() {
    return this.peer?.id || null;
  }

  // ---- Host ----------------------------------------------------------------
  host() {
    this.isHost = true;
    const code = randomCode();
    this.peer = new Peer(ROOM_PREFIX + code);
    this.peer.on('open', () => this.emit('open', code));
    this.peer.on('error', (err) => this.emit('error', err));
    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        this.conns.set(conn.peer, conn);
        this.emit('connect', conn.peer);
      });
      conn.on('data', (msg) => this.emit('data', { from: conn.peer, msg }));
      conn.on('close', () => {
        this.conns.delete(conn.peer);
        this.emit('disconnect', conn.peer);
      });
    });
    return code;
  }

  // ---- Client --------------------------------------------------------------
  join(code) {
    this.isHost = false;
    this.peer = new Peer();
    this.peer.on('error', (err) => this.emit('error', err));
    this.peer.on('open', () => {
      const conn = this.peer.connect(ROOM_PREFIX + code.trim().toUpperCase(), { reliable: true });
      this.hostConn = conn;
      conn.on('open', () => this.emit('open', code));
      conn.on('data', (msg) => this.emit('data', { from: 'host', msg }));
      conn.on('close', () => this.emit('disconnect', 'host'));
    });
  }

  // ---- Sending -------------------------------------------------------------
  toHost(msg) {
    this.hostConn?.send(msg);
  }
  to(peerId, msg) {
    this.conns.get(peerId)?.send(msg);
  }
  broadcast(msg) {
    for (const conn of this.conns.values()) conn.send(msg);
  }
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no easily-confused chars
  let s = '';
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
