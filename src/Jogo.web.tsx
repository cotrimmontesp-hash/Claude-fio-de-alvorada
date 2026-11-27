import { createElement, useEffect } from 'react';
import { View } from 'react-native';

// No site (PWA) o jogo fica em /jogo/index.html e aparece em tela cheia.
export default function Jogo() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const add = (tag: string, attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
    };
    if (!document.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: '/manifest.json' });
    add('meta', { name: 'theme-color', content: '#0d0b0a' });
    add('link', { rel: 'apple-touch-icon', href: '/icon-192.png' });
    document.title = 'Fio de Alvorada';
    document.body.style.margin = '0';
    document.body.style.background = '#0d0b0a';
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#0d0b0a' }}>
      {createElement('iframe', {
        src: '/jogo/index.html',
        title: 'Fio de Alvorada',
        allow: 'fullscreen; gamepad; autoplay; screen-wake-lock',
        allowFullScreen: true,
        style: { border: 0, width: '100%', height: '100%', display: 'block' },
      })}
    </View>
  );
}
