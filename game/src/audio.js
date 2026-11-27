// Synthesised sound effects: every sound is made with the Web Audio API, so
// the game ships no audio files and makes no network request. All sounds are
// original bleeps and chirps, written for this game. Audio starts only after
// the player's first gesture (browsers require it) and can be muted with M.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  /** One oscillator note: frequency slides from `from` to `to` over `seconds`. */
  function tone(from, to, seconds, type, volume, when = 0) {
    const audio = ensure();
    if (!audio || muted) return;
    try {
      const start = audio.currentTime + when;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(20, from), start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + seconds);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + seconds + 0.02);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  /** A short burst of filtered noise, for thuds and rustles. */
  function noise(seconds, volume, frequency, when = 0) {
    const audio = ensure();
    if (!audio || muted) return;
    try {
      const start = audio.currentTime + when;
      const length = Math.max(1, Math.floor(audio.sampleRate * seconds));
      const buffer = audio.createBuffer(1, length, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const filter = audio.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = frequency;
      const gain = audio.createGain();
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);
      source.start(start);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  return {
    /** Call from any user gesture so later sounds are allowed to play. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    jump() {
      tone(280, 620, 0.16, 'sine', 0.16);
    },
    land() {
      noise(0.07, 0.08, 500);
    },
    corn() {
      tone(880, 880, 0.07, 'triangle', 0.14);
      tone(1318, 1318, 0.1, 'triangle', 0.12, 0.07);
    },
    feather() {
      tone(523, 523, 0.09, 'triangle', 0.14);
      tone(659, 659, 0.09, 'triangle', 0.14, 0.08);
      tone(784, 784, 0.14, 'triangle', 0.14, 0.16);
    },
    hit() {
      noise(0.22, 0.22, 320);
      tone(160, 55, 0.25, 'sawtooth', 0.16);
    },
    /** The turkey's own gobble: a quick run of low clucks. */
    gobble() {
      for (let index = 0; index < 5; index += 1) {
        tone(300 - index * 18, 180, 0.09, 'square', 0.07, index * 0.09);
      }
    },
    win() {
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((frequency, index) => tone(frequency, frequency, 0.22, 'triangle', 0.15, index * 0.11));
    },
    lose() {
      const notes = [392, 330, 262, 196];
      notes.forEach((frequency, index) => tone(frequency, frequency * 0.94, 0.24, 'sawtooth', 0.09, index * 0.16));
    },
  };
}
