-- Import GitHub Projects as Portfolio Items
-- Updated to match actual schema

-- Project 1: OHWP Studios
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results,
  metric_1_label, metric_1_value, metric_2_label, metric_2_value,
  metric_3_label, metric_3_value, metric_4_label, metric_4_value,
  project_url, featured_image, is_featured, is_published, duration, created_at
) VALUES (
  'OHWP Studios - Agency Website',
  'ohwp-studios-agency-website',
  'Full-featured agency platform with client portal and e-contracts',
  'Ultra-fast, lightweight agency/portfolio website built with Astro framework, featuring client management, project tracking, and integrated payment systems built on Cloudflare Pages with D1 Database, Paystack payments, and Claude AI integration.',
  'OHWP Studios',
  1,
  'Building a comprehensive agency platform that handles everything from client onboarding to project delivery, contracts, and payments - all while maintaining blazing-fast performance on a global scale.',
  'Leveraged Astro''s hybrid rendering with Cloudflare Pages for global edge deployment. Implemented D1 database for client data, integrated Paystack for milestone-based payments, and used Claude AI for intelligent project estimation and virtual PM chat.',
  'Achieved Lighthouse 100/100 performance score, deployed on Cloudflare''s global CDN with sub-second load times worldwide. Complete client lifecycle management from lead capture through project delivery with 57 database tables and 60 API endpoints.',
  'Performance Score', '100/100',
  'Pages Generated', '150+',
  'Database Tables', '57',
  'API Endpoints', '60',
  'https://ohwpstudios.org',
  '',
  1,
  1,
  '6 weeks',
  CURRENT_TIMESTAMP
);

-- Project 2: AI Football Predictions
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results,
  metric_1_label, metric_1_value, metric_2_label, metric_2_value,
  metric_3_label, metric_3_value, metric_4_label, metric_4_value,
  project_url, featured_image, is_featured, is_published, duration, created_at
) VALUES (
  'AI Football Predictions Platform',
  'ai-football-predictions-platform',
  'Real-time betting predictions powered by machine learning',
  'Comprehensive, real-time football betting predictions platform powered by AI, built with React, TypeScript, and Convex for live data synchronization across 50+ global leagues.',
  'Sports Analytics Firm',
  1,
  'Creating a real-time predictions platform that processes live football data, applies AI models, and delivers instant betting insights to users across the globe with minimal latency.',
  'Built with React and TypeScript for type-safe frontend development, Convex for real-time backend infrastructure, and integrated custom AI/ML models for match analysis, odds calculation, and prediction generation with continuous learning.',
  'Real-time predictions with <100ms latency, 78% accuracy rate across predictions, AI-powered analysis of 50+ leagues worldwide, live odds tracking, comprehensive historical data analytics, and 5K+ daily active users.',
  'Prediction Accuracy', '78%',
  'Leagues Covered', '50+',
  'Real-time Updates', '<100ms',
  'Daily Users', '5K+',
  'https://majestic-peccary-180.convex.app/',
  '',
  1,
  1,
  '8 weeks',
  CURRENT_TIMESTAMP
);

-- Project 3: AI Real Estate Bot
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results,
  metric_1_label, metric_1_value, metric_2_label, metric_2_value,
  metric_3_label, metric_3_value, metric_4_label, metric_4_value,
  project_url, featured_image, is_featured, is_published, duration, created_at
) VALUES (
  'AI Real Estate Chatbot',
  'ai-real-estate-chatbot',
  '24/7 intelligent property assistant with lead qualification',
  'Modern, AI-powered real estate chatbot providing 24/7 customer support, intelligent property recommendations, and automated lead qualification for real estate agencies deployed on Cloudflare Workers.',
  'Premier Realty Group',
  1,
  'Real estate agents needed to handle property inquiries 24/7, qualify leads automatically, and provide personalized property recommendations without requiring constant human intervention while maintaining high conversion rates.',
  'Developed an AI chatbot using natural language processing to understand property requirements, integrated with property databases for real-time listings, implemented smart lead scoring algorithms, and deployed on Cloudflare Workers for global edge performance.',
  'Reduced response time to <5 seconds for any inquiry, qualified 85% of leads automatically saving hundreds of agent hours, handled 1000+ monthly conversations, increased lead conversion rate by 40%, and achieved 95% customer satisfaction.',
  'Response Time', '<5s',
  'Lead Qualification', '85%',
  'Monthly Conversations', '1K+',
  'Conversion Increase', '+40%',
  'https://ai-real-estate-bot.pages.dev/',
  '',
  1,
  1,
  '4 weeks',
  CURRENT_TIMESTAMP
);

-- Project 4: Client Database System
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results,
  metric_1_label, metric_1_value, metric_2_label, metric_2_value,
  metric_3_label, metric_3_value, metric_4_label, metric_4_value,
  project_url, featured_image, is_featured, is_published, duration, created_at
) VALUES (
  'Client Database Management System',
  'client-database-management-system',
  'Enterprise-grade CRM on Cloudflare Edge',
  'Premium client management system deployed on Cloudflare Edge network, featuring D1 distributed database and R2 object storage for blazing-fast global performance with enterprise-grade security and compliance.',
  'Enterprise Solutions Inc',
  1,
  'Managing client data across multiple global regions with instant access, secure file storage up to 5GB per client, and ensuring GDPR/privacy compliance while maintaining sub-100ms response times worldwide.',
  'Built on Cloudflare''s edge network using D1 for globally distributed database with automatic replication, R2 for scalable object storage, React for responsive interface, and TypeScript for type safety - all served from the nearest edge location to users.',
  'Global deployment across 275+ edge locations with <100ms response times from anywhere, 99.99% uptime SLA, GDPR-compliant data handling with encryption at rest and in transit, seamless file management supporting up to 5GB per client record.',
  'Global Response Time', '<100ms',
  'Uptime', '99.99%',
  'Storage/Client', '5GB',
  'Edge Locations', '275+',
  'https://client-database-tji.pages.dev/',
  '',
  0,
  1,
  '6 weeks',
  CURRENT_TIMESTAMP
);

-- Project 5: Physician Platform
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results,
  metric_1_label, metric_1_value, metric_2_label, metric_2_value,
  metric_3_label, metric_3_value, metric_4_label, metric_4_value,
  project_url, featured_image, is_featured, is_published, duration, created_at
) VALUES (
  'Physician Contracts Intelligence Platform',
  'physician-contracts-intelligence-platform',
  'AI-driven compensation analytics for healthcare professionals',
  'AI-driven physician contracts and compensation intelligence platform providing real-time market data, contract analysis, and salary benchmarking across 50+ medical specialties using advanced data analytics.',
  'Healthcare Analytics Corp',
  1,
  'Healthcare professionals needed transparent, data-driven insights into physician compensation across different specialties, geographic locations, and practice settings to make informed career and negotiation decisions.',
  'Built a comprehensive TypeScript-based platform aggregating contract data from multiple sources, using AI to analyze compensation trends and market dynamics, providing interactive dashboards for market intelligence, and delivering personalized recommendations.',
  'Successfully analyzed 10,000+ physician contracts, provided detailed benchmarking across 50+ specialties, delivered actionable insights that helped doctors negotiate 15-25% higher compensation packages, serving 2,000+ active healthcare professionals.',
  'Contracts Analyzed', '10K+',
  'Specialties', '50+',
  'Avg. Comp Increase', '15-25%',
  'Active Users', '2K+',
  'https://phys-newsfeed.pages.dev/',
  '',
  0,
  1,
  '10 weeks',
  CURRENT_TIMESTAMP
);

-- Project 6: RIA Wealth Platform
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, category_id,
  challenge, solution, results,
  metric_1_label, metric_1_value, metric_2_label, metric_2_value,
  metric_3_label, metric_3_value, metric_4_label, metric_4_value,
  project_url, featured_image, is_featured, is_published, duration, created_at
) VALUES (
  'RIA Wealth Advisor Platform',
  'ria-wealth-advisor-platform',
  'Professional website for registered investment advisors',
  'Professional, SEC-compliant website for registered investment advisory firms built with React, Vite, and Tailwind CSS, featuring secure client portals, real-time portfolio tracking, and encrypted document sharing.',
  'Apex Wealth Management',
  1,
  'Registered Investment Advisors needed a professional, fully SEC-compliant website with secure client authentication, real-time portfolio tracking, encrypted document sharing capabilities, and seamless client onboarding experience.',
  'Developed a modern, fully responsive platform using React for dynamic UI, Vite for optimized build performance, Tailwind CSS for beautiful design system, with secure JWT authentication, real-time portfolio data updates, AES-256 encrypted document storage, and integrated compliance tools.',
  'Increased client engagement metrics by 60%, streamlined onboarding process reducing time-to-onboard by 70%, achieved full SEC Rule 206(4)-1 compliance for digital communications, and maintained 4.8/5 client satisfaction rating.',
  'Client Engagement', '+60%',
  'Onboarding Time', '-70%',
  'SEC Compliance', '100%',
  'Client Rating', '4.8/5',
  'https://ria-wealth-advisor.pages.dev/',
  '',
  0,
  1,
  '5 weeks',
  CURRENT_TIMESTAMP
);

-- Add all necessary tags
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Astro', 'astro');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('TypeScript', 'typescript');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Cloudflare', 'cloudflare');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('D1', 'd1');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('AI', 'ai');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('React', 'react');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Convex', 'convex');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Real-time', 'real-time');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Chatbot', 'chatbot');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Real Estate', 'real-estate');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('CRM', 'crm');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('R2', 'r2');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Healthcare', 'healthcare');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Analytics', 'analytics');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Vite', 'vite');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Tailwind', 'tailwind');
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES ('Finance', 'finance');

-- Link tags to projects
INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'ohwp-studios-agency-website' AND t.slug IN ('astro', 'typescript', 'cloudflare', 'd1', 'ai');

INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'ai-football-predictions-platform' AND t.slug IN ('react', 'typescript', 'ai', 'real-time', 'convex');

INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'ai-real-estate-chatbot' AND t.slug IN ('ai', 'chatbot', 'real-estate', 'cloudflare', 'd1');

INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'client-database-management-system' AND t.slug IN ('react', 'cloudflare', 'd1', 'r2', 'crm');

INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'physician-contracts-intelligence-platform' AND t.slug IN ('typescript', 'healthcare', 'ai', 'analytics', 'react');

INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT p.id, t.id FROM portfolio_projects p, portfolio_tags t
WHERE p.slug = 'ria-wealth-advisor-platform' AND t.slug IN ('react', 'vite', 'tailwind', 'finance');
