const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');

// 1. Path definitions
const versionJsonPath = path.join(projectRoot, 'src', 'version.json');
const packageJsonPath = path.join(projectRoot, 'package.json');
const appJsonPath = path.join(projectRoot, 'app.json');

// Helper to get Git commit count
function getGitCommitCount() {
  try {
    // Tentar fazer o "unshallow" se o repositório for raso (muito comum no Render, Vercel, etc.)
    try {
      execSync('git fetch --unshallow', { stdio: 'ignore' });
    } catch (unshallowErr) {
      // Ignora se o repositório já for completo ou se falhar
    }

    const countStr = execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    const count = parseInt(countStr, 10);
    return isNaN(count) ? null : count;
  } catch (e) {
    return null;
  }
}

// Helper to safely parse and calculate version "X.Y.Z"
function calculateVersion(versionStr) {
  const parts = versionStr.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return '2.0.0'; // Fallback starting version
  }

  // Tentar obter o número de commits do Git
  const commitCount = getGitCommitCount();
  if (commitCount !== null && commitCount > 0) {
    parts[2] = commitCount; // Define o patch como o número de commits do Git
    return parts.join('.');
  }

  // Fallback: Apenas incrementa +1 (para desenvolvimento local se git não estiver no path)
  parts[2] += 1;
  return parts.join('.');
}

try {
  // 2. Read and update version.json
  let currentVersion = '2.0.0';
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    currentVersion = pkg.version || '2.0.0';
  }

  const nextVersion = calculateVersion(currentVersion);
  
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
