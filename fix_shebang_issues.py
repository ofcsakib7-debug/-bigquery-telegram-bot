import os
import shutil
from pathlib import Path

def fix_shebang_in_js_files():
    """Remove shebang lines from JavaScript files that cause syntax errors"""
    
    project_root = Path.cwd()
    tests_dir = project_root / "tests"
    
    # Files to fix (add more if needed)
    files_to_fix = [
        "environment_check.js",
        "system_verification.js",
        "github_actions_test.js",
        "test_design6_design7.js",
        "test_imports.js",
        "unified_system_test.js",
        "verify_github_setup.js",
        "verify_github_updates.js"
    ]
    
    for filename in files_to_fix:
        file_path = tests_dir / filename
        
        if not file_path.exists():
            continue
            
        print(f"Processing {file_path}...")
        
        # Read the file content
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Check if first line is a shebang
        if lines and lines[0].startswith('#!'):
            print(f"  Removing shebang line: {lines[0].strip()}")
            # Remove the shebang line
            lines = lines[1:]
            
            # Write back without the shebang
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            print(f"  Fixed {file_path}")
        else:
            print(f"  No shebang found in {file_path}")

def fix_environment_check_specifically():
    """Specific fix for environment_check.js file"""
    
    project_root = Path.cwd()
    env_check_file = project_root / "tests" / "environment_check.js"
    
    if not env_check_file.exists():
        print(f"Warning: {env_check_file} not found")
        return
    
    print(f"Fixing {env_check_file} specifically...")
    
    # Read the file content
    with open(env_check_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove shebang if present
    if content.startswith('#!'):
        # Find the first newline and remove everything before it
        newline_pos = content.find('\n')
        if newline_pos != -1:
            content = content[newline_pos + 1:]
            print("  Removed shebang line")
    
    # Write back the fixed content
    with open(env_check_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  Fixed {env_check_file}")

def create_backup():
    """Create a backup of the tests directory before modifying"""
    project_root = Path.cwd()
    backup_dir = project_root / "backup_before_shebang_fix"
    
    if backup_dir.exists():
        shutil.rmtree(backup_dir)
    
    backup_dir.mkdir()
    
    # Backup the entire tests directory
    tests_dir = project_root / "tests"
    if tests_dir.exists():
        shutil.copytree(tests_dir, backup_dir / "tests")
        print(f"Created backup at: {backup_dir}")

def main():
    """Main function to execute all fixes"""
    print("=== Fixing Shebang Issues in JavaScript Files ===")
    
    # Verify we're in the project root
    if not (Path("tests").exists() and Path(".github").exists()):
        print("Error: Please run this script from the project root directory")
        return False
    
    # Create backup
    create_backup()
    
    # Fix the specific environment_check.js file
    fix_environment_check_specifically()
    
    # Fix all test files with shebang issues
    fix_shebang_in_js_files()
    
    print("\n=== Summary ===")
    print("? Shebang issues fixed!")
    print("\nNext steps:")
    print("1. Commit the changes to your repository")
    print("2. Push to GitHub to trigger the tests again")
    print("3. Verify the tests pass in the GitHub Actions")
    
    return True

if __name__ == "__main__":
    main()