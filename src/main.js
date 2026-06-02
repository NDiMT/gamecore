import { App } from './App.js';

// Boot the application once the DOM is ready.
window.addEventListener('DOMContentLoaded', () => {
  window.__game = new App();
});
