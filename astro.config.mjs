import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ohwpstudios.org',
  output: 'hybrid',
  adapter: cloudflare({
    imageService: 'cloudflare',
    platformProxy: {
      enabled: true
    }
  }),
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        // Exclude admin, client, and API routes from sitemap
        !page.includes('/admin/') &&
        !page.includes('/client/') &&
        !page.includes('/api/') &&
        !page.includes('/login') &&
        !page.includes('/register') &&
        !page.includes('/reset-password') &&
        !page.includes('/affiliate/dashboard') &&
        !page.includes('/affiliate/login'),
      customPages: [
        'https://ohwpstudios.org/',
        'https://ohwpstudios.org/about',
        'https://ohwpstudios.org/portfolio',
        'https://ohwpstudios.org/contact',
        'https://ohwpstudios.org/careers',
        'https://ohwpstudios.org/blog',
        'https://ohwpstudios.org/affiliate/signup',
        'https://ohwpstudios.org/estimate-project',
        'https://ohwpstudios.org/booking',
        'https://ohwpstudios.org/sitemap-pages'
      ],
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date()
    })
  ],
  vite: {
    build: {
      cssMinify: 'lightningcss'
    }
  }
});
