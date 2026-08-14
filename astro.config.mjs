// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  image: {
    domains: ['vinsho.in', 'images.unsplash.com']
  },
  redirects: {
    '/about-us': '/about',
    '/product-category/special-collection': '/collections',
    '/product-category/home-decor': '/collections/home-decor',
    '/product-category/home-furnishing': '/collections/home-furnishings',
    '/product-category/gifting': '/collections/gifting',
    '/collections/gifting-collection': '/collections/gifting',
    '/product/wall-art-2': '/product/wall-art',
    '/product/show-piece': '/product/show-pieces',
    '/product/show-peice': '/product/show-pieces'
  }
});
