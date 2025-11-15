-- Premium Portfolio Projects for Hodges & Co.
-- World-class projects showcasing expertise across industries

-- Add additional tags for premium projects
INSERT OR IGNORE INTO portfolio_tags (name, slug) VALUES
('Node.js', 'nodejs'),
('React Native', 'react-native'),
('Flutter', 'flutter'),
('AWS', 'aws'),
('Cloudflare', 'cloudflare'),
('PostgreSQL', 'postgresql'),
('GraphQL', 'graphql'),
('AI/ML', 'ai-ml'),
('Blockchain', 'blockchain'),
('Performance', 'performance'),
('Security', 'security'),
('Microservices', 'microservices'),
('Progressive Web App', 'pwa'),
('Real-time', 'real-time'),
('API Integration', 'api-integration');

-- PROJECT 1: FinPay - Revolutionary FinTech Mobile App
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, project_url,
  featured_image, thumbnail_image,
  challenge, solution, results,
  category_id, project_date, completion_date, duration,
  metric_1_label, metric_1_value,
  metric_2_label, metric_2_value,
  metric_3_label, metric_3_value,
  metric_4_label, metric_4_value,
  is_featured, is_published, display_order,
  meta_title, meta_description
) VALUES (
  'FinPay - Digital Banking Revolution',
  'finpay-digital-banking',
  'Next-generation mobile banking with AI-powered insights',
  'FinPay is a cutting-edge digital banking platform that combines seamless transactions, smart budgeting tools, and AI-driven financial insights. Built with security-first architecture and real-time data synchronization across devices.',
  'FinPay Technologies',
  'https://finpay-demo.example.com',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop',
  'Traditional banking apps struggle with user engagement and lack personalized financial insights. FinPay needed a platform that would transform how millennials and Gen-Z interact with their finances while maintaining bank-grade security.',
  'We developed a comprehensive mobile-first platform using React Native for cross-platform deployment, integrated with secure banking APIs, and built AI-powered financial coaching features. The app includes biometric authentication, real-time transaction notifications, smart savings goals, and investment recommendations.',
  'Within 6 months of launch, FinPay achieved 500K+ downloads with a 4.8★ rating. Users reported 40% improvement in savings rates and 65% increase in financial literacy. The platform processes $2M+ in daily transactions with 99.99% uptime.',
  2, -- Mobile Apps
  '2024-01-15',
  '2024-06-30',
  '6 months',
  'Downloads', '500K+',
  'User Rating', '4.8★',
  'Daily Transactions', '$2M+',
  'User Retention', '85%',
  1, 1, 1,
  'FinPay Digital Banking App - Hodges & Co. Portfolio',
  'Revolutionary mobile banking platform with AI-powered insights and real-time transaction management.'
);

-- PROJECT 2: CloudOps Enterprise - SaaS Infrastructure Platform
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, project_url,
  featured_image, thumbnail_image,
  challenge, solution, results,
  category_id, project_date, completion_date, duration,
  metric_1_label, metric_1_value,
  metric_2_label, metric_2_value,
  metric_3_label, metric_3_value,
  metric_4_label, metric_4_value,
  is_featured, is_published, display_order,
  meta_title, meta_description
) VALUES (
  'CloudOps Enterprise - Infrastructure Management SaaS',
  'cloudops-enterprise-saas',
  'Unified platform for multi-cloud infrastructure management',
  'CloudOps Enterprise is a sophisticated SaaS platform that enables DevOps teams to manage infrastructure across AWS, Azure, and Google Cloud from a single dashboard. Features include automated deployments, cost optimization, and predictive scaling.',
  'CloudOps Inc.',
  'https://cloudops-demo.example.com',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop',
  'Enterprise clients struggled to manage infrastructure across multiple cloud providers, leading to cost overruns and deployment delays. They needed a unified platform with advanced automation and real-time monitoring.',
  'Built a scalable microservices architecture using Node.js and GraphQL, with real-time WebSocket connections for live monitoring. Integrated with major cloud provider APIs for seamless multi-cloud management. Implemented ML-based cost prediction and automated scaling recommendations.',
  'CloudOps Enterprise now serves 2,500+ enterprise clients managing $50M+ in monthly cloud spending. Platform users report 45% reduction in infrastructure costs and 70% faster deployment times. The system monitors 100K+ servers with sub-second latency.',
  1, -- Web Development
  '2023-08-01',
  '2024-03-15',
  '8 months',
  'Enterprise Clients', '2,500+',
  'Cost Reduction', '45%',
  'Servers Monitored', '100K+',
  'Deployment Speed', '+70%',
  1, 1, 2,
  'CloudOps Enterprise SaaS Platform - Hodges & Co. Portfolio',
  'Multi-cloud infrastructure management platform serving 2,500+ enterprise clients worldwide.'
);

-- PROJECT 3: LuxeStyle - Premium Fashion E-Commerce
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, project_url,
  featured_image, thumbnail_image,
  challenge, solution, results,
  category_id, project_date, completion_date, duration,
  metric_1_label, metric_1_value,
  metric_2_label, metric_2_value,
  metric_3_label, metric_3_value,
  metric_4_label, metric_4_value,
  is_featured, is_published, display_order,
  meta_title, meta_description
) VALUES (
  'LuxeStyle - Premium Fashion Marketplace',
  'luxestyle-fashion-marketplace',
  'AI-powered personalized shopping experience for luxury fashion',
  'LuxeStyle revolutionizes online luxury shopping with AR try-ons, AI-powered style recommendations, and white-glove concierge service. The platform connects exclusive designers with discerning customers worldwide.',
  'LuxeStyle Fashion Group',
  'https://luxestyle-demo.example.com',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop',
  'Luxury fashion retailers needed a digital presence that matched their premium brand experience. Traditional e-commerce platforms lacked the sophistication and personalization high-end customers expect.',
  'Created an immersive shopping platform with advanced AR/VR try-on technology, AI-driven personal styling, and seamless checkout. Built custom CMS for editorial content, integrated with global logistics partners, and implemented multi-currency support with real-time exchange rates.',
  'LuxeStyle achieved $10M in sales within the first quarter, with an average order value of $850. The platform boasts 40% repeat purchase rate and 92% customer satisfaction. AR try-on feature increased conversion rates by 145%.',
  5, -- E-Commerce
  '2024-02-01',
  '2024-08-30',
  '7 months',
  'Q1 Revenue', '$10M',
  'Avg Order Value', '$850',
  'Conversion Increase', '+145%',
  'Customer Satisfaction', '92%',
  1, 1, 3,
  'LuxeStyle Premium Fashion E-Commerce - Hodges & Co. Portfolio',
  'AI-powered luxury fashion marketplace with AR try-ons and personalized styling service.'
);

-- PROJECT 4: HealthConnect - Patient Portal & Telemedicine
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, project_url,
  featured_image, thumbnail_image,
  challenge, solution, results,
  category_id, project_date, completion_date, duration,
  metric_1_label, metric_1_value,
  metric_2_label, metric_2_value,
  metric_3_label, metric_3_value,
  metric_4_label, metric_4_value,
  is_featured, is_published, display_order,
  meta_title, meta_description
) VALUES (
  'HealthConnect - Integrated Patient Portal',
  'healthconnect-patient-portal',
  'HIPAA-compliant telemedicine and health records platform',
  'HealthConnect seamlessly connects patients with healthcare providers through secure video consultations, electronic health records, prescription management, and appointment scheduling. Built with patient privacy and data security as top priorities.',
  'HealthConnect Medical Systems',
  'https://healthconnect-demo.example.com',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
  'Healthcare providers struggled with fragmented systems and patients faced difficulties accessing their medical information. The pandemic accelerated the need for reliable telemedicine solutions that comply with stringent healthcare regulations.',
  'Developed a comprehensive healthcare platform with end-to-end encryption, HIPAA-compliant data storage, and intuitive interfaces for both patients and providers. Integrated with major EHR systems, pharmacy networks, and insurance providers. Built real-time video consultation with AI-powered symptom checker.',
  'HealthConnect now serves 150+ healthcare facilities with 500K+ active patients. The platform facilitated 1M+ virtual consultations with 95% patient satisfaction. Reduced patient wait times by 60% and improved care coordination across providers.',
  1, -- Web Development
  '2023-05-01',
  '2024-01-20',
  '9 months',
  'Active Patients', '500K+',
  'Virtual Consultations', '1M+',
  'Wait Time Reduction', '60%',
  'Patient Satisfaction', '95%',
  1, 1, 4,
  'HealthConnect Patient Portal - Hodges & Co. Portfolio',
  'HIPAA-compliant telemedicine platform serving 500K+ patients with secure video consultations.'
);

-- PROJECT 5: PropSphere - Real Estate Intelligence Platform
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, project_url,
  featured_image, thumbnail_image,
  challenge, solution, results,
  category_id, project_date, completion_date, duration,
  metric_1_label, metric_1_value,
  metric_2_label, metric_2_value,
  metric_3_label, metric_3_value,
  metric_4_label, metric_4_value,
  is_featured, is_published, display_order,
  meta_title, meta_description
) VALUES (
  'PropSphere - AI-Powered Real Estate Platform',
  'propsphere-real-estate',
  'Smart property search with predictive market analytics',
  'PropSphere transforms real estate search with AI-driven property recommendations, virtual 3D tours, market trend predictions, and automated valuation models. The platform empowers buyers, sellers, and agents with data-driven insights.',
  'PropSphere Realty Corp',
  'https://propsphere-demo.example.com',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop',
  'Real estate platforms provided basic search functionality but lacked intelligent matching and market insights. Buyers spent months searching properties that didn''t truly match their needs and budget.',
  'Built a sophisticated platform using machine learning to analyze buyer preferences and match properties. Integrated with MLS data feeds, implemented virtual tour technology, and created predictive analytics for property values. Added neighborhood insights, school ratings, and commute calculators.',
  'PropSphere processed $500M in property transactions in its first year. The AI matching algorithm achieved 78% accuracy in predicting buyer-property fit. Average time-to-sale reduced by 40% with 30% more satisfied buyers.',
  1, -- Web Development
  '2023-09-15',
  '2024-05-30',
  '8.5 months',
  'Property Transactions', '$500M',
  'Matching Accuracy', '78%',
  'Time-to-Sale', '-40%',
  'Buyer Satisfaction', '+30%',
  1, 1, 5,
  'PropSphere Real Estate Platform - Hodges & Co. Portfolio',
  'AI-powered real estate platform with predictive analytics and virtual 3D property tours.'
);

-- PROJECT 6: Velocity Dynamics - Brand Transformation
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, project_url,
  featured_image, thumbnail_image,
  challenge, solution, results,
  category_id, project_date, completion_date, duration,
  metric_1_label, metric_1_value,
  metric_2_label, metric_2_value,
  metric_3_label, metric_3_value,
  metric_4_label, metric_4_value,
  is_featured, is_published, display_order,
  meta_title, meta_description
) VALUES (
  'Velocity Dynamics - Complete Brand Overhaul',
  'velocity-dynamics-rebrand',
  'From startup to industry leader through strategic rebranding',
  'Complete brand transformation for a rapidly growing SaaS company, including new visual identity, design system, marketing website, and customer onboarding experience. The rebrand positioned Velocity as an industry innovator.',
  'Velocity Dynamics',
  'https://velocitydynamics-demo.example.com',
  'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=400&fit=crop',
  'Velocity Dynamics had outgrown their startup-phase branding and needed a sophisticated identity to compete with established enterprise players. Their existing brand didn''t reflect their technical excellence and premium positioning.',
  'Conducted comprehensive brand discovery, competitive analysis, and stakeholder workshops. Created a bold, modern visual identity with custom typography and illustration system. Designed and developed a new marketing website with interactive demos, rebuilt their product UI/UX, and created comprehensive brand guidelines.',
  'The rebrand resulted in 120% increase in enterprise leads, 85% improvement in brand recognition, and $5M Series B funding. Customer acquisition costs decreased by 35% while perceived brand value increased 200%.',
  3, -- UI/UX Design
  '2024-01-10',
  '2024-07-15',
  '6 months',
  'Lead Increase', '+120%',
  'Brand Recognition', '+85%',
  'Series B Funding', '$5M',
  'CAC Reduction', '35%',
  1, 1, 6,
  'Velocity Dynamics Brand Transformation - Hodges & Co. Portfolio',
  'Complete brand overhaul resulting in 120% increase in enterprise leads and $5M funding.'
);

-- PROJECT 7: FlavorFusion - Restaurant Ordering Ecosystem
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, project_url,
  featured_image, thumbnail_image,
  challenge, solution, results,
  category_id, project_date, completion_date, duration,
  metric_1_label, metric_1_value,
  metric_2_label, metric_2_value,
  metric_3_label, metric_3_value,
  metric_4_label, metric_4_value,
  is_featured, is_published, display_order,
  meta_title, meta_description
) VALUES (
  'FlavorFusion - Smart Restaurant Platform',
  'flavorfusion-restaurant-platform',
  'Unified ordering, delivery, and kitchen management system',
  'FlavorFusion revolutionizes restaurant operations with integrated mobile ordering, real-time kitchen management, delivery tracking, and customer loyalty programs. The platform serves both individual restaurants and multi-location chains.',
  'FlavorFusion Restaurant Technologies',
  'https://flavorfusion-demo.example.com',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
  'Restaurants juggled multiple third-party platforms, losing margins to commissions and lacking control over customer relationships. They needed an integrated system that would reduce costs while improving customer experience.',
  'Built a comprehensive ecosystem including customer-facing mobile apps (iOS/Android), restaurant POS integration, kitchen display system, delivery driver app, and analytics dashboard. Implemented AI-powered demand forecasting, automated inventory management, and smart menu optimization.',
  'FlavorFusion powers 1,200+ restaurants processing 50K+ daily orders. Restaurants reported 40% reduction in third-party commission fees, 25% increase in average order value, and 90% improvement in order accuracy.',
  2, -- Mobile Apps
  '2023-10-01',
  '2024-06-20',
  '8.5 months',
  'Partner Restaurants', '1,200+',
  'Daily Orders', '50K+',
  'Commission Savings', '40%',
  'Order Accuracy', '+90%',
  1, 1, 7,
  'FlavorFusion Restaurant Platform - Hodges & Co. Portfolio',
  'Smart restaurant ordering ecosystem serving 1,200+ restaurants with 50K+ daily orders.'
);

-- PROJECT 8: EduQuest - Interactive Learning Platform
INSERT OR IGNORE INTO portfolio_projects (
  title, slug, subtitle, description, client_name, project_url,
  featured_image, thumbnail_image,
  challenge, solution, results,
  category_id, project_date, completion_date, duration,
  metric_1_label, metric_1_value,
  metric_2_label, metric_2_value,
  metric_3_label, metric_3_value,
  metric_4_label, metric_4_value,
  is_featured, is_published, display_order,
  meta_title, meta_description
) VALUES (
  'EduQuest - Gamified Learning Platform',
  'eduquest-learning-platform',
  'AI-adaptive education with game mechanics and social learning',
  'EduQuest transforms online education through adaptive AI, gamification, and collaborative learning. Students progress through personalized learning paths while competing in challenges and earning achievements.',
  'EduQuest Global',
  'https://eduquest-demo.example.com',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop',
  'Traditional e-learning platforms suffered from low completion rates and poor engagement. Students lacked motivation and personalized support, leading to knowledge gaps and frustration.',
  'Created an engaging learning platform with AI that adapts to each student''s pace and learning style. Incorporated game mechanics (points, badges, leaderboards), peer collaboration features, and real-time progress tracking. Built interactive exercises, video lessons, and virtual study groups.',
  'EduQuest achieved 250K+ active learners with 75% course completion rate (industry average: 15%). Students demonstrated 40% better knowledge retention and 3x higher engagement. The platform now offers 500+ courses across 20 subjects.',
  1, -- Web Development
  '2023-07-01',
  '2024-04-10',
  '9 months',
  'Active Learners', '250K+',
  'Completion Rate', '75%',
  'Knowledge Retention', '+40%',
  'Available Courses', '500+',
  1, 1, 8,
  'EduQuest Learning Platform - Hodges & Co. Portfolio',
  'Gamified learning platform with 250K+ active students and 75% course completion rate.'
);

-- Link projects to relevant tags
-- FinPay tags
INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT 1, id FROM portfolio_tags WHERE slug IN ('react-native', 'typescript', 'nodejs', 'aws', 'security', 'ai-ml', 'real-time');

-- CloudOps tags
INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT 2, id FROM portfolio_tags WHERE slug IN ('nodejs', 'graphql', 'typescript', 'aws', 'microservices', 'real-time', 'performance');

-- LuxeStyle tags
INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT 3, id FROM portfolio_tags WHERE slug IN ('next-js', 'react', 'e-commerce', 'ai-ml', 'responsive', 'animation', 'api-integration');

-- HealthConnect tags
INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT 4, id FROM portfolio_tags WHERE slug IN ('react', 'nodejs', 'postgresql', 'security', 'real-time', 'api-integration', 'pwa');

-- PropSphere tags
INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT 5, id FROM portfolio_tags WHERE slug IN ('next-js', 'typescript', 'ai-ml', 'postgresql', 'api-integration', 'responsive', 'seo');

-- Velocity Dynamics tags
INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT 6, id FROM portfolio_tags WHERE slug IN ('figma', 'adobe-xd', 'react', 'tailwind-css', 'animation', 'responsive');

-- FlavorFusion tags
INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT 7, id FROM portfolio_tags WHERE slug IN ('react-native', 'flutter', 'nodejs', 'real-time', 'api-integration', 'pwa');

-- EduQuest tags
INSERT OR IGNORE INTO portfolio_project_tags (project_id, tag_id)
SELECT 8, id FROM portfolio_tags WHERE slug IN ('react', 'next-js', 'nodejs', 'ai-ml', 'real-time', 'animation', 'pwa');

-- Add client testimonials for each project
INSERT OR IGNORE INTO portfolio_testimonials (project_id, client_name, client_position, client_company, testimonial, rating, is_featured) VALUES
(1, 'Sarah Mitchell', 'CEO', 'FinPay Technologies', 'Hodges & Co. transformed our vision into a world-class product. Their expertise in mobile development and financial tech security was instrumental in our successful launch. The attention to detail and user experience is outstanding.', 5, 1),

(2, 'Michael Chen', 'CTO', 'CloudOps Inc.', 'Working with Hodges & Co. was a game-changer for our business. They delivered a scalable, enterprise-grade platform that exceeded all expectations. Their technical expertise and project management were exceptional.', 5, 1),

(3, 'Isabella Romano', 'Founder', 'LuxeStyle Fashion Group', 'The team at Hodges & Co. understood our luxury brand perfectly. They created an e-commerce experience that rivals the best in fashion. Our sales have skyrocketed, and customers love the AR try-on feature.', 5, 1),

(4, 'Dr. James Patterson', 'Chief Medical Officer', 'HealthConnect Medical Systems', 'Security and compliance were our top priorities, and Hodges & Co. delivered beyond expectations. The platform has revolutionized how we serve patients. Highly recommended for healthcare technology projects.', 5, 1),

(5, 'Amanda Foster', 'VP of Technology', 'PropSphere Realty Corp', 'The AI-powered property matching has been a game-changer. Hodges & Co. built us a platform that gives us a significant competitive advantage. Their understanding of both tech and real estate is impressive.', 5, 1),

(6, 'David Park', 'CEO', 'Velocity Dynamics', 'The rebrand from Hodges & Co. positioned us perfectly for our Series B raise. The new identity, website, and design system are phenomenal. This investment directly contributed to our $5M funding round.', 5, 1),

(7, 'Carlos Rodriguez', 'COO', 'FlavorFusion Restaurant Technologies', 'Our restaurant partners love the platform Hodges & Co. built. The reduction in third-party fees alone justified the investment. The team''s understanding of restaurant operations was evident throughout.', 5, 1),

(8, 'Dr. Emily Watson', 'Chief Learning Officer', 'EduQuest Global', 'The gamified approach Hodges & Co. implemented has revolutionized online learning. Our completion rates went from 15% to 75%. This platform is making a real difference in students'' lives.', 5, 1);
