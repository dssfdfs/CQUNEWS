import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function useEffects() {
  const { settings } = useStore();

  useEffect(() => {
    if (settings.animationEnabled) {
      document.documentElement.setAttribute('data-animation', 'enabled');
    } else {
      document.documentElement.setAttribute('data-animation', 'disabled');
    }
  }, [settings.animationEnabled]);

  useEffect(() => {
    if (settings.glassEffectEnabled) {
      document.documentElement.classList.add('glass-mode');
    } else {
      document.documentElement.classList.remove('glass-mode');
    }
  }, [settings.glassEffectEnabled]);

  return {
    animationEnabled: settings.animationEnabled,
    glassEffectEnabled: settings.glassEffectEnabled,
  };
}