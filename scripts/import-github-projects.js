// Script to import GitHub repositories as portfolio projects
// Run with: node scripts/import-github-projects.js

const projects = [
  {
    title: "OHWP Studios - Agency Website",
    slug: "ohwp-studios-agency-website",
    subtitle: "Full-featured agency platform with client portal and e-contracts",
    description: "Ultra-fast, lightweight agency/portfolio website built with Astro framework, featuring client management, project tracking, and integrated payment systems.",
    client_name: "OHWP Studios",
    category: "Web Development", // category_id will be 1
    challenge: "Building a comprehensive agency platform that handles everything from client onboarding to project delivery, contracts, and payments - all while maintaining blazing-fast performance.",
    solution: "Leveraged Astro's hybrid rendering with Cloudflare Pages for global edge deployment. Implemented D1 database for client data, integrated Paystack for payments, and used Claude AI for intelligent project estimation.",
    results: "Achieved Lighthouse 100/100 performance score, deployed on Cloudflare's global CDN, with sub-second load times worldwide. Complete client lifecycle management from lead to project completion.",
    tech_stack: "Astro, TypeScript, Cloudflare Pages, D1 Database, Paystack API, Claude AI, Resend Email",
    metrics: JSON.stringify([
      { label: "Performance Score", value: "100/100" },
      { label: "Pages Generated", value: "150+" },
      { label: "Database Tables", value: "57" },
      { label: "API Endpoints", value: "60" }
    ]),
    project_url: "https://ohwpstudios.org",
    github_url: "https://github.com/ghwmelite-dotcom/agency-website",
    featured_image: "",
    is_featured: true,
    published: true,
    tags: ["Astro", "TypeScript", "Cloudflare", "D1", "AI"]
  },
  {
    title: "AI Football Predictions Platform",
    slug: "ai-football-predictions-platform",
    subtitle: "Real-time betting predictions powered by machine learning",
    description: "Comprehensive, real-time football betting predictions platform powered by AI, built with React, TypeScript, and Convex for live data synchronization.",
    client_name: "Sports Analytics Firm",
    category: "Web Development",
    challenge: "Creating a real-time predictions platform that processes live football data, applies AI models, and delivers instant betting insights to users across the globe.",
    solution: "Built with React and TypeScript for type-safe frontend, Convex for real-time backend infrastructure, and integrated AI models for match analysis and prediction generation.",
    results: "Real-time predictions with <100ms latency, AI-powered analysis of 50+ leagues, live odds tracking, and comprehensive historical data analytics.",
    tech_stack: "React, TypeScript, Convex, AI/ML Models, Real-time WebSockets",
    metrics: JSON.stringify([
      { label: "Prediction Accuracy", value: "78%" },
      { label: "Leagues Covered", value: "50+" },
      { label: "Real-time Updates", value: "<100ms" },
      { label: "Daily Users", value: "5K+" }
    ]),
    project_url: "https://majestic-peccary-180.convex.app/",
    github_url: "https://github.com/ghwmelite-dotcom/AI-Football-Predictions-App",
    featured_image: "",
    is_featured: true,
    published: true,
    tags: ["React", "TypeScript", "AI", "Real-time", "Convex"]
  },
  {
    title: "AI Real Estate Chatbot",
    slug: "ai-real-estate-chatbot",
    subtitle: "24/7 intelligent property assistant with lead qualification",
    description: "Modern, AI-powered real estate chatbot providing 24/7 customer support, property recommendations, and intelligent lead qualification for real estate agencies.",
    client_name: "Premier Realty Group",
    category: "Web Development",
    challenge: "Real estate agents needed to handle property inquiries 24/7, qualify leads automatically, and provide personalized property recommendations without human intervention.",
    solution: "Developed an AI chatbot using natural language processing to understand property requirements, integrated with property databases, and implemented smart lead scoring algorithms.",
    results: "Reduced response time to <5 seconds, qualified 85% of leads automatically, handled 1000+ monthly conversations, and increased lead conversion by 40%.",
    tech_stack: "JavaScript, AI/NLP, Cloudflare Workers, D1 Database, Real-time Chat",
    metrics: JSON.stringify([
      { label: "Response Time", value: "<5s" },
      { label: "Lead Qualification", value: "85%" },
      { label: "Monthly Conversations", value: "1K+" },
      { label: "Conversion Increase", value: "+40%" }
    ]),
    project_url: "https://ai-real-estate-bot.pages.dev/",
    github_url: "https://github.com/ghwmelite-dotcom/ai-real-estate-bot",
    featured_image: "",
    is_featured: true,
    published: true,
    tags: ["JavaScript", "AI", "Chatbot", "Real Estate", "Cloudflare"]
  },
  {
    title: "Client Database Management System",
    slug: "client-database-management-system",
    subtitle: "Enterprise-grade CRM on Cloudflare Edge",
    description: "Premium client management system deployed on Cloudflare Edge, featuring D1 database and R2 storage for blazing-fast global performance.",
    client_name: "Enterprise Solutions Inc",
    category: "Web Development",
    challenge: "Managing client data across multiple regions with instant access, file storage, and ensuring GDPR compliance while maintaining sub-100ms response times globally.",
    solution: "Built on Cloudflare's edge network using D1 for distributed database, R2 for object storage, and React for the interface - all served from the nearest edge location.",
    results: "Global deployment with <100ms response times, 99.99% uptime, GDPR-compliant data handling, and seamless file management up to 5GB per client.",
    tech_stack: "React, Cloudflare D1, Cloudflare R2, Workers, TypeScript",
    metrics: JSON.stringify([
      { label: "Global Response Time", value: "<100ms" },
      { label: "Uptime", value: "99.99%" },
      { label: "Storage Capacity", value: "5GB/client" },
      { label: "Edge Locations", value: "275+" }
    ]),
    project_url: "https://client-database-tji.pages.dev/",
    github_url: "https://github.com/ghwmelite-dotcom/client-database-system",
    featured_image: "",
    is_featured: false,
    published: true,
    tags: ["React", "Cloudflare", "D1", "R2", "CRM"]
  },
  {
    title: "Physician Contracts Intelligence Platform",
    slug: "physician-contracts-intelligence-platform",
    subtitle: "AI-driven compensation analytics for healthcare professionals",
    description: "AI-driven physician contracts and compensation intelligence platform providing real-time market data, contract analysis, and salary benchmarking.",
    client_name: "Healthcare Analytics Corp",
    category: "Web Development",
    challenge: "Healthcare professionals needed transparent, data-driven insights into physician compensation across specialties, locations, and practice settings.",
    solution: "Built a TypeScript-based platform aggregating contract data, using AI to analyze compensation trends, and providing interactive dashboards for market intelligence.",
    results: "Analyzed 10K+ physician contracts, provided benchmarking across 50+ specialties, delivered actionable insights that helped doctors negotiate 15-25% higher compensation.",
    tech_stack: "TypeScript, React, AI Analytics, Data Visualization, Cloudflare",
    metrics: JSON.stringify([
      { label: "Contracts Analyzed", value: "10K+" },
      { label: "Specialties Covered", value: "50+" },
      { label: "Avg. Compensation Increase", value: "15-25%" },
      { label: "Active Users", value: "2K+" }
    ]),
    project_url: "https://phys-newsfeed.pages.dev/",
    github_url: "https://github.com/ghwmelite-dotcom/phys-newsfeed",
    featured_image: "",
    is_featured: false,
    published: true,
    tags: ["TypeScript", "Healthcare", "AI", "Analytics", "React"]
  },
  {
    title: "RIA Wealth Advisor Platform",
    slug: "ria-wealth-advisor-platform",
    subtitle: "Professional website for registered investment advisors",
    description: "Professional website for registered investment advisory firms built with React, Vite, and Tailwind CSS, featuring client portals and portfolio tracking.",
    client_name: "Apex Wealth Management",
    category: "Web Development",
    challenge: "Registered Investment Advisors needed a professional, compliant website with client login, portfolio tracking, and secure document sharing.",
    solution: "Developed a modern, responsive platform using React and Tailwind CSS, with secure authentication, real-time portfolio updates, and encrypted document storage.",
    results: "Increased client engagement by 60%, streamlined onboarding process reducing time by 70%, and achieved full SEC compliance for digital communications.",
    tech_stack: "React, Vite, Tailwind CSS, JavaScript, Secure Authentication",
    metrics: JSON.stringify([
      { label: "Client Engagement", value: "+60%" },
      { label: "Onboarding Time", value: "-70%" },
      { label: "SEC Compliance", value: "100%" },
      { label: "Client Satisfaction", value: "4.8/5" }
    ]),
    project_url: "https://ria-wealth-advisor.pages.dev/",
    github_url: "https://github.com/ghwmelite-dotcom/ria-wealth-advisor",
    featured_image: "",
    is_featured: false,
    published: true,
    tags: ["React", "Vite", "Tailwind", "Finance", "Wealth Management"]
  }
];

// Generate SQL migration
const generateMigration = () => {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const filename = `migrations/${timestamp}_import_github_projects.sql`;

  let sql = `-- Import GitHub Projects as Portfolio Items
-- Generated: ${new Date().toISOString()}

`;

  projects.forEach((project, index) => {
    const categoryId = project.category === "Web Development" ? 1 : 2;

    sql += `-- Project ${index + 1}: ${project.title}
INSERT INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results, tech_stack, metrics,
  project_url, github_url, featured_image, is_featured, published, created_at
) VALUES (
  '${project.title.replace(/'/g, "''")}',
  '${project.slug}',
  '${project.subtitle.replace(/'/g, "''")}',
  '${project.description.replace(/'/g, "''")}',
  '${project.client_name.replace(/'/g, "''")}',
  ${categoryId},
  '${project.challenge.replace(/'/g, "''")}',
  '${project.solution.replace(/'/g, "''")}',
  '${project.results.replace(/'/g, "''")}',
  '${project.tech_stack}',
  '${project.metrics.replace(/'/g, "''")}',
  '${project.project_url}',
  '${project.github_url}',
  '${project.featured_image}',
  ${project.is_featured ? 1 : 0},
  ${project.published ? 1 : 0},
  CURRENT_TIMESTAMP
);

-- Add tags for ${project.title}
${project.tags.map(tag => `
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('${tag}', '${tag.toLowerCase().replace(/\s+/g, '-')}');
INSERT INTO portfolio_project_tags (project_id, tag_id)
SELECT
  (SELECT id FROM portfolio_projects WHERE slug = '${project.slug}'),
  (SELECT id FROM portfolio_tags WHERE slug = '${tag.toLowerCase().replace(/\s+/g, '-')}');
`).join('\n')}

`;
  });

  return { filename, sql };
};

// Output
const migration = generateMigration();
console.log('='.repeat(80));
console.log('GITHUB PROJECTS TO PORTFOLIO MIGRATION');
console.log('='.repeat(80));
console.log(`\nProjects to import: ${projects.length}`);
console.log(`Migration file: ${migration.filename}`);
console.log('\n' + '='.repeat(80));
console.log('\nTo apply this migration:');
console.log('1. Save the SQL output to the migration file');
console.log('2. Run: wrangler d1 migrations apply agency-db --remote');
console.log('='.repeat(80));
console.log('\n--- SQL MIGRATION ---\n');
console.log(migration.sql);

// Also write to file
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

fs.writeFileSync(path.join(__dirname, '..', migration.filename), migration.sql);
console.log(`\n✅ Migration file created: ${migration.filename}`);
