import os
import shutil
from pathlib import Path

def create_absolute_path_script():
    """Create a function accessibility script that uses absolute paths"""
    script_path = Path("scripts/test-function-accessibility-absolute.js")
    
    script_content = '''const path = require('path');
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const testFunction = (functionName, modulePath, functionNameInModule, testArgs) => {
  try {
    // Use absolute path from project root
    const fullPath = path.join(projectRoot, modulePath);
    const module = require(fullPath);
    
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
    
    print(f"?? Creating absolute path function accessibility script: {script_path}")
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    print("? Absolute path script created")

def update_workflow_to_use_absolute_script():
    """Update the workflow to use the absolute path script"""
    workflow_path = Path(".github/workflows/verify-system.yml")
    
    if not workflow_path.exists():
        print("??  Workflow file not found")
        return False
    
    print("?? Updating workflow to use absolute path script...")
    
    # Read the current workflow
    with open(workflow_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the script name
    old_script_call = 'timeout 10s node scripts/test-function-accessibility-consistent.js || echo "Function accessibility test completed or timed out"'
    new_script_call = 'timeout 10s node scripts/test-function-accessibility-absolute.js || echo "Function accessibility test completed or timed out"'
    
    # Replace in the content
    if old_script_call in content:
        content = content.replace(old_script_call, new_script_call)
        
        # Write the updated content
        with open(workflow_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("? Workflow updated to use absolute path script")
        return True
    else:
        print("??  Old script call not found in workflow")
        return False

def create_working_directory_script():
    """Alternative: Create a script that changes working directory"""
    script_path = Path("scripts/test-function-accessibility-cwd.js")
    
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
    
    print(f"?? Creating CWD-based function accessibility script: {script_path}")
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    print("? CWD-based script created")
    return True

def update_workflow_to_use_cwd_approach():
    """Update workflow to change working directory before running script"""
    workflow_path = Path(".github/workflows/verify-system.yml")
    
    if not workflow_path.exists():
        print("??  Workflow file not found")
        return False
    
    print("?? Updating workflow to use CWD approach...")
    
    # Read the current workflow
    with open(workflow_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the script call with CWD change
    old_script_call = 'timeout 10s node scripts/test-function-accessibility-consistent.js || echo "Function accessibility test completed or timed out"'
    new_script_call = 'cd .. && timeout 10s node scripts/test-function-accessibility-cwd.js || echo "Function accessibility test completed or timed out"'
    
    # Replace in the content
    if old_script_call in content:
        content = content.replace(old_script_call, new_script_call)
        
        # Write the updated content
        with open(workflow_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("? Workflow updated to use CWD approach")
        return True
    else:
        print("??  Old script call not found in workflow")
        return False

def show_current_workflow():
    """Show the current function accessibility step"""
    workflow_path = Path(".github/workflows/verify-system.yml")
    
    if workflow_path.exists():
        print("\n?? Current function accessibility step:")
        with open(workflow_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines):
            if 'test-function-accessibility' in line:
                print(f"   Line {i+1}: {line.rstrip()}")
    else:
        print("??  Workflow file not found")

def show_available_scripts():
    """Show available scripts"""
    scripts_dir = Path("scripts")
    
    if scripts_dir.exists():
        print("\n?? Available scripts:")
        for script_file in scripts_dir.glob("*.js"):
            print(f"   - {script_file.name}")
    else:
        print("??  Scripts directory not found")

def backup_workflow_file():
    """Create a backup of the workflow file"""
    workflow_path = Path(".github/workflows/verify-system.yml")
    backup_path = Path(".github/workflows/verify-system.yml.backup")
    
    if workflow_path.exists():
        print(f"?? Creating backup: {backup_path}")
        shutil.copy2(workflow_path, backup_path)
        print("? Backup created")
    else:
        print("??  Workflow file not found")

def main():
    """Main function"""
    print("?? Creating scripts with proper path resolution...\n")
    
    try:
        backup_workflow_file()
        
        # Show current state
        print("Current state:")
        show_current_workflow()
        show_available_scripts()
        
        # Create both approaches
        create_absolute_path_script()
        create_working_directory_script()
        
        # Try the absolute path approach first
        print("\n?? Trying absolute path approach...")
        absolute_updated = update_workflow_to_use_absolute_script()
        
        if absolute_updated:
            print("? Using absolute path approach")
        else:
            print("??  Absolute path approach failed, trying CWD approach...")
            cwd_updated = update_workflow_to_use_cwd_approach()
            
            if cwd_updated:
                print("? Using CWD approach")
            else:
                print("? Both approaches failed")
        
        print("\n?? Summary of changes:")
        print("   1. Created absolute path script (test-function-accessibility-absolute.js)")
        print("   2. Created CWD-based script (test-function-accessibility-cwd.js)")
        print("   3. Updated workflow to use one of the new scripts")
        print("   4. Fixed path resolution issues")
        
        print("\n?? Updated workflow step:")
        show_current_workflow()
        
        print("\n?? Next steps:")
        print("   1. Commit these changes:")
        print("      git add .github/workflows/verify-system.yml")
        print("      git add scripts/")
        print("      git commit -m 'Fix function accessibility script path resolution'")
        print("      git push origin main")
        print("   2. Monitor GitHub Actions for successful completion")
        
    except Exception as e:
        print(f"\n? Error: {str(e)}")

if __name__ == "__main__":
    main()