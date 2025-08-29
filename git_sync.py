# -*- coding: utf-8 -*-
"""
git_sync.py
One-file helper that:
  1. Tries to push.
  2. If push is rejected, pulls (--rebase) and interactively resolves any
     add/add or normal text conflicts.
  3. Continues the rebase and pushes again.

Run:  python git_sync.py   (inside your repo)
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path.cwd()
REMOTE = "origin"
BRANCH = "main"


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def run(cmd: str, *, check: bool = True, capture: bool = False):
    """Run shell command and return CompletedProcess."""
    print(">", cmd)
    if capture:
        return subprocess.run(
            cmd, shell=True, check=check, capture_output=True, text=True
        )
    return subprocess.run(cmd, shell=True, check=check)


def has_conflict_markers(text: str) -> bool:
    return "<<<<<<<" in text


def resolve_file(path: Path) -> None:
    """Interactive 3-way resolution for a single file."""
    print(f"\n=== Conflicts in {path} ===")
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)

    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("<<<<<<< "):
            # Find regions
            ours_start = i + 1
            while not lines[i].startswith("======="):
                i += 1
            theirs_start = i + 1
            while not lines[i].startswith(">>>>>>> "):
                i += 1
            theirs_end = i

            # Show user
            print("\n--- YOUR version (above =======) ---")
            print("".join(lines[ours_start : theirs_start - 1]))
            print("\n--- THEIR version (below =======) ---")
            print("".join(lines[theirs_start : theirs_end]))

            choice = ""
            while choice not in {"1", "2", "b"}:
                choice = input("Choose: 1=yours, 2=theirs, b=both: ").strip().lower()

            if choice == "1":
                new_lines.extend(lines[ours_start