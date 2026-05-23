#!/usr/bin/env bash
set -euo pipefail

echo "## Project"
pwd

echo
echo "## Git status"
git status --short

echo
echo "## Package scripts"
node -e 'const p=require("./package.json"); for (const [k,v] of Object.entries(p.scripts||{})) console.log(`${k}: ${v}`)'

echo
echo "## Source files"
find src -maxdepth 3 -type f | sort

echo
echo "## AI docs"
find docs/ai -maxdepth 5 -type f | sort
