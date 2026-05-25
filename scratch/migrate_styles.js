const fs = require('fs');
const path = require('path');

const files = [
  'frontend/app/index.tsx',
  'frontend/app/login.tsx',
  'frontend/app/register.tsx',
  'frontend/app/(tabs)/api-docs.tsx',
  'frontend/app/(tabs)/convidar.tsx',
  'frontend/app/(tabs)/escalas.tsx',
  'frontend/app/(tabs)/index.tsx',
  'frontend/app/(tabs)/membros.tsx',
  'frontend/app/(tabs)/perfil.tsx',
  'frontend/app/(tabs)/repertorio.tsx',
  'frontend/app/(tabs)/_layout.tsx',
  'frontend/app/aviso/novo.tsx',
  'frontend/app/aviso/[id].tsx',
  'frontend/app/escala/nova.tsx',
  'frontend/app/escala/[id].tsx',
  'frontend/app/musica/nova.tsx',
  'frontend/app/musica/[id].tsx',
  'frontend/src/components/DateTimePickerField.tsx'
];

const workspaceRoot = 'c:/Users/l12jo/Documents/GitHub/APPManagerLOUVOR';

files.forEach(fileRel => {
  const filePath = path.join(workspaceRoot, fileRel);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File does not exist: ${fileRel}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already migrated
  if (content.includes('useTheme(') && content.includes('getStyles')) {
    console.log(`⏭️ Already migrated: ${fileRel}`);
    return;
  }

  console.log(`🔄 Migrating: ${fileRel}`);

  // 1. Handle imports
  // Replace: import { colors, ... } from '@/src/theme';
  // with: import { useTheme } from '@/src/context/ThemeContext'; plus the rest of the import
  const importRegex = /import\s*\{\s*colors\s*(?:,\s*([^}]+))?\}\s*from\s*['"]@\/src\/theme['"];?/g;
  content = content.replace(importRegex, (match, otherImports) => {
    let newImport = `import { useTheme } from '@/src/context/ThemeContext';`;
    if (otherImports && otherImports.trim()) {
      newImport += `\nimport { ${otherImports.trim()} } from '@/src/theme';`;
    }
    return newImport;
  });

  // Also replace imports where colors is not first: import { radius, colors, ... }
  const importRegex2 = /import\s*\{\s*([^,]+),\s*colors\s*(?:,\s*([^}]+))?\}\s*from\s*['"]@\/src\/theme['"];?/g;
  content = content.replace(importRegex2, (match, before, after) => {
    let other = before.trim();
    if (after && after.trim()) {
      other += `, ${after.trim()}`;
    }
    return `import { useTheme } from '@/src/context/ThemeContext';\nimport { ${other} } from '@/src/theme';`;
  });

  // If import is just import { colors } from '@/src/theme';
  const importRegex3 = /import\s*\{\s*colors\s*\}\s*from\s*['"]@\/src\/theme['"];?/g;
  content = content.replace(importRegex3, `import { useTheme } from '@/src/context/ThemeContext';`);

  // 2. Convert StyleSheet.create
  content = content.replace(/const styles = StyleSheet\.create\(\{/g, 'const getStyles = (colors: any) => StyleSheet.create({');

  // 3. Inject useTheme and styles instantiation inside functions
  // We want to find exported functions: export default function X() { or export function X() {
  const funcRegex = /(export(?:\s+default)?\s+function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{)/g;
  content = content.replace(funcRegex, (match, header, funcName) => {
    // Special case for layout/provider etc which might not need getStyles
    if (funcName === 'TabsLayout' || funcName === 'RootLayout') {
      return `${header}\n  const { colors } = useTheme();`;
    }
    return `${header}\n  const { colors } = useTheme();\n  const styles = getStyles(colors);`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Completed migrating: ${fileRel}`);
});
