import preact from '@preact/preset-vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  vite: () => ({
    plugins: [preact()],
  }),
  manifest: {
    name: 'Style Studio',
    short_name: 'Style Studio',
    description:
      'Visually restyle any website, understand its design system, and export clean CSS or AI agent handoffs.',
    version: '0.1.0',
    minimum_chrome_version: '116',
    // `scripting` injects the page core on demand. Host permissions are
    // required because activeTab grants are unreliable when the action click
    // only opens the side panel — analysis/edits are still user-initiated.
    permissions: ['sidePanel', 'storage', 'activeTab', 'scripting'],
    host_permissions: ['http://*/*', 'https://*/*'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: 'Open Style Studio',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
      },
    },
  },
});
