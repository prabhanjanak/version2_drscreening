#!/bin/bash

# ==============================================================================
#  Docker One-Command Deployment & Server Update Script
#  Run this script on your server whenever you pull code updates!
# ==============================================================================

set -e

echo ""
echo -e "\033[0;36m========================================================\033[0m"
echo -e "\033[0;36m  Updating Retinopathy Application via Docker...\033[0m"
echo -e "\033[0;36m========================================================\033[0m"
echo ""

# Step 1: Build Docker images
echo -e "\033[0;33m[1/3] Building updated Docker images...\033[0m"
docker compose build

# Step 2: Start / recreate containers in detached background mode
echo -e "\033[0;33m[2/3] Recreating and updating containers...\033[0m"
docker compose up -d

# Step 3: Cleanup old unused Docker layers
echo -e "\033[0;33m[3/3] Pruning unused images...\033[0m"
docker image prune -f

echo ""
echo -e "\033[0;32m========================================================\033[0m"
echo -e "\033[0;32m  Deployment Successful! 🎉\033[0m"
echo -e "\033[0;32m  - Web App: http://localhost:80\033[0m"
echo -e "\033[0;32m  - API Server: http://localhost:5000\033[0m"
echo -e "\033[0;32m========================================================\033[0m"
echo ""
