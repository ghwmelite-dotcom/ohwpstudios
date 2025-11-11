import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const caseStudies = [
  {
    slug: 'ecommerce',
    title: 'E-Commerce Platform',
    color1: '#667eea',
    color2: '#764ba2',
    icon: '🛍️'
  },
  {
    slug: 'healthcare',
    title: 'Healthcare System',
    color1: '#10b981',
    color2: '#34d399',
    icon: '🏥'
  },
  {
    slug: 'fintech',
    title: 'FinTech App',
    color1: '#f59e0b',
    color2: '#f97316',
    icon: '💰'
  }
];

function generateSVG(study) {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient-${study.slug}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${study.color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${study.color2};stop-opacity:1" />
    </linearGradient>

    <filter id="glow-${study.slug}">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background gradient -->
  <rect width="1200" height="630" fill="url(#bgGradient-${study.slug})"/>

  <!-- Decorative circles -->
  <circle cx="150" cy="100" r="120" fill="white" opacity="0.05"/>
  <circle cx="1050" cy="530" r="150" fill="white" opacity="0.05"/>
  <circle cx="600" cy="315" r="200" fill="white" opacity="0.03"/>

  <!-- Geometric pattern -->
  <g opacity="0.08">
    <rect x="200" y="50" width="80" height="80" fill="white" transform="rotate(45 240 90)"/>
    <rect x="920" y="450" width="60" height="60" fill="white" transform="rotate(-45 950 480)"/>
  </g>

  <!-- Main icon/emoji -->
  <text x="600" y="280" font-family="Arial" font-size="160" text-anchor="middle">${study.icon}</text>

  <!-- Title -->
  <text x="600" y="420" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="white" text-anchor="middle" filter="url(#glow-${study.slug})">
    ${study.title}
  </text>

  <!-- OHWP Studios branding -->
  <text x="600" y="560" font-family="Arial, sans-serif" font-size="24" font-weight="600" fill="white" opacity="0.9" text-anchor="middle">
    OHWP Studios Case Study
  </text>

  <!-- Decorative dots -->
  <circle cx="1100" cy="80" r="8" fill="white" opacity="0.6"/>
  <circle cx="1130" cy="100" r="6" fill="white" opacity="0.4"/>
  <circle cx="1120" cy="130" r="10" fill="white" opacity="0.5"/>
</svg>`;
}

// Generate all images
console.log('🎨 Generating case study featured images...\n');

const outputDir = join(__dirname, '..', 'public', 'images');
mkdirSync(outputDir, { recursive: true });

caseStudies.forEach(study => {
  const svg = generateSVG(study);
  const filename = `case-study-${study.slug}.svg`;
  const filepath = join(outputDir, filename);

  writeFileSync(filepath, svg);
  console.log(`✅ Generated: ${filename}`);
});

console.log(`\n🎉 Successfully generated ${caseStudies.length} case study images!`);
console.log(`📁 Saved to: ${outputDir}`);
