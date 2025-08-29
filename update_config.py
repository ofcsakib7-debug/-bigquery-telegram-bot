#!/usr/bin/env python3
"""
Cloud Functions Configuration Update Script
Updates configuration files for Node.js 20 and 2nd gen functions
"""

import os
import subprocess
import json
import yaml
import sys
from pathlib import Path

def run_command(command, check=True, capture_output=True):
    """Run a shell command and handle errors"""
    print(f"Running: {' '.join(command)}")
    try:
        result = subprocess.run(
            command,
            check=check,
            capture_output=capture_output,
            text=True
        )
        if result.stdout:
            print(result.stdout)
        return result
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {' '.join(command)}")
        print(f"Return code: {e.returncode}")
        if e.stdout:
            print("STDOUT:", e.stdout)
        if e.stderr:
            print("STDERR:", e.stderr)
        if check:
            sys.exit(1)
        return e

def update_package_json():
    """Update package.json to use Node.js 20"""
    print("\n=== Updating package.json ===")
    package_path = Path("package.json")
    
    if not package_path.exists():
        print("Warning: package.json not found")
        return False
    
    with open(package_path, 'r', encoding='utf-8') as f:
        package_data = json.load(f)
    
    changes_made = False
    
    # Update Node.js version in engines
    if "engines" in package_data and "node" in package_data["engines"]:
        if package_data["engines"]["node"].startswith("18"):
            package_data["engines"]["node"] = ">=20.0.0"
            print("Updated Node.js version to >=20.0.0")
            changes_made = True
    
    # Update any Node.js 18 references in scripts
    if "scripts" in package_data:
        for script_name, script in package_data["scripts"].items():
            if "nodejs18" in script:
                package_data["scripts"][script_name] = script.replace("nodejs18", "nodejs20")
                print(f"Updated script {script_name} to use nodejs20")
                changes_made = True
    
    if changes_made:
        with open(package_path, 'w', encoding='utf-8') as f:
            json.dump(package_data, f, indent=2)
        print("package.json updated successfully")
        return True
    else:
        print("No changes needed for package.json")
        return False

def update_cloudbuild_yaml():
    """Update cloudbuild.yaml for Node.js 20 and 2nd gen functions"""
    print("\n=== Updating cloudbuild.yaml ===")
    cloudbuild_path = Path("cloudbuild.yaml")
    
    if not cloudbuild_path.exists():
        print("Warning: cloudbuild.yaml not found")
        return False
    
    with open(cloudbuild_path, 'r', encoding='utf-8') as f:
        cloudbuild_data = yaml.safe_load(f)
    
    changes_made = False
    
    # Update deployment steps
    if "steps" in cloudbuild_data:
        for step in cloudbuild_data["steps"]:
            if step.get("name") == "gcr.io/google.com/cloudsdktool/cloud-sdk":
                args = step.get("args", [])
                original_args = args.copy()
                
                # Update runtime from nodejs18 to nodejs20
                for i, arg in enumerate(args):
                    if arg == "--runtime=nodejs18":
                        args[i] = "--runtime=nodejs20"
                        print("Updated runtime to nodejs20")
                        changes_made = True
                    elif arg == "--no-gen2":
                        # Remove --no-gen2 flag if present
                        args.remove(arg)
                        print("Removed --no-gen2 flag")
                        changes_made = True
                
                # Ensure --gen2 flag is present
                if "--gen2" not in args:
                    args.append("--gen2")
                    print("Added --gen2 flag")
                    changes_made = True
                
                # Ensure --allow-unauthenticated is present
                if "--allow-unauthenticated" not in args:
                    args.append("--allow-unauthenticated")
                    print("Added --allow-unauthenticated flag")
                    changes_made = True
                
                step["args"] = args
    
    # Update Node.js version in CI steps
    if "steps" in cloudbuild_data:
        for step in cloudbuild_data["steps"]:
            if step.get("name") == "node" and "node-version" in step:
                if step["node-version"] == "18.x":
                    step["node-version"] = "20.x"
                    print("Updated Node.js version to 20.x in CI step")
                    changes_made = True
    
    if changes_made:
        with open(cloudbuild_path, 'w', encoding='utf-8') as f:
            yaml.dump(cloudbuild_data, f, default_flow_style=False)
        print("cloudbuild.yaml updated successfully")
        return True
    else:
        print("No changes needed for cloudbuild.yaml")
        return False

def update_github_workflows():
    """Update GitHub workflows to use Node.js 20"""
    print("\n=== Updating GitHub Workflows ===")
    workflows_dir = Path(".github/workflows")
    
    if not workflows_dir.exists():
        print("Warning: .github/workflows directory not found")
        return False
    
    changes_made = False
    
    for workflow_file in workflows_dir.glob("*.yml"):
        print(f"Updating {workflow_file.name}...")
        
        # Try different encodings to handle special characters
        encodings = ['utf-8', 'latin1', 'cp1252']
        workflow_data = None
        
        for encoding in encodings:
            try:
                with open(workflow_file, 'r', encoding=encoding) as f:
                    workflow_data = yaml.safe_load(f)
                break
            except UnicodeDecodeError:
                continue
        
        if workflow_data is None:
            print(f"Warning: Could not read {workflow_file.name} with any encoding")
            continue
        
        # Update Node.js version in matrix
        if "jobs" in workflow_data:
            for job_name, job in workflow_data["jobs"].items():
                if "strategy" in job and "matrix" in job["strategy"]:
                    matrix = job["strategy"]["matrix"]
                    if "node-version" in matrix:
                        for i, version in enumerate(matrix["node-version"]):
                            if version == "18.x":
                                matrix["node-version"][i] = "20.x"
                                print(f"Updated Node.js version to 20.x in {job_name}")
                                changes_made = True
        
        with open(workflow_file, 'w', encoding='utf-8') as f:
            yaml.dump(workflow_data, f, default_flow_style=False)
    
    if changes_made:
        print("GitHub workflows updated successfully")
        return True
    else:
        print("No changes needed for GitHub workflows")
        return False

def commit_and_push_changes():
    """Commit and push all changes to repository"""
    print("\n=== Committing and Pushing Changes ===")
    
    # Check if we're in a git repository
    if not Path(".git").exists():
        print("Not in a git repository. Skipping commit and push.")
        return False
    
    # Add all changes
    run_command(["git", "add", "."])
    
    # Check if there are changes to commit
    status = run_command(["git", "status", "--porcelain"], check=False)
    if not status.stdout.strip():
        print("No changes to commit")
        return False
    
    # Commit changes
    run_command([
        "git", "commit", "-m",
        "Update to Node.js 20 and fix Cloud Functions deployment configuration"
    ])
    
    # Push changes
    run_command(["git", "push", "origin", "main"])
    print("Changes committed and pushed successfully")
    return True

def main():
    """Main function to execute configuration updates"""
    print("Cloud Functions Configuration Update Script")
    print("=========================================")
    
    changes_made = False
    
    # Execute configuration updates
    try:
        if update_package_json():
            changes_made = True
        
        if update_cloudbuild_yaml():
            changes_made = True
        
        if update_github_workflows():
            changes_made = True
        
        if changes_made:
            commit_and_push_changes()
            
            print("\n=== Configuration Updates Completed ===")
            print("Configuration files have been updated and pushed to repository.")
            print("\nNext steps:")
            print("1. Ensure you've manually enabled required APIs")
            print("2. Ensure you've manually granted IAM roles")
            print("3. Wait for the CI/CD pipeline to complete")
            print("4. Check the Cloud Function deployment status in Google Cloud Console")
            print("5. Test your Telegram bot functionality")
        else:
            print("\nNo configuration updates were needed")
        
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()