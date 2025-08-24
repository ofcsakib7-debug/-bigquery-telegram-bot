// Simple test to verify CI/CD setup
console.log('=== CI/CD Setup Verification ===');

const fs = require('fs');
const path = require('path');

// Check if cloudbuild.yaml exists
const cloudbuildPath = path.join(__dirname, 'cloudbuild.yaml');
if (fs.existsSync(cloudbuildPath)) {
  console.log('✅ cloudbuild.yaml exists');
} else {
  console.log('❌ cloudbuild.yaml is missing');
}

// Check if package.json exists and has test scripts
try {
  const packageJson = require('./package.json');
  if (packageJson.scripts && packageJson.scripts['test:unit']) {
    console.log('✅ package.json has test scripts');
  } else {
    console.log('❌ package.json is missing test scripts');
  }
} catch (error) {
  console.log('❌ Error reading package.json');
}

// Check if test directories exist
const testDirs = ['tests/unit', 'tests/integration'];
testDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`✅ ${dir} directory exists`);
  } else {
    console.log(`❌ ${dir} directory is missing`);
  }
});

console.log('\nCI/CD setup verification complete!');