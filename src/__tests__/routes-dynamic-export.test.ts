import fs from 'fs';
import path from 'path';

function findFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, pattern));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

describe('Next.js dynamic export declarations', () => {
  const projectRoot = path.resolve(__dirname, '../../');

  it('all API route files should export const dynamic', () => {
    const apiDir = path.join(projectRoot, 'src/app/api');
    const routeFiles = findFiles(apiDir, /^route\.(ts|tsx|js|jsx)$/);

    const authCallbackDir = path.join(projectRoot, 'src/app/auth');
    const authRouteFiles = findFiles(authCallbackDir, /^route\.(ts|tsx|js|jsx)$/);

    const allRouteFiles = [...routeFiles, ...authRouteFiles];

    expect(allRouteFiles.length).toBeGreaterThan(0);

    const missingExport: string[] = [];

    for (const filePath of allRouteFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!/export\s+const\s+dynamic/.test(content)) {
        missingExport.push(path.relative(projectRoot, filePath));
      }
    }

    if (missingExport.length > 0) {
      throw new Error(
        `The following route files are missing 'export const dynamic':\n` +
          missingExport.map((f) => `  - ${f}`).join('\n')
      );
    }
  });

  it('all app page files should export const dynamic', () => {
    const appDir = path.join(projectRoot, 'src/app/(app)');
    const pageFiles = findFiles(appDir, /^page\.(ts|tsx|js|jsx)$/);

    if (pageFiles.length === 0) {
      return;
    }

    const missingExport: string[] = [];

    for (const filePath of pageFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Client components don't use export const dynamic — skip them
      if (/['"]use client['"]/.test(content)) continue;
      if (!/export\s+const\s+dynamic/.test(content)) {
        missingExport.push(path.relative(projectRoot, filePath));
      }
    }

    if (missingExport.length > 0) {
      throw new Error(
        `The following page files are missing 'export const dynamic':\n` +
          missingExport.map((f) => `  - ${f}`).join('\n')
      );
    }
  });
});