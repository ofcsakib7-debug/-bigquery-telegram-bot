import os
import re
from pathlib import Path

def fix_unified_system_test():
    """Fix the unified_system_test.js file to exit properly and provide detailed results"""
    
    project_root = Path.cwd()
    test_file = project_root / "tests" / "unified_system_test.js"
    
    # Define the fixed content for the test file
    fixed_content = '''const path = require('path');

console.log('=== Unified System Integration Test ===');

// Get the project root directory
const projectRoot = path.join(__dirname, '..');

// Track test results
const results = {
  passed: 0,
  failed: 0,
  details: []
};

// Helper function to test a module
function testModule(name, modulePath, requiredFunction = null) {
  try {
    // Clear any module cache to ensure fresh import
    delete require.cache[require.resolve(path.join(projectRoot, modulePath))];
    
    const module = require(path.join(projectRoot, modulePath));
    
    if (requiredFunction && typeof module[requiredFunction] !== 'function') {
      results.failed++;
      results.details.push(`? ${name} module loaded but ${requiredFunction} missing`);
      return false;
    }
    
    results.passed++;
    results.details.push(`? ${name} module loaded` + (requiredFunction ? ` and ${requiredFunction} available` : ''));
    return true;
  } catch (error) {
    results.failed++;
    results.details.push(`? Cannot import ${name}: ${error.message}`);
    return false;
  }
}

// Test all modules
testModule('Payment', 'functions/payment', 'validateChallanNumbers');
testModule('Snooze', 'functions/snooze', 'calculateSnoozeUntil');
testModule('Cache', 'bigquery/cache', 'generateCacheKey');
testModule('Search validation', 'functions/search_validation', 'validate_search_query');
testModule('Error detection', 'functions/error_detection', 'detectLogicalError');
testModule('Admin management', 'functions/admin_management');
testModule('Contextual actions', 'functions/contextual_actions');
testModule('Multi input processor', 'functions/multi_input_processor');
testModule('Department validations', 'functions/department_validations');
testModule('Quota saving', 'bigquery/quota_saving');
testModule('Scheduled queries', 'bigquery/scheduled_queries');
testModule('Design 8 schemas', 'bigquery/design8_schemas');
testModule('Design 9 schemas', 'bigquery/design9_schemas');
testModule('Design 10 schemas', 'bigquery/design10_schemas');
testModule('Design 11 schemas', 'bigquery/design11_schemas');
testModule('Design 12 schemas', 'bigquery/design12_schemas');

// Print all details
results.details.forEach(detail => console.log(detail));

// Print summary
console.log('\\n=== Unified System Test Summary ===');
console.log(`Overall Status: ${results.failed === 0 ? '? ALL TESTS PASSED' : '? ISSUES FOUND'}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Total: ${results.passed + results.failed}`);

// Force exit after a short delay to ensure all output is flushed
setTimeout(() => {
  process.exit(results.failed === 0 ? 0 : 1);
}, 100);
'''
    
    # Write the fixed content to the test file
    with open(test_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print(f"Fixed test file: {test_file}")

def fix_github_workflow():
    """Update the GitHub Actions workflow to set the working directory"""
    
    project_root = Path.cwd()
    workflow_file = project_root / ".github" / "workflows" / "verify-system.yml"
    
    if not workflow_file.exists():
        print(f"Warning: Workflow file not found at {workflow_file}")
        return
    
    # Read the current workflow content
    with open(workflow_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match the unified system test step
    pattern = r"(- name: Run unified system integration test\n  run:.*?\n)(  working-directory:.*\n)?"
    
    # Replacement with working directory
    replacement = r"\1  working-directory: ${{ github.workspace }}\n"
    
    # Apply the replacement
    fixed_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Write the fixed content back
    with open(workflow_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print(f"Fixed workflow file: {workflow_file}")

def create_backup():
    """Create a backup of important files before modifying"""
    project_root = Path.cwd()
    backup_dir = project_root / "backup_before_fix"
    
    if backup_dir.exists():
        import shutil
        shutil.rmtree(backup_dir)
    
    backup_dir.mkdir()
    
    # Backup test file
    test_file = project_root / "tests" / "unified_system_test.js"
    if test_file.exists():
        backup_file = backup_dir / "unified_system_test.js"
        backup_file.write_text(test_file.read_text(encoding='utf-8'), encoding='utf-8')
        print(f"Backed up: {test_file} -> {backup_file}")
    
    # Backup workflow file
    workflow_file = project_root / ".github" / "workflows" / "verify-system.yml"
    if workflow_file.exists():
        backup_file = backup_dir / "verify-system.yml"
        backup_file.write_text(workflow_file.read_text(encoding='utf-8'), encoding='utf-8')
        print(f"Backed up: {workflow_file} -> {backup_file}")

def run_test():
    """Run the test to verify the fix"""
    import subprocess
    import sys
    
    print("\nRunning the test to verify the fix...")
    try:
        result = subprocess.run(
            ["node", "tests/unified_system_test.js"],
            cwd=Path.cwd(),
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print("Test output:")
        print(result.stdout)
        
        if result.stderr:
            print("Test errors:")
            print(result.stderr)
        
        print(f"Test exit code: {result.returncode}")
        
        if result.returncode == 0:
            print("? Test passed!")
        else:
            print("? Test failed!")
            
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("? Test timed out!")
        return False
    except Exception as e:
        print(f"? Error running test: {e}")
        return False

def main():
    """Main function to execute all fixes"""
    print("=== Fixing Unified System Test ===")
    
    # Verify we're in the project root
    if not (Path("tests").exists() and Path(".github").exists()):
        print("Error: Please run this script from the project root directory")
        return False
    
    # Create backup
    create_backup()
    
    # Fix the test file
    fix_unified_system_test()
    
    # Fix the workflow file
    fix_github_workflow()
    
    # Run the test to verify
    test_passed = run_test()
    
    print("\n=== Summary ===")
    if test_passed:
        print("? All fixes applied successfully!")
        print("\nNext steps:")
        print("1. Commit the changes to your repository")
        print("2. Push to GitHub to trigger the tests again")
        print("3. Verify the tests pass in the GitHub Actions")
    else:
        print("? Test still failing. Please check the output above.")
    
    return test_passed

if __name__ == "__main__":
    main()