import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ohwpstudios.org',
  output: 'hybrid',
  trailingSlash: 'never', // Enforce no trailing slashes to prevent duplicates
  adapter: cloudflare({
    imageService: 'cloudflare',
    platformProxy: {
      enabled: true
    }
  }),
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        // Exclude admin, client, and API routes from sitemap
        const isPrivate = page.includes('/admin/') ||
          page.includes('/client/') ||
          page.includes('/api/') ||
          page.includes('/login') ||
          page.includes('/register') ||
          page.includes('/reset-password') ||
          page.includes('/affiliate/dashboard') ||
          page.includes('/affiliate/login');

        // Exclude utility pages that shouldn't be indexed
        const isUtility = page.includes('/newsletter/unsubscribe') ||
          page.includes('/newsletter/verify') ||
          page.includes('/offline') ||
          page.includes('/quiz/thank-you') ||
          page.includes('/sitemap-pages');

        // Only include pages without trailing slashes to prevent duplicates
        const hasTrailingSlash = page.endsWith('/') && page !== 'https://ohwpstudios.org/';

        return !isPrivate && !isUtility && !hasTrailingSlash;
      },
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date()
    })
  ],
  vite: {
    build: {
      cssMinify: 'lightningcss'
    }
  }
});
