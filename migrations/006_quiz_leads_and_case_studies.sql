-- Migration: Quiz Leads and Case Studies Tables
-- Created: 2025-01-10
-- Description: Create tables for storing quiz lead data and case studies

-- Quiz Leads Table
CREATE TABLE IF NOT EXISTS quiz_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  goal TEXT,
  platform TEXT,
  audience TEXT,
  timeline TEXT,
  features TEXT,
  budget TEXT,
  involvement TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  contacted BOOLEAN DEFAULT 0,
  contacted_at DATETIME,
  notes TEXT
);

-- Case Studies Table
CREATE TABLE IF NOT EXISTS case_studies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  challenge TEXT NOT NULL,
  solution TEXT NOT NULL,
  results TEXT NOT NULL,
  tech_stack TEXT NOT NULL,
  project_duration TEXT NOT NULL,
  team_size INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  metrics TEXT,  -- JSON string of key metrics
  testimonial TEXT,
  testimonial_author TEXT,
  testimonial_role TEXT,
  featured BOOLEAN DEFAULT 0,
  published BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample case studies
INSERT INTO case_studies (
  title,
  client_name,
  industry,
  challenge,
  solution,
  results,
  tech_stack,
  project_duration,
  team_size,
  image_url,
  metrics,
  testimonial,
  testimonial_author,
  testimonial_role,
  featured
) VALUES (
  'E-Commerce Platform for Fashion Retailer',
  'StyleHub',
  'E-Commerce',
  'Legacy system couldn''t handle growing traffic and lacked modern features like personalized recommendations, wishlist, and advanced search.',
  'Built a scalable headless commerce platform with React frontend, Node.js backend, and PostgreSQL database. Implemented AI-powered product recommendations and real-time inventory management.',
  '300% increase in conversions, 50% faster page loads, 95% customer satisfaction rate. Reduced cart abandonment by 40% and increased average order value by 25%.',
  'Next.js, Node.js, PostgreSQL, Redis, AWS',
  '4 months',
  5,
  '/images/case-study-ecommerce.svg',
  '{"conversion":"+300%","speed":"50% faster","satisfaction":"95%"}',
  'OHWP Studios transformed our business. The new platform is lightning fast and our customers love the personalized shopping experience. Sales have tripled since launch!',
  'Sarah Johnson',
  'CEO, StyleHub',
  1
), (
  'Healthcare Patient Management System',
  'MediCare Plus',
  'Healthcare',
  'Manual processes and disconnected systems causing delays in patient care. Staff spending 40% of their time on paperwork instead of patient interaction.',
  'Developed HIPAA-compliant patient management system with real-time updates, automated appointment scheduling, electronic health records, and secure messaging between staff and patients.',
  '60% reduction in administrative time, 40% faster patient processing, improved care quality scores by 35%. Staff now spend 75% of time on patient care.',
  'React, Python, Django, PostgreSQL, Docker',
  '6 months',
  6,
  '/images/case-study-healthcare.svg',
  '{"efficiency":"+60%","processing":"40% faster","uptime":"99.9%"}',
  'The system has revolutionized how we manage patient care. It''s intuitive, powerful, and has dramatically improved our operational efficiency. Our staff loves it and our patients are receiving better care.',
  'Dr. Michael Chen',
  'Medical Director, MediCare Plus',
  1
), (
  'FinTech Mobile Banking App',
  'NeoBank',
  'FinTech',
  'Traditional banking experience not meeting digital-first customer expectations. Needed a modern mobile app to compete with challenger banks and retain younger customers.',
  'Created modern mobile banking app with AI-powered insights, instant transfers, bill pay, savings goals, and intuitive money management tools. Built with React Native for iOS and Android.',
  '500K downloads in 3 months, 4.8/5 app store rating, 70% user retention rate. 90% of transactions now happen on mobile. Customer acquisition cost reduced by 50%.',
  'React Native, Node.js, MongoDB, AWS Lambda',
  '5 months',
  7,
  '/images/case-study-fintech.svg',
  '{"downloads":"500K+","rating":"4.8/5","retention":"70%"}',
  'Our customers love the app and it''s become our primary channel for customer engagement. OHWP Studios delivered beyond our expectations and helped us compete with the big players.',
  'James Miller',
  'CTO, NeoBank',
  1
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_leads_email ON quiz_leads(email);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_created_at ON quiz_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_case_studies_industry ON case_studies(industry);
CREATE INDEX IF NOT EXISTS idx_case_studies_featured ON case_studies(featured);
CREATE INDEX IF NOT EXISTS idx_case_studies_published ON case_studies(published);
