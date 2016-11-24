import { patchInner } from 'incremental-dom';

export default function renderer (elem) {
  if (!elem.shadowRoot) {
    elem.attachShadow({ mode: 'open' });
  }
  patchInner(elem.shadowRoot, () => {
    const possibleFn = elem.renderCallback();
    if (typeof possibleFn === 'function') {
      possibleFn();
    } else if (Array.isArray(possibleFn)) {
      possibleFn.forEach((fn) => {
        if (typeof fn === 'function') {
          fn();
        }
      });
    }
  });
}
