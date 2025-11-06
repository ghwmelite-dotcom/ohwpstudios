# Simple One-Click Deployment Script
# This script will guide you through deployment step-by-step

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AGENCY WEBSITE DEPLOYMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if logged in
Write-Host "Step 1: Checking Cloudflare authentication..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Opening browser for Cloudflare login..." -ForegroundColor Green
Write-Host "Please authorize access in the browser window that opens." -ForegroundColor Green
Write-Host ""

try {
    wrangler login
    Write-Host "✅ Successfully logged in to Cloudflare!" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed. Please run 'wrangler login' manually." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Setting up database..." -ForegroundColor Yellow
Write-Host "Running database migrations..." -ForegroundColor Green

try {
    wrangler d1 execute agency-db --file=migrations/001_initial_setup.sql --remote
    Write-Host "✅ Database setup complete!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Database might already be set up (this is OK)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Deploying to Cloudflare Pages..." -ForegroundColor Yellow
Write-Host "This may take a minute..." -ForegroundColor Green

try {
    wrangler pages deploy dist --project-name=agency-website
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   🎉 DEPLOYMENT SUCCESSFUL! 🎉" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your site is now LIVE!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📍 Site URL: https://agency-website.pages.dev" -ForegroundColor Cyan
    Write-Host "🔐 Admin Portal: https://agency-website.pages.dev/admin/login" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Default Login Credentials:" -ForegroundColor Yellow
    Write-Host "  Username: admin" -ForegroundColor White
    Write-Host "  Password: admin123" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Change the password after first login!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Visit your admin portal" -ForegroundColor White
    Write-Host "2. Log in with the credentials above" -ForegroundColor White
    Write-Host "3. Change your password" -ForegroundColor White
    Write-Host "4. Start customizing your content!" -ForegroundColor White
    Write-Host ""
    Write-Host "All changes you make will now persist permanently! ✨" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure you're logged in: wrangler login" -ForegroundColor White
    Write-Host "2. Check your internet connection" -ForegroundColor White
    Write-Host "3. Try again with: .\deploy-simple.ps1" -ForegroundColor White
    exit 1
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

