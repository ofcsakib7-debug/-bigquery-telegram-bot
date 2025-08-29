import os
import shutil
from pathlib import Path

def clean_ephemeral_data(project_root):
    """
    Recursively search and remove all EPHEMERAL DATA blocks from project files.
    Creates backup before making changes.
    """
    # Create backup directory
    backup_dir = os.path.join(project_root, "ephemeral_backup")
    os.makedirs(backup_dir, exist_ok=True)
    
    # File extensions to process
    target_extensions = {'.md', '.js', '.sql', '.yml', '.yaml', '.txt', '.py', '.sh', '.env', '.example'}
    
    # Directories to skip
    skip_dirs = {'.git', 'node_modules', 'ephemeral_backup'}
    
    modified_files = []
    total_blocks_removed = 0
    
    print(f"?? Scanning project: {project_root}")
    print(f"?? Backups will be saved to: {backup_dir}\n")
    
    for root, dirs, files in os.walk(project_root):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for file in files:
            file_path = os.path.join(root, file)
            file_ext = os.path.splitext(file)[1].lower()
            
            # Only process target file types
            if file_ext not in target_extensions:
                continue
                
            # Skip backup files
            if "backup" in file_path:
                continue
                
            print(f"?? Processing: {file_path}")
            
            # Create backup
            rel_path = os.path.relpath(file_path, project_root)
            backup_path = os.path.join(backup_dir, rel_path)
            os.makedirs(os.path.dirname(backup_path), exist_ok=True)
            shutil.copy2(file_path, backup_path)
            
            # Process file
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            new_lines = []
            skip_mode = False
            blocks_removed = 0
            
            for line in lines:
                stripped = line.strip()
                
                # Check for ephemeral data marker
                if stripped == "# EPHEMERAL DATA (DISCARD IMMEDIATELY)":
                    skip_mode = True
                    blocks_removed += 1
                    print(f"  ?? Found ephemeral data block at line {len(new_lines) + 1}")
                    continue
                
                # Skip lines while in ephemeral block
                if skip_mode:
                    if stripped.startswith('#') and (stripped.startswith('# -') or stripped.startswith('#   ')):
                        continue  # Skip ephemeral content lines
                    else:
                        skip_mode = False  # End of ephemeral block
                
                new_lines.append(line)
            
            # Write cleaned file if changes were made
            if blocks_removed > 0:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(new_lines)
                modified_files.append(file_path)
                total_blocks_removed += blocks_removed
                print(f"  ? Removed {blocks_removed} ephemeral data blocks\n")
            else:
                print("  ? No ephemeral data found\n")
    
    # Print summary
    print("\n" + "="*60)
    print("?? EPHEMERAL DATA CLEANUP SUMMARY")
    print("="*60)
    print(f"?? Files processed: {len(modified_files)}")
    print(f"??? Total blocks removed: {total_blocks_removed}")
    print(f"?? Backups saved to: {backup_dir}")
    
    if modified_files:
        print("\n?? Modified files:")
        for file in modified_files:
            print(f"  - {file}")
    else:
        print("\n? No ephemeral data found in project")
    
    print("\n?? Backup files are preserved in the ephemeral_backup directory")
    print("?? Review changes before committing to version control")

if __name__ == "__main__":
    # Set your project directory here
    project_directory = r"C:\Users\Reliveo\bigquery_telegram_bot"
    
    if not os.path.exists(project_directory):
        print(f"? Error: Project directory not found: {project_directory}")
    else:
        clean_ephemeral_data(project_directory)