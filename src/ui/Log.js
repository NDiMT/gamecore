// Scrolling event log. Renders combat rolls as little coloured dice.
export class Log {
  constructor(el) {
    this.el = el;
  }

  show() {
    this.el.style.display = 'block';
  }

  update(snap) {
    const entries = snap.log.slice(-18);
    this.el.innerHTML = entries
      .map((e) => {
        if (e.kind === 'dice') {
          return `<div class="e">${escape(e.text)} ${dice(e.atk)}<span style="opacity:.5"> vs </span>${dice(e.def)}</div>`;
        }
        return `<div class="e ${e.kind}">${escape(e.text)}</div>`;
      })
      .join('');
    this.el.scrollTop = this.el.scrollHeight;
  }
}

function dice(faces = []) {
  return faces
    .map((f) => {
      if (f === 'skull') return '<span class="dieface die-skull">☠</span>';
      if (f === 'white') return '<span class="dieface die-white">◇</span>';
      return '<span class="dieface die-black">◆</span>';
    })
    .join('');
}

function escape(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
