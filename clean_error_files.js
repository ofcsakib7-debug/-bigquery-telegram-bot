#!/usr/bin/env node

/**
 * Clean up error-related files to free up memory
 * Since the system is fully tested and working, we can remove error documentation
 */

const fs = require('fs');
const path = require('path');

// List of error-related files to delete
const errorFilesToDelete = [
  'github result/COMPLETE_GITHUB_ACTIONS_ERROR_RESOLUTION.md',
  'github result/FIXES_APPLIED.md',
  'github result/PATH_ERROR_RESOLUTION.md',
  'GITHUB_ERROR_FIX.md',
  'github_error.txt'
];

console.log('=== Cleaning Up Error-Related Files ===\n');

let deletedCount = 0;
errorFilesToDelete.forEach(file => {
  const fullPath = path.join(__dirname, file);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Deleted: ${file}`);
      deletedCount++;
    } else {
      console.log(`⚠️  Not found: ${file}`);
    }
  } catch (error) {
    console.log(`❌ Error deleting ${file}: ${error.message}`);
  }
});

console.log(`\n=== Cleanup Complete ===`);
console.log(`Deleted ${deletedCount} error-related files.`);
console.log('Memory freed up for more important context.');
