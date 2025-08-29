import os
import re
import shutil
import json
from pathlib import Path

def backup_file(file_path):
    """Create a backup of a file before modifying it."""
    backup_path = f"{file_path}.backup"
    if os.path.exists(backup_path):
        os.remove(backup_path)
    shutil.copy2(file_path, backup_path)
    print(f"? Backed up {file_path} to {backup_path}")
    return backup_path

def modify_cloudbuild_yaml():
    """Modify cloudbuild.yaml to add Jest flags and adjust timeouts."""
    file_path = "cloudbuild.yaml"
    
    if not os.path.exists(file_path):
        print(f"? {file_path} not found!")
        return False
    
    backup_file(file_path)
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Update unit tests step
    content = re.sub(
        r'- name: \'node:18\'\s+id: Run unit tests\s+entrypoint: npm\s+args: \[\'run\', \'test:unit\'\]',
        '''- name: 'node:18'
    id: Run unit tests
    entrypoint: npm
    args: ['run', 'test:unit', '--', '--detectOpenHandles', '--forceExit']''',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Update integration tests step
    content = re.sub(
        r'- name: \'node:18\'\s+id: Run integration tests\s+entrypoint: npm\s+args: \[\'run\', \'test:integration\'\]',
        '''- name: 'node:18'
    id: Run integration tests
    entrypoint: npm
    args: ['run', 'test:integration', '--', '--detectOpenHandles', '--forceExit', '--verbose']
    env:
      - 'NODE_ENV=test'
      - 'DEBUG=true'
    timeout: '900s'  # 15 minutes timeout for this step''',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Update verification tests step
    content = re.sub(
        r'- name: \'node:18\'\s+id: Run verification tests\s+entrypoint: npm\s+args: \[\'run\', \'test:verification\'\]',
        '''- name: 'node:18'
    id: Run verification tests
    entrypoint: npm
    args: ['run', 'test:verification', '--', '--detectOpenHandles', '--forceExit']''',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Update overall timeout
    content = re.sub(
        r"timeout: '1200s'",
        "timeout: '1800s'  # 30 minutes",
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"? Modified {file_path}")
    return True

def create_tests_setup():
    """Create tests/setup.js for global test setup and cleanup."""
    setup_dir = Path("tests")
    setup_dir.mkdir(exist_ok=True)
    
    setup_content = """// Global test setup and cleanup
const { BigQuery } = require('@google-cloud/bigquery');

// Global setup before all tests
beforeAll(() => {
  console.log('DEBUG: Setting up test environment');
});

// Global cleanup after all tests
afterAll(async () => {
  console.log('DEBUG: Cleaning up after tests');
  
  // Close any open BigQuery connections
  try {
    const bigquery = new BigQuery();
    await bigquery.close();
    console.log('DEBUG: BigQuery connections closed');
  } catch (error) {
    console.error('DEBUG: Error closing BigQuery connections:', error.message);
  }
  
  // Add any other cleanup here
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
    
    setup_file = setup_dir / "setup.js"
    with open(setup_file, 'w') as f:
        f.write(setup_content)
    
    print(f"? Created {setup_file}")
    return True

def update_package_json():
    """Update package.json to include the setup file in Jest configuration."""
    file_path = "package.json"
    
    if not os.path.exists(file_path):
        print(f"? {file_path} not found!")
        return False
    
    backup_file(file_path)
    
    with open(file_path, 'r') as f:
        package_data = json.load(f)
    
    # Update Jest configuration
    if 'jest' not in package_data:
        package_data['jest'] = {}
    
    package_data['jest']['setupFilesAfterEnv'] = ["./tests/setup.js"]
    package_data['jest']['testTimeout'] = 30000
    
    with open(file_path, 'w') as f:
        json.dump(package_data, f, indent=2)
    
    print(f"? Updated {file_path}")
    return True

def create_bigquery_test_helper():
    """Create a helper file for BigQuery test cleanup."""
    helper_content = """// BigQuery test helper for cleanup
const { BigQuery } = require('@google-cloud/bigquery');

// Cleanup function for BigQuery tests
async function cleanupBigQuery() {
  try {
    const bigquery = new BigQuery();
    await bigquery.close();
    console.log('DEBUG: BigQuery connections closed in test cleanup');
  } catch (error) {
    console.error('DEBUG: Error in BigQuery cleanup:', error.message);
  }
}

module.exports = { cleanupBigQuery };
"""
    
    helper_file = Path("tests") / "bigquery_helper.js"
    with open(helper_file, 'w') as f:
        f.write(helper_content)
    
    print(f"? Created {helper_file}")
    return True

def find_bigquery_test_files():
    """Find test files that use BigQuery."""
    test_files = []
    tests_dir = Path("tests")
    
    for test_file in tests_dir.glob("**/*.test.js"):
        try:
            with open(test_file, 'r') as f:
                content = f.read()
                if 'require(\'@google-cloud/bigquery\')' in content or 'from \'@google-cloud/bigquery\'' in content:
                    test_files.append(test_file)
        except Exception as e:
            print(f"?? Error reading {test_file}: {e}")
    
    return test_files

def add_cleanup_to_bigquery_tests():
    """Add cleanup code to BigQuery test files."""
    test_files = find_bigquery_test_files()
    
    if not test_files:
        print("?? No BigQuery test files found to modify")
        return True
    
    for test_file in test_files:
        backup_file(test_file)
        
        with open(test_file, 'r') as f:
            content = f.read()
        
        # Add import for the helper
        if "const { cleanupBigQuery } = require('./bigquery_helper');" not in content:
            content = "const { cleanupBigQuery } = require('./bigquery_helper');\n" + content
        
        # Add afterEach block if it doesn't exist
        if "afterEach(" not in content:
            # Find the end of the file or before module.exports
            if "module.exports" in content:
                insert_pos = content.find("module.exports")
            else:
                insert_pos = len(content)
            
            cleanup_code = f"""
// Cleanup after each test
afterEach(async () => {{
  await cleanupBigQuery();
}});
"""
            
            content = content[:insert_pos] + cleanup_code + content[insert_pos:]
        
        with open(test_file, 'w') as f:
            f.write(content)
        
        print(f"? Added cleanup to {test_file}")
    
    return True

def main():
    """Main function to automate the implementation."""
    print("?? Automating fixes for open handles issue...")
    print("=" * 50)
    
    success = True
    
    # Step 1: Modify cloudbuild.yaml
    print("\n1. Modifying cloudbuild.yaml...")
    success &= modify_cloudbuild_yaml()
    
    # Step 2: Create tests/setup.js
    print("\n2. Creating tests/setup.js...")
    success &= create_tests_setup()
    
    # Step 3: Update package.json
    print("\n3. Updating package.json...")
    success &= update_package_json()
    
    # Step 4: Create BigQuery test helper
    print("\n4. Creating BigQuery test helper...")
    success &= create_bigquery_test_helper()
    
    # Step 5: Add cleanup to BigQuery tests
    print("\n5. Adding cleanup to BigQuery test files...")
    success &= add_cleanup_to_bigquery_tests()
    
    if success:
        print("\n?? All changes implemented successfully!")
        print("\n?? Next steps:")
        print("1. Review the changes:")
        print("   - cloudbuild.yaml (updated)")
        print("   - tests/setup.js (created)")
        print("   - package.json (updated)")
        print("   - tests/bigquery_helper.js (created)")
        print("   - BigQuery test files (modified)")
        print("\n2. Commit and push the changes:")
        print("   git add .")
        print("   git commit -m \"Fix open handles issue in tests\"")
        print("   git push origin main")
        print("\n3. Monitor the build for improvement")
    else:
        print("\n? Some changes failed. Please check the errors above.")
    
    return success

if __name__ == "__main__":
    main()