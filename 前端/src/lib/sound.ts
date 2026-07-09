import { useStore } from '@/store/useStore';

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const playNotificationSound = (type: 'success' | 'error' | 'info' = 'success') => {
  const { settings } = useStore.getState();
  if (!settings.soundNotification) return;

  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const frequencies: Record<string, number[]> = {
      success: [523.25, 659.25, 783.99],
      error: [440, 349.23, 293.66],
      info: [523.25, 587.33, 659.25],
    };

    const freqs = frequencies[type];
    let time = ctx.currentTime;

    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.start(time);
      osc.stop(time + 0.15);

      time += 0.1;
    });
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

export const playDingSound = () => {
  const { settings } = useStore.getState();
  if (!settings.soundNotification) return;

  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (error) {
    console.error('Failed to play ding sound:', error);
  }
};
