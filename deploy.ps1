# Agency Website - Deployment Script for Windows
# This script handles deployment to Cloudflare Pages

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment process..." -ForegroundColor Cyan

# Check if wrangler is installed
try {
    wrangler --version | Out-Null
    Write-Host "✅ Wrangler CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

# Step 1: Build
Write-Host "`n📦 Step 1: Building the project..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Database Setup
Write-Host "`n🗄️  Step 2: Setting up database..." -ForegroundColor Blue

# Check if database exists
$dbList = wrangler d1 list 2>&1
if ($dbList -match "agency-db") {
    Write-Host "✅ Database 'agency-db' already exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database not found. Creating..." -ForegroundColor Yellow
    wrangler d1 create agency-db
    Write-Host "✅ Database created!" -ForegroundColor Green
    Write-Host "⚠️  Please update wrangler.toml with the database ID from above" -ForegroundColor Yellow
    Read-Host "Press Enter to continue after updating wrangler.toml"
}

# Step 3: Migrations
Write-Host "`n📝 Step 3: Running database migrations..." -ForegroundColor Blue

if (Test-Path "migrations/001_initial_setup.sql") {
    wrangler d1 execute agency-db --file=migrations/001_initial_setup.sql --remote
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database migrations completed!" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Migration file not found!" -ForegroundColor Red
    exit 1
}

# Step 4: Deploy
Write-Host "`n🌍 Step 4: Deploying to Cloudflare Pages..." -ForegroundColor Blue

wrangler pages deploy dist --project-name=agency-website

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "`n🎉 Your site is now live!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Visit your admin portal at: https://agency-website.pages.dev/admin/login"
    Write-Host "2. Login with: admin / admin123"
    Write-Host "3. ⚠️  IMPORTANT: Change the default password immediately!" -ForegroundColor Yellow
    Write-Host "4. Start managing your content!"
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ Deployment complete!" -ForegroundColor Green

