-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  author TEXT DEFAULT 'OHWP Studios',
  published INTEGER DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  seo_title TEXT,
  seo_description TEXT,
  tags TEXT
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- Create index on published status
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);

-- Insert sample blog posts
INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, published, published_at, seo_title, seo_description, tags) VALUES
(
  'Getting Started with Web Development in 2025',
  'getting-started-web-development-2025',
  'A comprehensive guide to starting your web development journey in 2025. Learn the essential tools, frameworks, and best practices.',
  '<h2>Introduction</h2><p>Web development in 2025 is more exciting than ever. With new frameworks, tools, and methodologies emerging, there''s never been a better time to start your journey as a web developer.</p><h2>Essential Technologies</h2><p>To succeed in modern web development, you should focus on:</p><ul><li><strong>JavaScript & TypeScript:</strong> The foundation of modern web apps</li><li><strong>React, Vue, or Svelte:</strong> Popular frontend frameworks</li><li><strong>Node.js:</strong> Server-side JavaScript</li><li><strong>Database fundamentals:</strong> SQL and NoSQL databases</li></ul><h2>Best Practices</h2><p>Follow these guidelines for success:</p><ul><li>Write clean, maintainable code</li><li>Use version control (Git)</li><li>Learn responsive design principles</li><li>Focus on web performance</li><li>Prioritize accessibility</li></ul><h2>Next Steps</h2><p>Start building projects! Nothing beats hands-on experience. Create a portfolio website, build a to-do app, or contribute to open source.</p>',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&auto=format&fit=crop',
  1,
  datetime('now', '-7 days'),
  'Getting Started with Web Development in 2025 | OHWP Studios',
  'Learn how to start your web development journey in 2025 with this comprehensive guide covering essential tools, frameworks, and best practices.',
  'web development, programming, JavaScript, React, beginners'
),
(
  'The Future of Mobile App Development',
  'future-mobile-app-development',
  'Explore emerging trends in mobile development including AI integration, cross-platform frameworks, and the rise of super apps.',
  '<h2>The Evolution of Mobile Apps</h2><p>Mobile app development is rapidly evolving with new technologies and user expectations. Here''s what''s shaping the future.</p><h2>Key Trends</h2><h3>1. AI-Powered Apps</h3><p>Artificial intelligence is becoming integral to mobile apps, enabling:</p><ul><li>Personalized user experiences</li><li>Predictive analytics</li><li>Natural language processing</li><li>Computer vision capabilities</li></ul><h3>2. Cross-Platform Development</h3><p>Frameworks like Flutter and React Native are maturing:</p><ul><li>Faster development cycles</li><li>Code reusability across platforms</li><li>Near-native performance</li></ul><h3>3. Super Apps</h3><p>The rise of all-in-one applications that combine multiple services in a single platform.</p><h2>Conclusion</h2><p>The future of mobile development is bright, with technologies that make apps more powerful, accessible, and user-friendly than ever before.</p>',
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&auto=format&fit=crop',
  1,
  datetime('now', '-14 days'),
  'The Future of Mobile App Development | Trends & Predictions',
  'Discover the latest trends shaping mobile app development including AI integration, cross-platform frameworks, and super apps.',
  'mobile development, Flutter, React Native, AI, app trends'
),
(
  'Building Scalable SaaS Applications',
  'building-scalable-saas-applications',
  'Learn the architecture patterns and best practices for building SaaS applications that scale from 10 to 10,000 users.',
  '<h2>SaaS Architecture Fundamentals</h2><p>Building a successful SaaS application requires careful planning and the right architectural decisions from day one.</p><h2>Multi-Tenancy Strategies</h2><h3>Database Per Tenant</h3><p>Each customer gets their own database instance:</p><ul><li>Strong data isolation</li><li>Easy to scale individual customers</li><li>Higher infrastructure costs</li></ul><h3>Shared Database with Row-Level Security</h3><p>All tenants share a database with isolation at the row level:</p><ul><li>Cost-effective</li><li>Easier maintenance</li><li>Requires careful security implementation</li></ul><h2>Essential Features</h2><ul><li>Subscription and billing management</li><li>User roles and permissions</li><li>API rate limiting</li><li>Analytics and reporting</li><li>Automated backups</li></ul><h2>Scaling Considerations</h2><p>Plan for growth by implementing:</p><ul><li>Database read replicas</li><li>Caching layers (Redis, Memcached)</li><li>CDN for static assets</li><li>Horizontal scaling with load balancers</li></ul>',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop',
  1,
  datetime('now', '-21 days'),
  'Building Scalable SaaS Applications | Architecture Guide',
  'Learn how to architect and build scalable SaaS applications with multi-tenancy, subscription management, and growth-ready infrastructure.',
  'SaaS, architecture, multi-tenancy, scalability, cloud'
);
