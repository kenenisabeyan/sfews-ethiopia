#!/usr/bin/env bash
# ========================================================
# SFEWS Production Automated Deployment Script (Linux)
# Zero-Downtime Multi-Container Build & Health Validation
# ========================================================

set -euo pipefail

# Text formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}   ~~~ SFEWS Autonomous Command Center Deployment ~~~   ${NC}"
echo -e "${BLUE}========================================================${NC}"

# 1. Verify Prerequisites
echo -e "\n${YELLOW}[1/5] Checking System Prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker engine is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}ERROR: Docker Compose V2 is required but not found.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker and Docker Compose V2 verified.${NC}"

# 2. Check Environment Variables
echo -e "\n${YELLOW}[2/5] Validating Environment Configurations...${NC}"
if [ ! -f .env.production ] && [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: No .env.production found. Creating from .env.production.example...${NC}"
    cp .env.production.example .env.production
fi

ENV_FILE=".env.production"
if [ ! -f .env.production ]; then
    ENV_FILE=".env"
fi
echo -e "${GREEN}✓ Using environment file: ${ENV_FILE}${NC}"

# 3. Build & Pull Container Images
echo -e "\n${YELLOW}[3/5] Building Production Images (Multi-Stage)...${NC}"
docker compose --env-file "${ENV_FILE}" build --pull

# 4. Deploy Containers
echo -e "\n${YELLOW}[4/5] Launching Production Service Stack...${NC}"
docker compose --env-file "${ENV_FILE}" up -d --remove-orphans

# 5. Health Check Verification
echo -e "\n${YELLOW}[5/5] Awaiting Container Health & Liveness Verification...${NC}"
MAX_RETRIES=20
COUNT=0
HEALTHY=false

while [ $COUNT -lt $MAX_RETRIES ]; do
    BACKEND_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' sfews-backend 2>/dev/null || echo '"starting"')
    FRONTEND_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' sfews-frontend 2>/dev/null || echo '"starting"')
    
    if [ "$BACKEND_STATUS" = '"healthy"' ] && [ "$FRONTEND_STATUS" = '"healthy"' ]; then
        HEALTHY=true
        break
    fi
    
    echo -n "."
    sleep 3
    COUNT=$((COUNT + 1))
done

echo ""
if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}========================================================${NC}"
    echo -e "${GREEN}✓ SFEWS PRODUCTION STACK SUCCESSFULLY DEPLOYED! 🚀${NC}"
    echo -e "${GREEN}========================================================${NC}"
    echo -e "Frontend Console : http://localhost"
    echo -e "Backend API Docs : http://localhost:8000/docs"
    echo -e "Health Diagnostic: http://localhost:8000/api/v1/system/diagnostics"
    echo -e "WebSocket Tunnel : ws://localhost:8000/api/v1/ws/dashboard"
    echo -e "========================================================"
else
    echo -e "${RED}Warning: Containers did not report healthy within timeout.${NC}"
    echo -e "Check logs with: docker compose logs"
fi
