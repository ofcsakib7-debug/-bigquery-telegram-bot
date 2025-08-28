import os
import shutil
from pathlib import Path

def fix_function_accessibility_script():
    """Fix the function accessibility script to use correct module paths"""
    script_path = Path("scripts/test-function-accessibility-clean.js")
    
    if not script_path.exists():
        print("??  Function accessibility script not found")
        return False
    
    print("?? Fixing function accessibility script module paths...")
    
    # Read the current content
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the module paths to remove the leading './'
    # Change './functions/payment' to 'functions/payment'
    # Change './bigquery/cache' to 'bigquery/cache'
    # Change './functions/snooze' to 'functions/snooze'
    
    content = content.replace(
        "const paymentSuccess = testFunction('validateChallanNumbers', './functions/payment', 'validateChallanNumbers', ['CH-2023-1001']);",
        "const paymentSuccess = testFunction('validateChallanNumbers', 'functions/payment', 'validateChallanNumbers', ['CH-2023-1001']);"
    )
    
    content = content.replace(
        "const cacheSuccess = testFunction('generateCacheKey', './bigquery/cache', 'generateCacheKey', ['test', 'user123', 'context']);",
        "const cacheSuccess = testFunction('generateCacheKey', 'bigquery/cache', 'generateCacheKey', ['test', 'user123', 'context']);"
    )
    
    content = content.replace(
        "const snoozeSuccess = testFunction('calculateSnoozeUntil', './functions/snooze', 'calculateSnoozeUntil', ['1h']);",
        "const snoozeSuccess = testFunction('calculateSnoozeUntil', 'functions/snooze', 'calculateSnoozeUntil', ['1h']);"
    )
    
    # Write the fixed content
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("? Function accessibility script module paths fixed")
    return True

def create_consistent_function_script():
    """Create a new function accessibility script consistent with module import script"""
    script_path = Path("scripts/test-function-accessibility-consistent.js")
    
    script_content = '''const testFunction = (functionName, modulePath, functionNameInModule, testArgs) => {
  try {
    const module = require(modulePath);
    
    if (typeof module[functionNameInModule] === 'function') {
      console.log(`? ${functionName} function accessible`);
      
      // Test the function
      const result = module[functionNameInModule](...testArgs);
      
      if (result && typeof result === 'object' && result.toISOString) {
        console.log(`? Function execution result:`, result.toISOString());
      } else {
        console.log(`? Function execution result:`, JSON.stringify(result));
      }
      
      return true;
    } else {
      console.log(`? ${functionName} function not accessible`);
      return false;
    }
  } catch (error) {
    console.log(`? ${functionName} function error:`, error.message);
    return false;
  }
};

// Test all functions
try {
  const paymentSuccess = testFunction('validateChallanNumbers', 'functions/payment', 'validateChallanNumbers', ['CH-2023-1001']);
  const cacheSuccess = testFunction('generateCacheKey', 'bigquery/cache', 'generateCacheKey', ['test', 'user123', 'context']);
  const snoozeSuccess = testFunction('calculateSnoozeUntil', 'functions/snooze', 'calculateSnoozeUntil', ['1h']);

  // Exit with appropriate code
  if (paymentSuccess && cacheSuccess && snoozeSuccess) {
    console.log('? All function accessibility tests successful');
    process.exit(0);
  } else {
    console.log('? Some function accessibility tests failed');
    process.exit(1);
  }
} catch (error) {
  console.log('? Unexpected error during function tests:', error.message);
  process.exit(1);
}
'''
    
    print(f"?? Creating consistent function accessibility script: {script_path}")
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    print("? Consistent function accessibility script created")
    return True

def update_workflow_to_use_consistent_script():
    """Update workflow to use the consistent script"""
    workflow_path = Path(".github/workflows/verify-system.yml")
    
    if not workflow_path.exists():
        print("??  Workflow file not found")
        return False
    
    print("?? Updating workflow to use consistent script...")
    
    # Read the current workflow
    with open(workflow_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the script name
    content = content.replace(
        'timeout 10s node scripts/test-function-accessibility-clean.js || echo "Function accessibility test completed or timed out"',
        'timeout 10s node scripts/test-function-accessibility-consistent.js || echo "Function accessibility test completed or timed out"'
    )
    
    # Write the updated workflow
    with open(workflow_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("? Workflow updated to use consistent script")
    return True

def show_script_content(script_path):
    """Show the content of a script for verification"""
    path = Path(script_path)
    if path.exists():
        print(f"\n?? Content of {script_path}:")
        with open(path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines, 1):
            print(f"   {i:2d}: {line.rstrip()}")
    else:
        print(f"??  Script not found: {script_path}")

def backup_files():
    """Backup important files before modification"""
    files_to_backup = [
        ("scripts/test-function-accessibility-clean.js", "test-function-accessibility-clean.js.backup"),
        (".github/workflows/verify-system.yml", "verify-system.yml.backup")
    ]
    
    for file_path, backup_name in files_to_backup:
        path = Path(file_path)
        backup_path = Path(f"scripts/{backup_name}")
        
        if path.exists():
            print(f"?? Creating backup: {backup_path}")
            shutil.copy2(path, backup_path)
            print(f"? Backup created: {backup_path}")
        else:
            print(f"??  File not found: {file_path}")

def main():
    """Main function"""
    print("?? Fixing function accessibility script module paths...\n")
    
    try:
        backup_files()
        
        # Show current script content for comparison
        print("Current script content:")
        show_script_content("scripts/test-function-accessibility-clean.js")
        
        # Fix the existing script
        fix_applied = fix_function_accessibility_script()
        
        if fix_applied:
            print("\n? Existing script fixed")
        else:
            print("\n??  Existing script fix may not have worked")
        
        # Create a new consistent script
        consistent_created = create_consistent_function_script()
        
        if consistent_created:
            print("? Consistent script created")
            
            # Show the new script content
            print("\nNew consistent script content:")
            show_script_content("scripts/test-function-accessibility-consistent.js")
            
            # Update workflow to use the consistent script
            workflow_updated = update_workflow_to_use_consistent_script()
            
            if workflow_updated:
                print("? Workflow updated")
            else:
                print("??  Workflow update may not have worked")
        else:
            print("??  Consistent script creation failed")
        
        print("\n?? Summary of changes:")
        print("   1. Fixed module paths in existing function accessibility script")
        print("   2. Created new consistent function accessibility script")
        print("   3. Updated workflow to use the consistent script")
        print("   4. Removed leading './' from module paths")
        
        print("\n?? Next steps:")
        print("   1. Commit these changes:")
        print("      git add .")
        print("      git commit -m 'Fix function accessibility script module paths'")
        print("      git push origin main")
        print("   2. Monitor GitHub Actions for successful completion")
        
    except Exception as e:
        print(f"\n? Error: {str(e)}")

if __name__ == "__main__":
    main()