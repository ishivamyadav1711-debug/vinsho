import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://vinsho.in',
  output: 'server',
  adapter: vercel(),
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/crm') &&
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
  redirects: {
    '/about-us': '/about',
    '/product-category/special-collection': '/collections',
    '/product-category/home-decor': '/collections/home-decor',
    '/product-category/home-furnishing': '/collections/home-furnishings',
    '/product-category/gifting': '/collections/gifting',
    '/collections/gifting-collection': '/collections/gifting',
    '/product/show-piece': '/product/show-pieces',
    '/product/show-peice': '/product/show-pieces',
    '/admin': '/crm',
    '/admin/login': '/crm/login',
    '/admin/dashboard': '/crm/dashboard',
    '/admin/crm': '/crm/dashboard',
    '/admin/products': '/crm/products',
    '/admin/customers': '/crm/customers',
    '/admin/leads': '/crm/leads',
    '/admin/orders': '/crm/orders',
    '/admin/returns': '/crm/returns',
    '/admin/analytics': '/crm/analytics',
    '/admin/settings': '/crm/settings',
    '/admin/audit-logs': '/crm/audit-logs'
  }
});
