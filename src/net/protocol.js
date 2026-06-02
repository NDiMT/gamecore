// Wire message types exchanged over the WebRTC data channel.
export const MSG = {
  // client -> host
  HELLO: 'hello', // { name }
  PICK: 'pick', //   { cls, name }
  INTENT: 'intent', // { action: {...} }
  // host -> client
  LOBBY: 'lobby', //  { players: [{peerId,name,cls}], started }
  INIT: 'init', //    { map, order: [{heroId,owner,cls,name}] }
  STATE: 'state', //  { snapshot }
  REJECT: 'reject', //{ reason }
};

// Hero-turn intents (client -> host, wrapped in INTENT).
export const ACT = {
  MOVE: 'move', //   { heroId, x, y }
  ATTACK: 'attack', //{ heroId, targetId }
  END: 'end', //     { heroId }
};
