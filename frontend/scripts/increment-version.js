const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// 1. Path definitions
const versionJsonPath = path.join(projectRoot, 'src', 'version.json');
const packageJsonPath = path.join(projectRoot, 'package.json');
const appJsonPath = path.join(projectRoot, 'app.json');

try {
  // 2. Read version from package.json
  let currentVersion = '2.0.13'; // Default fallback
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    currentVersion = pkg.version || '2.0.13';
  }

  // 3. Write version.json (no build timestamp needed)
  fs.writeFileSync(
    versionJsonPath, 
    JSON.stringify({ version: currentVersion }, null, 2) + '\n', 
    'utf8'
  );
  console.log(`📈 Sincronizada versão do app para v${currentVersion}`);

  // 4. Update app.json
  if (fs.existsSync(appJsonPath)) {
    const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appConfig.expo) {
      appConfig.expo.version = currentVersion;
      fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2) + '\n', 'utf8');
      console.log(`✅ Updated app.json version to ${currentVersion}`);
    }
  }
} catch (error) {
  console.error('❌ Error during version synchronization:', error);
}
