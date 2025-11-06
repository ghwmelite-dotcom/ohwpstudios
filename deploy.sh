#!/bin/bash

# Agency Website - Deployment Script
# This script handles deployment to Cloudflare Pages

set -e  # Exit on error

echo "🚀 Starting deployment process..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found!${NC}"
    echo "Install it with: npm install -g wrangler"
    exit 1
fi

echo -e "${BLUE}📦 Step 1: Building the project...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${BLUE}🗄️  Step 2: Setting up database...${NC}"

# Check if database needs to be created
echo "Checking database status..."

# Try to list databases
if wrangler d1 list | grep -q "agency-db"; then
    echo -e "${GREEN}✅ Database 'agency-db' already exists${NC}"
else
    echo -e "${YELLOW}⚠️  Database not found. Creating...${NC}"
    wrangler d1 create agency-db
    echo -e "${GREEN}✅ Database created!${NC}"
    echo -e "${YELLOW}⚠️  Please update wrangler.toml with the database ID from above${NC}"
    read -p "Press enter to continue after updating wrangler.toml..."
fi

echo -e "${BLUE}📝 Step 3: Running database migrations...${NC}"

# Run migrations
if [ -f "migrations/001_initial_setup.sql" ]; then
    wrangler d1 execute agency-db --file=migrations/001_initial_setup.sql --remote
    echo -e "${GREEN}✅ Database migrations completed!${NC}"
else
    echo -e "${RED}❌ Migration file not found!${NC}"
    exit 1
fi

echo -e "${BLUE}🌍 Step 4: Deploying to Cloudflare Pages...${NC}"

# Deploy to Pages
wrangler pages deploy dist --project-name=agency-website

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo -e "${GREEN}🎉 Your site is now live!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Visit your admin portal at: https://your-site.pages.dev/admin/login"
    echo "2. Login with: admin / admin123"
    echo "3. ⚠️  IMPORTANT: Change the default password immediately!"
    echo "4. Start managing your content!"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✨ Deployment complete!${NC}"

