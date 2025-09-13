#!/bin/bash

# Test script for Customer Health Score deployment
echo "🧪 Testing Customer Health Score Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Test 1: Check if Docker is running
echo "1. Checking Docker..."
docker version > /dev/null 2>&1
print_status $? "Docker is running"

# Test 2: Build Docker image
echo "2. Building Docker image..."
docker build -t customer-health-score . > /dev/null 2>&1
print_status $? "Docker image built successfully"

# Test 3: Run Docker container
echo "3. Starting Docker container..."
CONTAINER_ID=$(docker run -d -p 8080:8080 customer-health-score)
print_status $? "Docker container started"

# Wait for container to start
echo "4. Waiting for application to start..."
sleep 10

# Test 4: Health check
echo "5. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    print_status 0 "Health endpoint responding"
else
    print_status 1 "Health endpoint failed (HTTP $HEALTH_RESPONSE)"
fi

# Test 5: Frontend serving
echo "6. Testing frontend serving..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    print_status 0 "Frontend serving correctly"
else
    print_status 1 "Frontend serving failed (HTTP $FRONTEND_RESPONSE)"
fi

# Test 6: API endpoints
echo "7. Testing API endpoints..."
CUSTOMERS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/customers)
DASHBOARD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/dashboard/stats)

if [ "$CUSTOMERS_RESPONSE" = "200" ] && [ "$DASHBOARD_RESPONSE" = "200" ]; then
    print_status 0 "API endpoints working"
else
    print_status 1 "API endpoints failed (Customers: $CUSTOMERS_RESPONSE, Dashboard: $DASHBOARD_RESPONSE)"
fi

# Test 7: Database initialization
echo "8. Testing database initialization..."
DB_DEBUG=$(curl -s http://localhost:8080/api/debug | grep -o '"success":[^,]*' | cut -d':' -f2)
if [ "$DB_DEBUG" = "true" ]; then
    print_status 0 "Database initialized successfully"
else
    print_status 1 "Database initialization failed"
fi

# Cleanup
echo "9. Cleaning up..."
docker stop $CONTAINER_ID > /dev/null 2>&1
docker rm $CONTAINER_ID > /dev/null 2>&1
print_status 0 "Container cleaned up"

echo ""
echo "🎉 Deployment test completed!"
echo "If all tests passed, your application is ready for Google Cloud Run deployment."
echo ""
echo "To deploy to Google Cloud Run:"
echo "  npm run deploy"
echo ""
echo "To test locally:"
echo "  npm run docker:run"
