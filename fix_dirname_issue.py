import os
import shutil
from pathlib import Path

def fix_existing_scripts():
    """Fix the existing scripts by removing the redundant __dirname declarations"""
    scripts_to_fix = [
        ("scripts/test-module-imports.js", "module import"),
        ("scripts/test-function-accessibility.js", "function accessibility")
    ]
    
    for script_path, script_name in scripts_to_fix:
        path = Path(script_path)
        if not path.exists():
            print(f"??  {script_name} script not found: {script_path}")
            continue
        
        print(f"?? Fixing {script_name} script: {script_path}")
        
        # Read the current content
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove the redundant __dirname declaration
        # Replace: const __dirname = path.dirname(__filename);
        # With nothing (since __dirname is already available)
        content = content.replace('const __dirname = path.dirname(__filename);\n', '')
        
        # Also fix the projectRoot line to use the built-in __dirname directly
        content = content.replace('const projectRoot = path.join(__dirname, \'..\');', 
                                 'const projectRoot = path.join(__dirname, \'..\');')
        
        # Write the fixed content
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"? {script_name} script fixed")

def verify_scripts_fixed():
    """Verify that the scripts no longer have redundant __dirname declarations"""
    print("\n?? Verifying scripts are fixed...")
    
    scripts_to_check = [
        ("scripts/test-module-imports.js", "module import"),
        ("scripts/test-function-accessibility.js", "function accessibility")
    ]
    
    all_fixed = True
    
    for script_path, script_name in scripts_to_check:
        path = Path(script_path)
        if not path.exists():
            print(f"? {script_name} script not found: {script_path}")
            all_fixed = False
            continue
        
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for the problematic line
        if 'const __dirname = path.dirname(__filename);' in content:
            print(f"? {script_name} script still has redundant __dirname declaration")
            all_fixed = False
        else:
            print(f"? {script_name} script no longer has redundant __dirname declaration")
        
        # Check that path is still required (since we need it for projectRoot)
        if "const path = require('path');" in content:
            print(f"? {script_name} script still requires path module")
        else:
            print(f"??  {script_name} script might be missing path require")
    
    return all_fixed

def backup_scripts():
    """Create backups of the scripts before modifying them"""
    scripts_to_backup = [
        ("scripts/test-module-imports.js", "test-module-imports.js.backup"),
        ("scripts/test-function-accessibility.js", "test-function-accessibility.js.backup")
    ]
    
    for script_path, backup_name in scripts_to_backup:
        path = Path(script_path)
        backup_path = Path(f"scripts/{backup_name}")
        
        if path.exists():
            print(f"?? Creating backup: {backup_path}")
            shutil.copy2(path, backup_path)
            print(f"? Backup created: {backup_path}")
        else:
            print(f"??  Script not found, skipping backup: {script_path}")

def show_script_content(script_path):
    """Show the content of a script for debugging"""
    path = Path(script_path)
    if path.exists():
        print(f"\n?? Content of {script_path}:")
        with open(path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines, 1):
            print(f"   {i:2d}: {line.rstrip()}")
    else:
        print(f"??  Script not found: {script_path}")

def main():
    """Main function"""
    print("?? Fixing __dirname redeclaration issue in test scripts...\n")
    
    try:
        backup_scripts()
        fix_existing_scripts()
        
        all_fixed = verify_scripts_fixed()
        
        if all_fixed:
            print("\n? All scripts fixed successfully!")
            print("\n?? What was fixed:")
            print("   - Removed redundant 'const __dirname = path.dirname(__filename);' declarations")
            print("   - Kept the built-in __dirname variable provided by Node.js")
            print("   - Maintained proper path resolution using the built-in __dirname")
            
            print("\n?? Next steps:")
            print("   1. Commit these changes:")
            print("      git add scripts/")
            print("      git commit -m 'Fix __dirname redeclaration in test scripts'")
            print("      git push origin main")
            print("   2. Monitor GitHub Actions for successful completion")
        else:
            print("\n??  Some scripts may not have been fixed correctly")
            print("   Showing current script contents for debugging:")
            show_script_content("scripts/test-module-imports.js")
            show_script_content("scripts/test-function-accessibility.js")
        
    except Exception as e:
        print(f"\n? Error: {str(e)}")

if __name__ == "__main__":
    main()