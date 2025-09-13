# Test script for Customer Health Score deployment
Write-Host "🧪 Testing Customer Health Score Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Function to print colored output
function Print-Status {
    param(
        [bool]$Success,
        [string]$Message
    )
    
    if ($Success) {
        Write-Host "✅ $Message" -ForegroundColor Green
    } else {
        Write-Host "❌ $Message" -ForegroundColor Red
    }
}

# Test 1: Check if Docker is running
Write-Host "1. Checking Docker..."
try {
    docker version | Out-Null
    Print-Status $true "Docker is running"
} catch {
    Print-Status $false "Docker is not running or not installed"
    exit 1
}

# Test 2: Build Docker image
Write-Host "2. Building Docker image..."
try {
    docker build -t customer-health-score . | Out-Null
    Print-Status $true "Docker image built successfully"
} catch {
    Print-Status $false "Docker image build failed"
    exit 1
}

# Test 3: Run Docker container
Write-Host "3. Starting Docker container..."
try {
    $ContainerId = docker run -d -p 8080:8080 customer-health-score
    Print-Status $true "Docker container started"
} catch {
    Print-Status $false "Failed to start Docker container"
    exit 1
}

# Wait for container to start
Write-Host "4. Waiting for application to start..."
Start-Sleep -Seconds 15

# Test 4: Health check
Write-Host "5. Testing health endpoint..."
try {
    $HealthResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing
    if ($HealthResponse.StatusCode -eq 200) {
        Print-Status $true "Health endpoint responding"
    } else {
        Print-Status $false "Health endpoint failed (HTTP $($HealthResponse.StatusCode))"
    }
} catch {
    Print-Status $false "Health endpoint not accessible"
}

# Test 5: Frontend serving
Write-Host "6. Testing frontend serving..."
try {
    $FrontendResponse = Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing
    if ($FrontendResponse.StatusCode -eq 200) {
        Print-Status $true "Frontend serving correctly"
    } else {
        Print-Status $false "Frontend serving failed (HTTP $($FrontendResponse.StatusCode))"
    }
} catch {
    Print-Status $false "Frontend not accessible"
}

# Test 6: API endpoints
Write-Host "7. Testing API endpoints..."
try {
    $CustomersResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/customers" -UseBasicParsing
    $DashboardResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/dashboard/stats" -UseBasicParsing
    
    if ($CustomersResponse.StatusCode -eq 200 -and $DashboardResponse.StatusCode -eq 200) {
        Print-Status $true "API endpoints working"
    } else {
        Print-Status $false "API endpoints failed (Customers: $($CustomersResponse.StatusCode), Dashboard: $($DashboardResponse.StatusCode))"
    }
} catch {
    Print-Status $false "API endpoints not accessible"
}

# Test 7: Database initialization
Write-Host "8. Testing database initialization..."
try {
    $DbDebugResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/debug" -UseBasicParsing
    $DbDebug = ($DbDebugResponse.Content | ConvertFrom-Json).success
    if ($DbDebug -eq $true) {
        Print-Status $true "Database initialized successfully"
    } else {
        Print-Status $false "Database initialization failed"
    }
} catch {
    Print-Status $false "Database debug endpoint not accessible"
}

# Cleanup
Write-Host "9. Cleaning up..."
try {
    docker stop $ContainerId | Out-Null
    docker rm $ContainerId | Out-Null
    Print-Status $true "Container cleaned up"
} catch {
    Print-Status $false "Failed to clean up container"
}

Write-Host ""
Write-Host "🎉 Deployment test completed!" -ForegroundColor Green
Write-Host "If all tests passed, your application is ready for Google Cloud Run deployment." -ForegroundColor Yellow
Write-Host ""
Write-Host "To deploy to Google Cloud Run:" -ForegroundColor Cyan
Write-Host "  npm run deploy" -ForegroundColor White
Write-Host ""
Write-Host "To test locally:" -ForegroundColor Cyan
Write-Host "  npm run docker:run" -ForegroundColor White
