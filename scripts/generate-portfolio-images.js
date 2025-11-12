// Generate beautiful SVG images for portfolio projects
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projects = [
  {
    slug: 'ohwp-studios-agency-website',
    title: 'OHWP Studios',
    subtitle: 'Agency Platform',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color1: '#667eea',
    color2: '#764ba2',
    icon: 'rocket',
    tags: ['Astro', 'TypeScript', 'Cloudflare']
  },
  {
    slug: 'ai-football-predictions-platform',
    title: 'AI Football',
    subtitle: 'Predictions Platform',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color1: '#f093fb',
    color2: '#f5576c',
    icon: 'activity',
    tags: ['React', 'AI', 'Real-time']
  },
  {
    slug: 'ai-real-estate-chatbot',
    title: 'Real Estate AI',
    subtitle: 'Chatbot Assistant',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color1: '#4facfe',
    color2: '#00f2fe',
    icon: 'message',
    tags: ['AI', 'Chatbot', 'NLP']
  },
  {
    slug: 'client-database-management-system',
    title: 'Client CRM',
    subtitle: 'Database System',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    color1: '#43e97b',
    color2: '#38f9d7',
    icon: 'database',
    tags: ['React', 'D1', 'R2']
  },
  {
    slug: 'physician-contracts-intelligence-platform',
    title: 'Physician Intel',
    subtitle: 'Analytics Platform',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    color1: '#fa709a',
    color2: '#fee140',
    icon: 'chart',
    tags: ['Healthcare', 'AI', 'Analytics']
  },
  {
    slug: 'ria-wealth-advisor-platform',
    title: 'Wealth Advisor',
    subtitle: 'Investment Platform',
    gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    color1: '#30cfd0',
    color2: '#330867',
    icon: 'trending',
    tags: ['Finance', 'React', 'Vite']
  }
];

const icons = {
  rocket: `<path d="M4.5 16.5c-1.5 1.36-2 3.5-2 5.5 2-.5 4-.5 5.5-2M12 15l-3-3m4 7l3-10 10-3-10 3-3 10z"/>
    <circle cx="9" cy="9" r="2" fill="white" opacity="0.3"/>`,
  activity: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  message: `<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    <circle cx="9" cy="10" r="1" fill="white"/>
    <circle cx="12" cy="10" r="1" fill="white"/>
    <circle cx="15" cy="10" r="1" fill="white"/>`,
  database: `<ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`,
  chart: `<line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>`,
  trending: `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>`
};

function generateSVG(project) {
  const { title, subtitle, gradient, color1, color2, icon, tags } = project;

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${project.slug}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>

    <linearGradient id="overlay-${project.slug}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
    </linearGradient>

    <filter id="glow">
      <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="shadow">
      <feDropShadow dx="0" dy="10" stdDeviation="20" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg-${project.slug})"/>

  <!-- Overlay pattern -->
  <rect width="1200" height="630" fill="url(#overlay-${project.slug})"/>

  <!-- Geometric shapes -->
  <circle cx="1100" cy="100" r="200" fill="white" opacity="0.05"/>
  <circle cx="-50" cy="550" r="250" fill="white" opacity="0.05"/>
  <circle cx="200" cy="-50" r="150" fill="white" opacity="0.03"/>

  <!-- Grid pattern -->
  <defs>
    <pattern id="grid-${project.slug}" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" stroke-width="0.5" opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#grid-${project.slug})"/>

  <!-- Main content card -->
  <g filter="url(#shadow)">
    <rect x="80" y="120" width="500" height="400" rx="30" fill="white" opacity="0.15" />
    <rect x="80" y="120" width="500" height="400" rx="30" fill="none" stroke="white" stroke-width="2" opacity="0.3" />
  </g>

  <!-- Icon circle -->
  <g filter="url(#glow)">
    <circle cx="330" cy="220" r="60" fill="white" opacity="0.2"/>
    <circle cx="330" cy="220" r="60" fill="none" stroke="white" stroke-width="3" opacity="0.5"/>
    <svg x="300" y="190" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${icons[icon]}
    </svg>
  </g>

  <!-- Title -->
  <text x="330" y="340" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="48" font-weight="800" fill="white" text-anchor="middle" letter-spacing="-0.02em">
    ${title}
  </text>

  <!-- Subtitle -->
  <text x="330" y="385" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="28" font-weight="500" fill="white" opacity="0.9" text-anchor="middle">
    ${subtitle}
  </text>

  <!-- Tags -->
  <g transform="translate(150, 440)">
    ${tags.map((tag, i) => `
      <g transform="translate(${i * 120}, 0)">
        <rect x="0" y="0" width="110" height="36" rx="18" fill="white" opacity="0.2"/>
        <rect x="0" y="0" width="110" height="36" rx="18" fill="none" stroke="white" stroke-width="1" opacity="0.5"/>
        <text x="55" y="24" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="white" text-anchor="middle">
          ${tag}
        </text>
      </g>
    `).join('')}
  </g>

  <!-- Right side decorative elements -->
  <g opacity="0.4">
    <!-- Code window mockup -->
    <rect x="680" y="180" width="440" height="280" rx="12" fill="white" opacity="0.1"/>
    <rect x="680" y="180" width="440" height="280" rx="12" fill="none" stroke="white" stroke-width="2" opacity="0.3"/>

    <!-- Window controls -->
    <circle cx="700" cy="200" r="6" fill="white" opacity="0.5"/>
    <circle cx="720" cy="200" r="6" fill="white" opacity="0.5"/>
    <circle cx="740" cy="200" r="6" fill="white" opacity="0.5"/>

    <!-- Code lines -->
    <rect x="700" y="230" width="380" height="8" rx="4" fill="white" opacity="0.3"/>
    <rect x="700" y="255" width="320" height="8" rx="4" fill="white" opacity="0.25"/>
    <rect x="700" y="280" width="360" height="8" rx="4" fill="white" opacity="0.3"/>
    <rect x="700" y="305" width="280" height="8" rx="4" fill="white" opacity="0.2"/>
    <rect x="700" y="330" width="340" height="8" rx="4" fill="white" opacity="0.3"/>
    <rect x="700" y="355" width="300" height="8" rx="4" fill="white" opacity="0.25"/>
    <rect x="700" y="380" width="360" height="8" rx="4" fill="white" opacity="0.3"/>
    <rect x="700" y="405" width="320" height="8" rx="4" fill="white" opacity="0.2"/>
  </g>

  <!-- OHWP Studios branding -->
  <text x="1120" y="600" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="white" opacity="0.6" text-anchor="end">
    OHWP STUDIOS
  </text>

  <!-- Decorative corner accents -->
  <path d="M 0 0 L 100 0 L 0 100 Z" fill="white" opacity="0.05"/>
  <path d="M 1200 630 L 1100 630 L 1200 530 Z" fill="white" opacity="0.05"/>
</svg>`;
}

// Generate all images
console.log('🎨 Generating portfolio images...\n');

const imagesDir = path.join(__dirname, '..', 'public', 'images', 'portfolio');

// Create directory if it doesn't exist
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log(`✅ Created directory: ${imagesDir}\n`);
}

let generated = 0;
projects.forEach(project => {
  const svg = generateSVG(project);
  const filename = `${project.slug}.svg`;
  const filepath = path.join(imagesDir, filename);

  fs.writeFileSync(filepath, svg);
  console.log(`✅ Generated: ${filename}`);
  generated++;
});

console.log(`\n🎉 Successfully generated ${generated} portfolio images!`);
console.log(`📁 Location: public/images/portfolio/\n`);

// Generate SQL to update database
const updateSQL = projects.map(project => {
  const imagePath = `/images/portfolio/${project.slug}.svg`;
  return `UPDATE portfolio_projects SET featured_image = '${imagePath}', thumbnail_image = '${imagePath}' WHERE slug = '${project.slug}';`;
}).join('\n');

const sqlFilePath = path.join(__dirname, '..', 'migrations', '0038_update_portfolio_images.sql');
fs.writeFileSync(sqlFilePath, `-- Update portfolio images
-- Generated: ${new Date().toISOString()}

${updateSQL}
`);

console.log('✅ Generated SQL migration: migrations/0038_update_portfolio_images.sql');
console.log('\n📋 Next steps:');
console.log('1. Run: wrangler d1 execute agency-db --remote --file=migrations/0038_update_portfolio_images.sql');
console.log('2. Visit: https://ohwpstudios.org/portfolio to see your updated portfolio!\n');
