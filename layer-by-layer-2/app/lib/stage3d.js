// The one shared 3D stage. Created the first time a page needs it (so reading pages stay light: the
// engine and three.js load only then), then moved between pages. If WebGL 2 is missing, pages show
// the poster picture instead.
import { registryMeta, json } from './data.js';

let stagePromise = null;

// Can this device draw WebGL 2? Asked once, with a throwaway context that is handed straight back.
function webgl2Available() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return false;
    const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext();
    return true;
  } catch (e) { return false; }
}
export const has3D = webgl2Available();

export function getStage() {
  if (!has3D) return Promise.resolve(null);
  if (!stagePromise) {
    stagePromise = import('../engine/stage.js').then(async m => {
      // blocks.json is shared with the pages' block lists, so it downloads once (if that copy
      // failed, e.g. offline, ask again rather than reuse the failure)
      const reg = await m.loadRegistry('data/', registryMeta().catch(() => json('data/blocks.json')));
      // (the stage checks Calm and reduce-motion live, so switching Calm on stops motion at once)
      return new m.Stage(reg);
    }).catch(e => { console.warn('3D stage failed', e); stagePromise = null; return null; });
  }
  return stagePromise;
}

// Pages call release() when they unmount, so the canvas detaches and listeners clear.
export async function release() {
  if (!stagePromise) return;
  const s = await stagePromise; if (s) s.unmount();
}

// A sky to sit behind the transparent canvas, from the time of day (0..1, 0.5 = noon)
// (the bands match the light in stage.setTime: the sun's light is gone below t 0.23 and above 0.77)
export function skyFor(t) {
  const night = t < 0.23 || t > 0.77, dusk = (t >= 0.23 && t < 0.3) || (t > 0.7 && t <= 0.77);
  if (night) return 'linear-gradient(180deg,#0a0f2b 0%,#1a2050 60%,#2b2d5c 100%)';
  if (dusk) return 'linear-gradient(180deg,#3b4c9a 0%,#f08a5d 62%,#ffd29a 100%)';
  return 'linear-gradient(180deg,#3f9cff 0%,#8fd0ff 55%,#e4f4ff 100%)';
}
