import os
import re
import shutil
from pathlib import Path

def backup_file(file_path):
    """Create a backup of a file before modifying it."""
    backup_path = f"{file_path}.backup"
    if os.path.exists(backup_path):
        os.remove(backup_path)
    shutil.copy2(file_path, backup_path)
    print(f"? Backed up {file_path} to {backup_path}")
    return backup_path

def fix_tests_setup():
    """Fix tests/setup.js to handle BigQuery cleanup properly."""
    file_path = "tests/setup.js"
    
    if not os.path.exists(file_path):
        print(f"? {file_path} not found!")
        return False
    
    backup_file(file_path)
    
    new_content = """// Global test setup and cleanup

// Store original setInterval and setTimeout to restore later
const originalSetInterval = global.setInterval;
const originalSetTimeout = global.setTimeout;

// Track all intervals and timeouts
const intervals = new Set();
const timeouts = new Set();

// Override setInterval to track intervals
global.setInterval = (callback, delay, ...args) => {
  const id = originalSetInterval(callback, delay, ...args);
  intervals.add(id);
  return id;
};

// Override setTimeout to track timeouts
global.setTimeout = (callback, delay, ...args) => {
  const id = originalSetTimeout(callback, delay, ...args);
  timeouts.add(id);
  return id;
};

// Global setup before all tests
beforeAll(() => {
  console.log('DEBUG: Setting up test environment');
});

// Global cleanup after all tests
afterAll(async () => {
  console.log('DEBUG: Cleaning up after tests');
  
  // Clear all intervals
  intervals.forEach(id => {
    clearInterval(id);
    console.log('DEBUG: Cleared interval');
  });
  intervals.clear();
  
  // Clear all timeouts
  timeouts.forEach(id => {
    clearTimeout(id);
    console.log('DEBUG: Cleared timeout');
  });
  timeouts.clear();
  
  // Restore original functions
  global.setInterval = originalSetInterval;
  global.setTimeout = originalSetTimeout;
  
  console.log('DEBUG: All timers cleared');
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
"""
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    print(f"? Fixed {file_path}")
    return True

def fix_bigquery_helper_imports():
    """Fix the import path for bigquery_helper in test files."""
    test_files = [
        "tests/unit/microbatching.test.js",
        "tests/unit/cache.test.js"
    ]
    
    for file_path in test_files:
        if not os.path.exists(file_path):
            print(f"?? {file_path} not found, skipping")
            continue
        
        backup_file(file_path)
        
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Fix the import path
        content = content.replace(
            "const { cleanupBigQuery } = require('./bigquery_helper');",
            "const { cleanupBigQuery } = require('../bigquery_helper');"
        )
        
        with open(file_path, 'w') as f:
            f.write(content)
        
        print(f"? Fixed import in {file_path}")
    
    return True

def fix_bigquery_helper():
    """Update bigquery_helper.js to remove the non-existent close method."""
    file_path = "tests/bigquery_helper.js"
    
    if not os.path.exists(file_path):
        print(f"? {file_path} not found!")
        return False
    
    backup_file(file_path)
    
    new_content = """// BigQuery test helper for cleanup

// Cleanup function for BigQuery tests
async function cleanupBigQuery() {
  console.log('DEBUG: BigQuery cleanup called');
  // Note: BigQuery client doesn't have a close method in the version we're using
  // The main cleanup is handled by clearing timers in setup.js
}

module.exports = { cleanupBigQuery };
"""
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    print(f"? Fixed {file_path}")
    return True

def add_microbatching_cleanup():
    """Add specific cleanup for microbatching timers."""
    file_path = "tests/unit/microbatching.test.js"
    
    if not os.path.exists(file_path):
        print(f"? {file_path} not found!")
        return False
    
    backup_file(file_path)
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Add cleanup for microbatching specific timers
    cleanup_code = """
// Clean up microbatching timers
afterEach(() => {
  // Clear any remaining intervals
  const highestId = setInterval(() => {}, 0);
  for (let i = 0; i < highestId; i++) {
    clearInterval(i);
  }
});
"""
    
    # Insert before any existing afterEach or at the end of the file
    if "afterEach(" in content:
        # Insert before the first afterEach
        pos = content.find("afterEach(")
        content = content[:pos] + cleanup_code + content[pos:]
    else:
        # Add at the end
        content += cleanup_code
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"? Added microbatching cleanup to {file_path}")
    return True

def main():
    """Main function to fix all issues."""
    print("?? Fixing test issues...")
    print("=" * 40)
    
    success = True
    
    # Step 1: Fix tests/setup.js
    print("\n1. Fixing tests/setup.js...")
    success &= fix_tests_setup()
    
    # Step 2: Fix bigquery_helper imports
    print("\n2. Fixing bigquery_helper imports...")
    success &= fix_bigquery_helper_imports()
    
    # Step 3: Fix bigquery_helper.js
    print("\n3. Fixing bigquery_helper.js...")
    success &= fix_bigquery_helper()
    
    # Step 4: Add microbatching cleanup
    print("\n4. Adding microbatching cleanup...")
    success &= add_microbatching_cleanup()
    
    if success:
        print("\n?? All issues fixed!")
        print("\n?? Next steps:")
        print("1. Commit and push the changes:")
        print("   git add .")
        print("   git commit -m \"Fix test cleanup and timer issues\"")
        print("   git push origin main")
        print("\n2. Monitor the build for improvement")
        print("3. Look for:")
        print("   - DEBUG: Cleared interval/timeout messages")
        print("   - No open handles detected by Jest")
    else:
        print("\n? Some fixes failed. Please check the errors above.")
    
    return success

if __name__ == "__main__":
    main()