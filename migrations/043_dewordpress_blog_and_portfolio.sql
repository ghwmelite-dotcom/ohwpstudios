-- Migration 043: Remove WordPress from blog posts and portfolio tags
-- Description: The blog_posts table (rendered at /blog and /blog/[slug]) and the portfolio
--              tag filter still carried WordPress content. This converts the dedicated
--              WordPress post into a Fullstack Development post, surgically rewrites the
--              WordPress/WooCommerce mentions in the CMS, e-commerce, and Shopify posts,
--              and removes the WordPress portfolio tag. REPLACE() is a no-op when a phrase
--              is absent, so these statements are safe across schema variations.
-- Date: 2026-06-07

-- 1) Convert the dedicated "WordPress Development" blog post into "Fullstack Development"
UPDATE blog_posts SET
  title = 'Fullstack Development',
  slug = 'technologies-fullstack-development',
  excerpt = 'Expert fullstack development delivering frontend, backend, APIs, databases, and cloud infrastructure as one integrated, end-to-end engagement.',
  featured_image = '/images/blog/technologies-fullstack-development.svg',
  seo_title = 'Fullstack Development Services | Expert Fullstack Developers | OHWP Studios',
  seo_description = 'Professional fullstack development services. Frontend, backend, APIs, databases, and cloud infrastructure built by one accountable team using React, Next.js, Node.js, and TypeScript.',
  tags = 'Fullstack, Web Development, React, Node.js, TypeScript',
  content = '<p class="lead"><strong>Expert fullstack development delivering frontend, backend, APIs, databases, and cloud infrastructure as one integrated, end-to-end engagement.</strong></p>

<h2>Fullstack Development Services</h2>
<p>Ship complete, production-grade products with <strong>fullstack development services</strong>. We design and build every layer of your application — responsive frontends, robust APIs, scalable databases, and cloud infrastructure — so you get one team accountable for the entire stack.</p>
<p>From the first line of UI to the last query at the database, we deliver secure, fast, and maintainable software engineered around your business goals.</p>

<h2>Why Choose Fullstack</h2>
<p>Fullstack development advantages for modern products:</p>
<ul>
<li><strong>One Accountable Team:</strong> Frontend, backend, and infrastructure under a single roof</li>
<li><strong>Faster Delivery:</strong> No hand-offs or integration gaps between teams</li>
<li><strong>End-to-End Type Safety:</strong> Shared TypeScript contracts from UI to API</li>
<li><strong>Scalable by Design:</strong> Architecture that grows from MVP to enterprise</li>
<li><strong>Performance First:</strong> Edge rendering, caching, and optimized queries</li>
</ul>

<h2>Our Modern Stack</h2>
<p>We build with the technologies powering today''s best products: React, Next.js, Astro, and Vue on the frontend; Node.js, TypeScript, Python, and Hono on the backend; PostgreSQL, D1, and Redis for data; and Cloudflare, AWS, and Vercel for deployment — chosen to fit your project, not the other way around.</p>'
  WHERE slug = 'technologies-wordpress-development';

-- 2) CMS development blog post — swap WordPress for modern/headless equivalents
UPDATE blog_posts SET content = REPLACE(content,
  'platforms like WordPress, Strapi, and Contentful',
  'platforms like Strapi, Contentful, and Sanity');
UPDATE blog_posts SET content = REPLACE(content,
  '<li><strong>WordPress Development:</strong> The world''s most popular CMS</li>',
  '<li><strong>Payload &amp; Strapi:</strong> TypeScript-native, developer-friendly CMS</li>');
UPDATE blog_posts SET content = REPLACE(content,
  'Should I use WordPress or a headless CMS?',
  'Should I use a traditional or headless CMS?');
UPDATE blog_posts SET content = REPLACE(content,
  'WordPress is excellent for traditional websites and blogs. Headless CMS is better',
  'A traditional CMS is excellent for straightforward websites and blogs. A headless CMS is better');
UPDATE blog_posts SET excerpt = REPLACE(excerpt,
  'implement WordPress, Strapi, Contentful', 'implement Strapi, Contentful, Sanity');
UPDATE blog_posts SET seo_description = REPLACE(seo_description,
  'implement WordPress, Strapi, Contentful', 'implement Strapi, Contentful, Sanity');

-- 3) E-commerce development blog post — swap WooCommerce/WordPress for headless commerce
UPDATE blog_posts SET content = REPLACE(content,
  '<li><strong>WooCommerce Development:</strong> WordPress-based online stores</li>',
  '<li><strong>Medusa.js Development:</strong> Open-source headless commerce stores</li>');
UPDATE blog_posts SET content = REPLACE(content,
  'Shopify, WooCommerce, and BigCommerce', 'Shopify, BigCommerce, and Medusa.js');
UPDATE blog_posts SET content = REPLACE(content,
  'Shopify is great for quick launch and ease of use. WooCommerce offers more customization.',
  'Shopify is great for quick launch and ease of use. Headless commerce offers more customization and performance.');
UPDATE blog_posts SET excerpt = REPLACE(excerpt,
  'Shopify, WooCommerce, or custom platforms', 'Shopify, BigCommerce, or custom headless platforms');
UPDATE blog_posts SET seo_description = REPLACE(seo_description,
  'Shopify, WooCommerce, or custom platforms', 'Shopify, BigCommerce, or custom headless platforms');

-- 4) Shopify development blog post — migration-from list referenced WooCommerce
UPDATE blog_posts SET content = REPLACE(content,
  'migrations from WooCommerce, Magento, or other platforms',
  'migrations from Magento, BigCommerce, or other platforms');

-- 5) Remove the WordPress portfolio tag and any project associations to it
DELETE FROM portfolio_project_tags WHERE tag_id IN (SELECT id FROM portfolio_tags WHERE slug = 'wordpress');
DELETE FROM portfolio_tags WHERE slug = 'wordpress';
