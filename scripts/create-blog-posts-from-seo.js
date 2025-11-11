import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Categories and their directories
const categories = [
  { dir: 'services', tag: 'Services, Web Development' },
  { dir: 'industries', tag: 'Industries, Software Development' },
  { dir: 'solutions', tag: 'Solutions, Business' },
  { dir: 'technologies', tag: 'Technologies, Programming' }
];

// Function to extract title from filename
function formatTitle(filename) {
  return filename
    .replace('.astro', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Function to create slug from filename
function createSlug(filename) {
  return filename.replace('.astro', '');
}

// Function to extract content from Astro file
function extractContent(fileContent) {
  // Remove frontmatter
  const withoutFrontmatter = fileContent.replace(/^---[\s\S]*?---/, '');

  // Extract text content from HTML/Astro markup
  let content = withoutFrontmatter
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Create structured HTML content
  const sections = content.split(/(?=\b(?:What|Why|How|Benefits|Features|Process|Our|Key)\b)/);
  let htmlContent = '';

  sections.forEach((section, index) => {
    const trimmed = section.trim();
    if (trimmed.length > 50) {
      if (index === 0) {
        htmlContent += `<p>${trimmed.substring(0, 500)}...</p>`;
      } else {
        // Try to find section heading
        const headingMatch = trimmed.match(/^([^.!?]{10,60})/);
        if (headingMatch) {
          htmlContent += `<h2>${headingMatch[1]}</h2>`;
          htmlContent += `<p>${trimmed.substring(headingMatch[1].length).trim()}</p>`;
        } else {
          htmlContent += `<p>${trimmed}</p>`;
        }
      }
    }
  });

  return htmlContent || `<p>${content.substring(0, 1000)}...</p>`;
}

// Function to create excerpt
function createExcerpt(content) {
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.substring(0, 200) + '...';
}

// Main function to generate blog posts SQL
function generateBlogPostsSQL() {
  const sqlStatements = [];
  const now = new Date().toISOString();

  categories.forEach(category => {
    const dirPath = join(__dirname, '..', 'src', 'pages', category.dir);
    const files = readdirSync(dirPath).filter(f => f.endsWith('.astro'));

    files.forEach(file => {
      const filePath = join(dirPath, file);
      const fileContent = readFileSync(filePath, 'utf-8');

      const title = formatTitle(file);
      const slug = `${category.dir}-${createSlug(file)}`;
      const content = extractContent(fileContent);
      const excerpt = createExcerpt(content);
      const seoTitle = `${title} | OHWP Studios`;
      const seoDescription = excerpt;
      const tags = category.tag;

      const sql = `INSERT INTO blog_posts (title, slug, excerpt, content, author, published, published_at, seo_title, seo_description, tags, created_at, updated_at)
VALUES (
  ${JSON.stringify(title)},
  ${JSON.stringify(slug)},
  ${JSON.stringify(excerpt)},
  ${JSON.stringify(content)},
  'OHWP Studios',
  1,
  ${JSON.stringify(now)},
  ${JSON.stringify(seoTitle)},
  ${JSON.stringify(seoDescription)},
  ${JSON.stringify(tags)},
  ${JSON.stringify(now)},
  ${JSON.stringify(now)}
);`;

      sqlStatements.push(sql);
    });
  });

  return sqlStatements.join('\n\n');
}

// Generate and print SQL
try {
  const sql = generateBlogPostsSQL();
  console.log('-- SQL statements to insert blog posts from SEO pages\n');
  console.log(sql);
  console.log(`\n-- Total: ${sql.split('INSERT INTO').length - 1} blog posts`);
} catch (error) {
  console.error('Error generating blog posts:', error);
  process.exit(1);
}
