import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Category color schemes
const categoryColors = {
  services: {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#f093fb',
    name: 'Services'
  },
  industries: {
    primary: '#f093fb',
    secondary: '#f5576c',
    accent: '#fda085',
    name: 'Industries'
  },
  solutions: {
    primary: '#4facfe',
    secondary: '#00f2fe',
    accent: '#43e97b',
    name: 'Solutions'
  },
  technologies: {
    primary: '#fa709a',
    secondary: '#fee140',
    accent: '#30cfd0',
    name: 'Technologies'
  }
};

// Icon SVG paths for each category
const categoryIcons = {
  services: `<path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="white" opacity="0.3"/>`,
  industries: `<path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" fill="white" opacity="0.3"/>`,
  solutions: `<path d="M9 11.75A2.25 2.25 0 1 1 11.25 14 2.25 2.25 0 0 1 9 11.75zm9.5 0a2.25 2.25 0 1 1 2.25 2.25 2.25 2.25 0 0 1-2.25-2.25zM3 11.75A2.25 2.25 0 1 1 5.25 14 2.25 2.25 0 0 1 3 11.75z" fill="white" opacity="0.3"/>`,
  technologies: `<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="white" opacity="0.3"/>`
};

// Blog posts data (from database query)
const blogPosts = [
  { id: 4, title: "Android App Development", slug: "services-android-app-development", category: "services" },
  { id: 5, title: "Api Development Services", slug: "services-api-development-services", category: "services" },
  { id: 6, title: "Cms Development", slug: "services-cms-development", category: "services" },
  { id: 7, title: "Cross Platform App Development", slug: "services-cross-platform-app-development", category: "services" },
  { id: 8, title: "Custom Web Application Development", slug: "services-custom-web-application-development", category: "services" },
  { id: 9, title: "Ecommerce Development", slug: "services-ecommerce-development", category: "services" },
  { id: 10, title: "Enterprise Software Development", slug: "services-enterprise-software-development", category: "services" },
  { id: 11, title: "Ios App Development", slug: "services-ios-app-development", category: "services" },
  { id: 12, title: "Mobile App Development Services", slug: "services-mobile-app-development-services", category: "services" },
  { id: 13, title: "Mvp Development", slug: "services-mvp-development", category: "services" },
  { id: 14, title: "Progressive Web App Development", slug: "services-progressive-web-app-development", category: "services" },
  { id: 15, title: "Saas Application Development", slug: "services-saas-application-development", category: "services" },
  { id: 16, title: "Ui Ux Design Services", slug: "services-ui-ux-design-services", category: "services" },
  { id: 17, title: "Web Design Services", slug: "services-web-design-services", category: "services" },
  { id: 18, title: "Web Portal Development", slug: "services-web-portal-development", category: "services" },

  { id: 19, title: "Education Software Development", slug: "industries-education-software-development", category: "industries" },
  { id: 20, title: "Elearning Platform Development", slug: "industries-elearning-platform-development", category: "industries" },
  { id: 21, title: "Fintech Software Development", slug: "industries-fintech-software-development", category: "industries" },
  { id: 22, title: "Healthcare Software Development", slug: "industries-healthcare-software-development", category: "industries" },
  { id: 23, title: "Hospitality Software Development", slug: "industries-hospitality-software-development", category: "industries" },
  { id: 24, title: "Legal Software Development", slug: "industries-legal-software-development", category: "industries" },
  { id: 25, title: "Logistics Software Development", slug: "industries-logistics-software-development", category: "industries" },
  { id: 26, title: "Real Estate Software Development", slug: "industries-real-estate-software-development", category: "industries" },
  { id: 27, title: "Restaurant Software Development", slug: "industries-restaurant-software-development", category: "industries" },
  { id: 28, title: "Retail Software Development", slug: "industries-retail-software-development", category: "industries" },

  { id: 29, title: "Ai Powered Application Development", slug: "solutions-ai-powered-application-development", category: "solutions" },
  { id: 30, title: "Business Process Automation", slug: "solutions-business-process-automation", category: "solutions" },
  { id: 31, title: "Cloud Migration Services", slug: "solutions-cloud-migration-services", category: "solutions" },
  { id: 32, title: "Custom Crm Development", slug: "solutions-custom-crm-development", category: "solutions" },
  { id: 33, title: "Enterprise Digital Transformation", slug: "solutions-enterprise-digital-transformation", category: "solutions" },
  { id: 34, title: "Marketplace Platform Development", slug: "solutions-marketplace-platform-development", category: "solutions" },
  { id: 35, title: "Mobile First Development", slug: "solutions-mobile-first-development", category: "solutions" },
  { id: 36, title: "Real Time Application Development", slug: "solutions-real-time-application-development", category: "solutions" },
  { id: 37, title: "Startup Mvp Development", slug: "solutions-startup-mvp-development", category: "solutions" },
  { id: 38, title: "White Label Software Development", slug: "solutions-white-label-software-development", category: "solutions" },

  { id: 39, title: "Angular Development", slug: "technologies-angular-development", category: "technologies" },
  { id: 40, title: "Django Development", slug: "technologies-django-development", category: "technologies" },
  { id: 41, title: "Flutter Development", slug: "technologies-flutter-development", category: "technologies" },
  { id: 42, title: "Kotlin Development", slug: "technologies-kotlin-development", category: "technologies" },
  { id: 43, title: "Laravel Development", slug: "technologies-laravel-development", category: "technologies" },
  { id: 44, title: "Nextjs Development", slug: "technologies-nextjs-development", category: "technologies" },
  { id: 45, title: "Nodejs Development", slug: "technologies-nodejs-development", category: "technologies" },
  { id: 46, title: "Python Development", slug: "technologies-python-development", category: "technologies" },
  { id: 47, title: "React Development", slug: "technologies-react-development", category: "technologies" },
  { id: 48, title: "React Native Development", slug: "technologies-react-native-development", category: "technologies" },
  { id: 49, title: "Shopify Development", slug: "technologies-shopify-development", category: "technologies" },
  { id: 50, title: "Swift Development", slug: "technologies-swift-development", category: "technologies" },
  { id: 51, title: "Typescript Development", slug: "technologies-typescript-development", category: "technologies" },
  { id: 52, title: "Vuejs Development", slug: "technologies-vuejs-development", category: "technologies" },
  { id: 53, title: "Wordpress Development", slug: "technologies-wordpress-development", category: "technologies" }
];

function generateSVG(post, index) {
  const colors = categoryColors[post.category];
  const icon = categoryIcons[post.category];

  // Create unique pattern for each post
  const patternSeed = index * 137.5; // Golden angle for distribution
  const rotation = (index * 45) % 360;

  // Split title into words for better formatting
  const words = post.title.split(' ');
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient-${post.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${colors.secondary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:1" />
    </linearGradient>

    <linearGradient id="overlayGradient-${post.id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#000000;stop-opacity:0" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:0.3" />
    </linearGradient>

    <filter id="glow-${post.id}">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background gradient -->
  <rect width="1200" height="630" fill="url(#bgGradient-${post.id})"/>

  <!-- Overlay gradient -->
  <rect width="1200" height="630" fill="url(#overlayGradient-${post.id})"/>

  <!-- Decorative circles -->
  <circle cx="${150 + (patternSeed % 100)}" cy="${100 + (patternSeed % 50)}" r="120" fill="white" opacity="0.05"/>
  <circle cx="${1050 - (patternSeed % 100)}" cy="${530 - (patternSeed % 50)}" r="150" fill="white" opacity="0.05"/>
  <circle cx="${600}" cy="${315}" r="200" fill="white" opacity="0.03"/>

  <!-- Geometric pattern -->
  <g opacity="0.1">
    <rect x="${200 + (index * 20) % 100}" y="${50 + (index * 15) % 50}" width="80" height="80" fill="white" transform="rotate(${rotation} ${240 + (index * 20) % 100} ${90 + (index * 15) % 50})"/>
    <rect x="${920 - (index * 20) % 100}" y="${450 - (index * 15) % 50}" width="60" height="60" fill="white" transform="rotate(${-rotation} ${950 - (index * 20) % 100} ${480 - (index * 15) % 50})"/>
  </g>

  <!-- Category badge -->
  <g transform="translate(60, 50)">
    <rect width="180" height="50" rx="25" fill="white" opacity="0.2"/>
    <text x="90" y="33" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="white" text-anchor="middle">
      ${colors.name.toUpperCase()}
    </text>
  </g>

  <!-- Category icon -->
  <g transform="translate(60, 520)">
    <circle r="40" cx="40" cy="40" fill="white" opacity="0.2"/>
    <svg x="16" y="16" width="48" height="48" viewBox="0 0 24 24">
      ${icon}
    </svg>
  </g>

  <!-- Title -->
  <g transform="translate(100, 280)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="${line1.length > 30 ? '56' : '64'}" font-weight="900" fill="white" filter="url(#glow-${post.id})">
      ${line1}
    </text>
    ${line2 ? `<text x="0" y="${line1.length > 30 ? '70' : '80'}" font-family="Arial, sans-serif" font-size="${line2.length > 30 ? '56' : '64'}" font-weight="900" fill="white" filter="url(#glow-${post.id})">
      ${line2}
    </text>` : ''}
  </g>

  <!-- Bottom branding -->
  <g transform="translate(100, 560)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="24" font-weight="600" fill="white" opacity="0.9">
      OHWP Studios
    </text>
  </g>

  <!-- Decorative dots -->
  <circle cx="1100" cy="80" r="8" fill="white" opacity="0.6"/>
  <circle cx="1130" cy="100" r="6" fill="white" opacity="0.4"/>
  <circle cx="1120" cy="130" r="10" fill="white" opacity="0.5"/>
</svg>`;
}

// Generate all images
console.log('🎨 Generating featured images for blog posts...\n');

const outputDir = join(__dirname, '..', 'public', 'images', 'blog');
mkdirSync(outputDir, { recursive: true });

blogPosts.forEach((post, index) => {
  const svg = generateSVG(post, index);
  const filename = `${post.slug}.svg`;
  const filepath = join(outputDir, filename);

  writeFileSync(filepath, svg);
  console.log(`✅ Generated: ${filename}`);
});

console.log(`\n🎉 Successfully generated ${blogPosts.length} featured images!`);
console.log(`📁 Saved to: ${outputDir}`);

// Generate SQL update script
const sqlUpdates = blogPosts.map(post =>
  `UPDATE blog_posts SET featured_image = '/images/blog/${post.slug}.svg' WHERE id = ${post.id};`
).join('\n');

const sqlFile = join(__dirname, '..', 'migrations', '005_update_blog_featured_images.sql');
writeFileSync(sqlFile, `-- Update featured images for all blog posts\n-- Generated: ${new Date().toISOString()}\n\n${sqlUpdates}\n`);

console.log(`\n📝 SQL migration created: migrations/005_update_blog_featured_images.sql`);
