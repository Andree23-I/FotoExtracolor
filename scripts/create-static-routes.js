import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.error('dist/index.html not found');
  process.exit(1);
}

const htmlContent = fs.readFileSync(indexHtml, 'utf-8');

const routes = ['chisiamo', 'servizi', 'portfolio', 'admin'];

routes.forEach((route) => {
  // 1. Create route/index.html (e.g. dist/chisiamo/index.html)
  const routeDir = path.join(distDir, route);
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }
  fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent);

  // 2. Also create route.html directly (e.g. dist/chisiamo.html)
  fs.writeFileSync(path.join(distDir, `${route}.html`), htmlContent);

  console.log(`✓ Generated static files for /${route}`);
});

// Also create 404.html fallback
fs.writeFileSync(path.join(distDir, '404.html'), htmlContent);
console.log('✓ Generated 404.html fallback');
