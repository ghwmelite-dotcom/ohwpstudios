-- Migration 044: Prune thin, auto-generated blog posts
-- Description: Deletes the 37 templated SEO-mirror blog posts whose pages were removed,
--              plus the affiliate-program announcement (affiliate program retired).
--              Keeps the 13 pillar posts (matching the kept SEO pages) and the 3
--              genuinely original posts (saas, mobile, getting-started).
-- Date: 2026-06-07

DELETE FROM blog_posts WHERE slug IN (
  -- Technologies (dropped)
  'technologies-angular-development',
  'technologies-django-development',
  'technologies-flutter-development',
  'technologies-kotlin-development',
  'technologies-laravel-development',
  'technologies-react-native-development',
  'technologies-shopify-development',
  'technologies-swift-development',
  'technologies-typescript-development',
  'technologies-vuejs-development',
  -- Services (dropped)
  'services-android-app-development',
  'services-cms-development',
  'services-cross-platform-app-development',
  'services-ecommerce-development',
  'services-enterprise-software-development',
  'services-ios-app-development',
  'services-mobile-app-development-services',
  'services-mvp-development',
  'services-progressive-web-app-development',
  'services-ui-ux-design-services',
  'services-web-design-services',
  'services-web-portal-development',
  -- Industries (dropped)
  'industries-elearning-platform-development',
  'industries-hospitality-software-development',
  'industries-legal-software-development',
  'industries-logistics-software-development',
  'industries-real-estate-software-development',
  'industries-restaurant-software-development',
  'industries-retail-software-development',
  -- Solutions (dropped)
  'solutions-business-process-automation',
  'solutions-cloud-migration-services',
  'solutions-custom-crm-development',
  'solutions-enterprise-digital-transformation',
  'solutions-marketplace-platform-development',
  'solutions-mobile-first-development',
  'solutions-real-time-application-development',
  'solutions-white-label-software-development',
  -- Affiliate program retired
  'introducing-ohwp-studios-affiliate-program'
);
