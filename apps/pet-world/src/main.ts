import './styles.css';
import { mountPetWorld } from './app.js';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root is missing');
let dispose = mountPetWorld(root);
const hide = () => { dispose(); };
const show = (event: PageTransitionEvent) => {
  if (event.persisted) dispose = mountPetWorld(root);
};
window.addEventListener('pagehide', hide);
window.addEventListener('pageshow', show);
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    dispose();
    window.removeEventListener('pagehide', hide);
    window.removeEventListener('pageshow', show);
  });
}
