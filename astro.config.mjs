import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://vinsho.com',
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/api') &&
        !page.includes('/account') &&
        !page.includes('/checkout') &&
        !page.includes('/cart') &&
        !page.includes('/login') &&
        !page.includes('/signup') &&
        !page.includes('/forgot-password') &&
        !page.includes('/reset-password')
    })
  ],
  devToolbar: {
    enabled: false
  },
  server: {
    host: '0.0.0.0',
    port: 4321
  },
  image: {
    domains: ['images.unsplash.com']
  },
  vite: {
    optimizeDeps: {
      exclude: ['better-sqlite3']
    },
    ssr: {
      external: ['better-sqlite3']
    }
  },
  redirects: {
    '/about-us': '/about',
    '/product-category/special-collection': '/collections',
    '/product-category/home-decor': '/collections/home-decor',
    '/product-category/home-furnishing': '/collections/home-furnishings',
    '/product-category/gifting': '/collections/gifting',
    '/collections/gifting-collection': '/collections/gifting',
    '/product/show-piece': '/product/show-pieces',
    '/product/show-peice': '/product/show-pieces'
  }
});
