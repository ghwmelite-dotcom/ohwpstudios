# PWA Icons

This directory should contain PWA icons in the following sizes:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons

### Option 1: Use the Icon Generator (Quick)
1. Open `scripts/generate-pwa-icons.html` in a browser
2. Click "Generate Icons"
3. Download each icon and save it to this directory

### Option 2: Use a PWA Icon Generator Online
- Visit: https://www.pwabuilder.com/imageGenerator
- Upload your logo
- Download all sizes
- Place them in this directory

### Option 3: Use ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Then convert your source icon:

magick convert logo.png -resize 72x72 icon-72x72.png
magick convert logo.png -resize 96x96 icon-96x96.png
magick convert logo.png -resize 128x128 icon-128x128.png
magick convert logo.png -resize 144x144 icon-144x144.png
magick convert logo.png -resize 152x152 icon-152x152.png
magick convert logo.png -resize 192x192 icon-192x192.png
magick convert logo.png -resize 384x384 icon-384x384.png
magick convert logo.png -resize 512x512 icon-512x512.png
```

## Icon Guidelines

- Use a square source image (1024x1024 recommended)
- PNG format with transparency
- Include safe area padding (10-15%)
- Use high contrast for visibility
- Consider both light and dark themes
