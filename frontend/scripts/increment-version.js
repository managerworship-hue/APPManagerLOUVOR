const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// 1. Path definitions
const versionJsonPath = path.join(projectRoot, 'src', 'version.json');
const packageJsonPath = path.join(projectRoot, 'package.json');
const appJsonPath = path.join(projectRoot, 'app.json');

// Helper to safely parse and increment version "X.Y.Z"
function incrementVersion(versionStr) {
  const parts = versionStr.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return '2.0.0'; // Fallback starting version
  }
  parts[2] += 1; // Increment the patch version
  return parts.join('.');
}

try {
  // 2. Read and update version.json
  let currentVersion = '2.0.0';
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    currentVersion = pkg.version || '2.0.0';
  }

  const nextVersion = incrementVersion(currentVersion);
  
  // Generate build timestamp: DD/MM HH:MM
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const buildTimestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  fs.writeFileSync(
    versionJsonPath, 
    JSON.stringify({ version: nextVersion, build: buildTimestamp }, null, 2) + '\n', 
    'utf8'
  );
  console.log(`📈 App version bumped from ${currentVersion} to ${nextVersion} (Build: ${buildTimestamp})`);

  // 3. Update package.json
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    pkg.version = nextVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated package.json version to ${nextVersion}`);
  }

  // 4. Update app.json
  if (fs.existsSync(appJsonPath)) {
    const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appConfig.expo) {
      appConfig.expo.version = nextVersion;
      fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2) + '\n', 'utf8');
      console.log(`✅ Updated app.json version to ${nextVersion}`);
    }
  }
} catch (error) {
  console.error('❌ Error during version auto-increment:', error);
}
