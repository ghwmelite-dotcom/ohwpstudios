import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Categories and their directories
const categories = [
  { dir: 'services', tag: 'Services, Web Development, Software' },
  { dir: 'industries', tag: 'Industries, Software Development, Business' },
  { dir: 'solutions', tag: 'Solutions, Business, Technology' },
  { dir: 'technologies', tag: 'Technologies, Programming, Development' }
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
function createSlug(category, filename) {
  return `${category}-${filename.replace('.astro', '')}`;
}

// Function to extract sections content from Astro file
function extractSections(fileContent) {
  const sectionsMatch = fileContent.match(/const sections = \[([\s\S]*?)\];/);
  if (!sectionsMatch) return [];

  const sectionsStr = sectionsMatch[1];
  const sectionObjects = [];

  // Extract each section
  const sectionMatches = sectionsStr.matchAll(/\{[\s\S]*?title:\s*['"`](.*?)['"`][\s\S]*?content:\s*`([\s\S]*?)`[\s\S]*?\}/g);

  for (const match of sectionMatches) {
    sectionObjects.push({
      title: match[1],
      content: match[2].trim()
    });
  }

  return sectionObjects;
}

// Function to extract SEO metadata
function extractSEOMetadata(fileContent) {
  const metadata = {};

  // Extract title
  const titleMatch = fileContent.match(/title="([^"]+)"/);
  if (titleMatch) metadata.seoTitle = titleMatch[1];

  // Extract description
  const descMatch = fileContent.match(/description="([^"]+)"/);
  if (descMatch) metadata.description = descMatch[1];

  // Extract heroTitle
  const heroTitleMatch = fileContent.match(/heroTitle="([^"]+)"/);
  if (heroTitleMatch) metadata.heroTitle = heroTitleMatch[1];

  // Extract heroSubtitle
  const heroSubMatch = fileContent.match(/heroSubtitle="([^"]+)"/);
  if (heroSubMatch) metadata.heroSubtitle = heroSubMatch[1];

  return metadata;
}

// Function to create blog post content from sections
function createBlogContent(sections, metadata) {
  let html = '';

  // Add hero/introduction
  if (metadata.heroSubtitle) {
    html += `<p class="lead"><strong>${metadata.heroSubtitle}</strong></p>\n\n`;
  }

  // Add sections
  sections.forEach(section => {
    html += `<h2>${section.title}</h2>\n`;
    html += `${section.content}\n\n`;
  });

  return html;
}

// Function to create excerpt
function createExcerpt(content, description) {
  if (description) {
    return description.substring(0, 200);
  }

  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.substring(0, 200) + '...';
}

// Function to escape SQL strings
function escapeSQLString(str) {
  if (!str) return 'NULL';
  return "'" + str.replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

// Main function to generate blog posts SQL
function generateBlogPostsSQL() {
  const sqlStatements = [];
  const now = new Date().toISOString();
  let count = 0;

  categories.forEach(category => {
    const dirPath = join(__dirname, '..', 'src', 'pages', category.dir);

    try {
      const files = readdirSync(dirPath).filter(f => f.endsWith('.astro'));

      files.forEach(file => {
        const filePath = join(dirPath, file);
        const fileContent = readFileSync(filePath, 'utf-8');

        const title = formatTitle(file);
        const slug = createSlug(category.dir, file);
        const sections = extractSections(fileContent);
        const metadata = extractSEOMetadata(fileContent);

        const content = createBlogContent(sections, metadata);
        const excerpt = createExcerpt(content, metadata.description);
        const seoTitle = metadata.seoTitle || `${title} | OHWP Studios`;
        const seoDescription = metadata.description || excerpt;
        const tags = category.tag;

        const sql = `INSERT INTO blog_posts (title, slug, excerpt, content, author, published, published_at, seo_title, seo_description, tags, created_at, updated_at)
VALUES (
  ${escapeSQLString(title)},
  ${escapeSQLString(slug)},
  ${escapeSQLString(excerpt)},
  ${escapeSQLString(content)},
  'OHWP Studios',
  1,
  ${escapeSQLString(now)},
  ${escapeSQLString(seoTitle)},
  ${escapeSQLString(seoDescription)},
  ${escapeSQLString(tags)},
  ${escapeSQLString(now)},
  ${escapeSQLString(now)}
);`;

        sqlStatements.push(sql);
        count++;
      });
    } catch (error) {
      console.error(`Error processing ${category.dir}:`, error.message);
    }
  });

  return {
    sql: sqlStatements.join('\n\n'),
    count
  };
}

// Generate and print SQL
try {
  const { sql, count } = generateBlogPostsSQL();
  console.log('-- SQL statements to insert blog posts from SEO pages\n');
  console.log(sql);
  console.log(`\n-- Total: ${count} blog posts created`);
} catch (error) {
  console.error('Error generating blog posts:', error);
  process.exit(1);
}
