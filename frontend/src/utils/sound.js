let audioCtx = null;

// Short beep on successful barcode/QR scan. Generated via Web Audio API
// so no audio asset needs to be shipped/loaded.
export function playScanBeep() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 1000;
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch {
    // Audio isn't critical to the scan flow; ignore if unsupported/blocked.
  }
}
