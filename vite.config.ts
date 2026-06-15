import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'מסע התווים — Note Quest',
        short_name: 'מסע התווים',
        description: 'משחק קריאת תווים בעברית — דו רה מי',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#1b1d3a',
        background_color: '#1b1d3a',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'node'
  }
});
