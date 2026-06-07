-- Migration 042: Remove WordPress branding from seeded, frontend-visible content
-- Description: Earlier seed migrations (006, 007) populated the database with WordPress
--              copy that the live site loads dynamically: the testimonials carousel,
--              the dynamic site_content (logo, favicon, tagline, hero), and the services
--              list (dev). This migration rewrites that content to the fullstack
--              positioning. Every statement is guarded so it only touches the seeded
--              WordPress values and never overwrites a legitimate admin customization.
-- Date: 2026-06-07

-- 1) Testimonials (rendered on the homepage from the DB)
UPDATE testimonials
  SET content = 'The custom fullstack solution they built for us exceeded all expectations. Our conversion rate jumped 40%, and customer engagement has never been higher. Truly exceptional work!'
  WHERE name = 'Sarah M.' AND content LIKE '%WordPress%';

UPDATE testimonials
  SET content = 'Their e-commerce expertise transformed our online store completely. Sales increased by 85% in the first quarter, and the checkout experience is now seamless. Best investment we ever made!'
  WHERE name = 'Emily R.' AND content LIKE '%WooCommerce%';

UPDATE testimonials
  SET content = 'The team''s technical prowess and attention to security is outstanding. They built us a scalable fullstack platform that handles millions of visitors flawlessly. Truly world-class work!'
  WHERE name = 'David K.' AND content LIKE '%WordPress%';

-- 2) Dynamic site_content (loaded by the header and elsewhere)
-- Logo + favicon were pointed at the WordPress logo; reset to the branded favicon and
-- let the header fall back to the branded text/SVG logo (empty string triggers fallback).
UPDATE site_content SET content_value = ''
  WHERE content_key = 'site_logo' AND content_value = '/wp-logo.svg';

UPDATE site_content SET content_value = '/favicon.svg'
  WHERE content_key = 'site_favicon' AND content_value = '/wp-logo.svg';

UPDATE site_content SET content_value = 'Crafting Digital Excellence - Expert Fullstack Development & Solutions'
  WHERE content_key = 'site_tagline' AND content_value LIKE '%WordPress%';

UPDATE site_content SET content_value = 'Transform your digital presence with world-class fullstack development'
  WHERE content_key = 'hero_subtitle' AND content_value LIKE '%WordPress%';

UPDATE site_content SET content_value = 'Fullstack Focused'
  WHERE content_key = 'hero_stat3_label' AND content_value = 'WordPress Focused';

-- 3) Services list (used on the homepage in local dev; production uses static config)
UPDATE services SET title = 'Custom Web Development',
    description = 'Build stunning, responsive web applications tailored to your unique needs with cutting-edge features and seamless functionality.'
  WHERE title = 'Custom WordPress Development';

UPDATE services SET title = 'UI/UX Design & Theming',
    description = 'Transform your vision into reality with custom interface design that perfectly matches your brand identity.'
  WHERE title = 'WordPress Theme Customization';

UPDATE services SET title = 'E-Commerce Solutions',
    description = 'Create powerful online stores with custom features and optimized checkout experiences.'
  WHERE title = 'WooCommerce Solutions';

UPDATE services SET title = 'Performance Optimization',
    description = 'Supercharge your site with performance optimization, caching strategies, and speed enhancements.'
  WHERE title = 'WordPress Optimization';

UPDATE services SET title = 'Application Security',
    description = 'Protect your investment with comprehensive security audits, hardening, and ongoing monitoring.'
  WHERE title = 'WordPress Security';

UPDATE services SET title = 'Support & Maintenance',
    description = 'Keep your application running smoothly with regular updates, backups, and dedicated technical support.'
  WHERE title = 'WordPress Support & Maintenance';
