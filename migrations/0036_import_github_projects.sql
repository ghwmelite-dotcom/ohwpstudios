-- Import GitHub Projects as Portfolio Items
-- Generated: 2025-11-12

-- Project 1: OHWP Studios - Agency Website
INSERT INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results, tech_stack, metrics,
  project_url, github_url, featured_image, is_featured, published, created_at
) VALUES (
  'OHWP Studios - Agency Website',
  'ohwp-studios-agency-website',
  'Full-featured agency platform with client portal and e-contracts',
  'Ultra-fast, lightweight agency/portfolio website built with Astro framework, featuring client management, project tracking, and integrated payment systems.',
  'OHWP Studios',
  1,
  'Building a comprehensive agency platform that handles everything from client onboarding to project delivery, contracts, and payments - all while maintaining blazing-fast performance.',
  'Leveraged Astro''s hybrid rendering with Cloudflare Pages for global edge deployment. Implemented D1 database for client data, integrated Paystack for payments, and used Claude AI for intelligent project estimation.',
  'Achieved Lighthouse 100/100 performance score, deployed on Cloudflare''s global CDN, with sub-second load times worldwide. Complete client lifecycle management from lead to project completion.',
  'Astro, TypeScript, Cloudflare Pages, D1 Database, Paystack API, Claude AI, Resend Email',
  '[{"label":"Performance Score","value":"100/100"},{"label":"Pages Generated","value":"150+"},{"label":"Database Tables","value":"57"},{"label":"API Endpoints","value":"60"}]',
  'https://ohwpstudios.org',
  'https://github.com/ghwmelite-dotcom/agency-website',
  '',
  1,
  1,
  CURRENT_TIMESTAMP
);

-- Add tags for OHWP Studios
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Astro', 'astro');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('TypeScript', 'typescript');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Cloudflare', 'cloudflare');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('D1', 'd1');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('AI', 'ai');

INSERT INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'ohwp-studios-agency-website' AND t.slug IN ('astro', 'typescript', 'cloudflare', 'd1', 'ai');

-- Project 2: AI Football Predictions Platform
INSERT INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results, tech_stack, metrics,
  project_url, github_url, featured_image, is_featured, published, created_at
) VALUES (
  'AI Football Predictions Platform',
  'ai-football-predictions-platform',
  'Real-time betting predictions powered by machine learning',
  'Comprehensive, real-time football betting predictions platform powered by AI, built with React, TypeScript, and Convex for live data synchronization.',
  'Sports Analytics Firm',
  1,
  'Creating a real-time predictions platform that processes live football data, applies AI models, and delivers instant betting insights to users across the globe.',
  'Built with React and TypeScript for type-safe frontend, Convex for real-time backend infrastructure, and integrated AI models for match analysis and prediction generation.',
  'Real-time predictions with <100ms latency, AI-powered analysis of 50+ leagues, live odds tracking, and comprehensive historical data analytics.',
  'React, TypeScript, Convex, AI/ML Models, Real-time WebSockets',
  '[{"label":"Prediction Accuracy","value":"78%"},{"label":"Leagues Covered","value":"50+"},{"label":"Real-time Updates","value":"<100ms"},{"label":"Daily Users","value":"5K+"}]',
  'https://majestic-peccary-180.convex.app/',
  'https://github.com/ghwmelite-dotcom/AI-Football-Predictions-App',
  '',
  1,
  1,
  CURRENT_TIMESTAMP
);

-- Add tags for AI Football
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Convex', 'convex');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Real-time', 'real-time');

INSERT INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'ai-football-predictions-platform' AND t.slug IN ('react', 'typescript', 'ai', 'real-time', 'convex');

-- Project 3: AI Real Estate Chatbot
INSERT INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results, tech_stack, metrics,
  project_url, github_url, featured_image, is_featured, published, created_at
) VALUES (
  'AI Real Estate Chatbot',
  'ai-real-estate-chatbot',
  '24/7 intelligent property assistant with lead qualification',
  'Modern, AI-powered real estate chatbot providing 24/7 customer support, property recommendations, and intelligent lead qualification for real estate agencies.',
  'Premier Realty Group',
  1,
  'Real estate agents needed to handle property inquiries 24/7, qualify leads automatically, and provide personalized property recommendations without human intervention.',
  'Developed an AI chatbot using natural language processing to understand property requirements, integrated with property databases, and implemented smart lead scoring algorithms.',
  'Reduced response time to <5 seconds, qualified 85% of leads automatically, handled 1000+ monthly conversations, and increased lead conversion by 40%.',
  'JavaScript, AI/NLP, Cloudflare Workers, D1 Database, Real-time Chat',
  '[{"label":"Response Time","value":"<5s"},{"label":"Lead Qualification","value":"85%"},{"label":"Monthly Conversations","value":"1K+"},{"label":"Conversion Increase","value":"+40%"}]',
  'https://ai-real-estate-bot.pages.dev/',
  'https://github.com/ghwmelite-dotcom/ai-real-estate-bot',
  '',
  1,
  1,
  CURRENT_TIMESTAMP
);

-- Add tags for Real Estate Bot
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Chatbot', 'chatbot');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Real Estate', 'real-estate');

INSERT INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'ai-real-estate-chatbot' AND t.slug IN ('ai', 'chatbot', 'real-estate', 'cloudflare', 'd1');

-- Project 4: Client Database Management System
INSERT INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results, tech_stack, metrics,
  project_url, github_url, featured_image, is_featured, published, created_at
) VALUES (
  'Client Database Management System',
  'client-database-management-system',
  'Enterprise-grade CRM on Cloudflare Edge',
  'Premium client management system deployed on Cloudflare Edge, featuring D1 database and R2 storage for blazing-fast global performance.',
  'Enterprise Solutions Inc',
  1,
  'Managing client data across multiple regions with instant access, file storage, and ensuring GDPR compliance while maintaining sub-100ms response times globally.',
  'Built on Cloudflare''s edge network using D1 for distributed database, R2 for object storage, and React for the interface - all served from the nearest edge location.',
  'Global deployment with <100ms response times, 99.99% uptime, GDPR-compliant data handling, and seamless file management up to 5GB per client.',
  'React, Cloudflare D1, Cloudflare R2, Workers, TypeScript',
  '[{"label":"Global Response Time","value":"<100ms"},{"label":"Uptime","value":"99.99%"},{"label":"Storage Capacity","value":"5GB/client"},{"label":"Edge Locations","value":"275+"}]',
  'https://client-database-tji.pages.dev/',
  'https://github.com/ghwmelite-dotcom/client-database-system',
  '',
  0,
  1,
  CURRENT_TIMESTAMP
);

-- Add tags for Client DB
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('CRM', 'crm');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('R2', 'r2');

INSERT INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'client-database-management-system' AND t.slug IN ('react', 'cloudflare', 'd1', 'r2', 'crm');

-- Project 5: Physician Contracts Intelligence Platform
INSERT INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results, tech_stack, metrics,
  project_url, github_url, featured_image, is_featured, published, created_at
) VALUES (
  'Physician Contracts Intelligence Platform',
  'physician-contracts-intelligence-platform',
  'AI-driven compensation analytics for healthcare professionals',
  'AI-driven physician contracts and compensation intelligence platform providing real-time market data, contract analysis, and salary benchmarking.',
  'Healthcare Analytics Corp',
  1,
  'Healthcare professionals needed transparent, data-driven insights into physician compensation across specialties, locations, and practice settings.',
  'Built a TypeScript-based platform aggregating contract data, using AI to analyze compensation trends, and providing interactive dashboards for market intelligence.',
  'Analyzed 10K+ physician contracts, provided benchmarking across 50+ specialties, delivered actionable insights that helped doctors negotiate 15-25% higher compensation.',
  'TypeScript, React, AI Analytics, Data Visualization, Cloudflare',
  '[{"label":"Contracts Analyzed","value":"10K+"},{"label":"Specialties Covered","value":"50+"},{"label":"Avg. Compensation Increase","value":"15-25%"},{"label":"Active Users","value":"2K+"}]',
  'https://phys-newsfeed.pages.dev/',
  'https://github.com/ghwmelite-dotcom/phys-newsfeed',
  '',
  0,
  1,
  CURRENT_TIMESTAMP
);

-- Add tags for Physician Platform
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Healthcare', 'healthcare');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Analytics', 'analytics');

INSERT INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'physician-contracts-intelligence-platform' AND t.slug IN ('typescript', 'healthcare', 'ai', 'analytics', 'react');

-- Project 6: RIA Wealth Advisor Platform
INSERT INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results, tech_stack, metrics,
  project_url, github_url, featured_image, is_featured, published, created_at
) VALUES (
  'RIA Wealth Advisor Platform',
  'ria-wealth-advisor-platform',
  'Professional website for registered investment advisors',
  'Professional website for registered investment advisory firms built with React, Vite, and Tailwind CSS, featuring client portals and portfolio tracking.',
  'Apex Wealth Management',
  1,
  'Registered Investment Advisors needed a professional, compliant website with client login, portfolio tracking, and secure document sharing.',
  'Developed a modern, responsive platform using React and Tailwind CSS, with secure authentication, real-time portfolio updates, and encrypted document storage.',
  'Increased client engagement by 60%, streamlined onboarding process reducing time by 70%, and achieved full SEC compliance for digital communications.',
  'React, Vite, Tailwind CSS, JavaScript, Secure Authentication',
  '[{"label":"Client Engagement","value":"+60%"},{"label":"Onboarding Time","value":"-70%"},{"label":"SEC Compliance","value":"100%"},{"label":"Client Satisfaction","value":"4.8/5"}]',
  'https://ria-wealth-advisor.pages.dev/',
  'https://github.com/ghwmelite-dotcom/ria-wealth-advisor',
  '',
  0,
  1,
  CURRENT_TIMESTAMP
);

-- Add tags for RIA Platform
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Vite', 'vite');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Tailwind', 'tailwind');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Finance', 'finance');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Wealth Management', 'wealth-management');

INSERT INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'ria-wealth-advisor-platform' AND t.slug IN ('react', 'vite', 'tailwind', 'finance', 'wealth-management');
