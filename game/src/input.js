// Input: keyboard and mouse (and touch, through pointer events). Space, Up
// or W jumps; Down or S ducks and holds; P pauses; M mutes; Enter or Space
// confirms on the title and end screens. Clicking or tapping the canvas jumps
// too, and confirms on the title and end screens. Actions are edge-triggered
// and read once per frame, so a held key never double-fires.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let jumpQueued = false;

  function isJump(code) {
    return code === 'Space' || code === 'ArrowUp' || code === 'KeyW';
  }

  function isDuck(code) {
    return code === 'ArrowDown' || code === 'KeyS';
  }

  function onKeyDown(event) {
    if (isJump(event.code) || isDuck(event.code) || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (isJump(event.code)) jumpQueued = true;
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerDown(event) {
    event.preventDefault();
    jumpQueued = true;
    actions |= ACTION_CONFIRM;
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    /** True while a duck key is held down. */
    duckHeld() {
      return keys.has('ArrowDown') || keys.has('KeyS');
    },
    /** Edge-triggered jump: true once per press, then consumed. */
    takeJump() {
      const queued = jumpQueued;
      jumpQueued = false;
      return queued;
    },
    /** Edge-triggered actions since the last read. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
