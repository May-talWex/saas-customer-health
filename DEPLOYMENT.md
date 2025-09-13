# Customer Health Score - Google Cloud Run Deployment Guide

This guide explains how to deploy the Customer Health Score application to Google Cloud Run.

## Architecture Overview

The application consists of:
- **Frontend**: React TypeScript app (served as static files)
- **Backend**: Node.js Express API server
- **Database**: SQLite database (initialized on startup)
- **Deployment**: Single Cloud Run service serving both frontend and backend

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Google Cloud SDK** installed and configured
3. **Docker** installed locally (for testing)
4. **Node.js 18+** and **npm 8+**

## Required APIs

Enable the following APIs in your Google Cloud project:
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Local Development

### 1. Install Dependencies
```bash
# Install all dependencies
npm run install:all

# Or install individually
npm run install:backend
npm run install:frontend
npm run install:database
```

### 2. Run Development Servers
```bash
# Run both frontend and backend
npm run dev

# Or run individually
npm run dev:backend  # Backend on port 8080
npm run dev:frontend # Frontend on port 3000
```

### 3. Test Locally
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api/health
- Dashboard API: http://localhost:8080/api/dashboard/stats

## Docker Testing

### 1. Build Docker Image
```bash
npm run docker:build
```

### 2. Run Docker Container
```bash
npm run docker:run
```

### 3. Test Docker Container
- Application: http://localhost:8080
- Health Check: http://localhost:8080/api/health

## Google Cloud Run Deployment

### Method 1: Using Cloud Build (Recommended)

1. **Trigger Cloud Build**
```bash
npm run deploy
```

2. **Monitor Build Progress**
```bash
gcloud builds list --limit=5
```

3. **View Service URL**
```bash
gcloud run services describe customer-health-score --region=us-central1 --format="value(status.url)"
```

### Method 2: Direct Deployment

1. **Deploy from Source**
```bash
npm run deploy:local
```

2. **Or Deploy with Custom Settings**
```bash
gcloud run deploy customer-health-score \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,PORT=8080,DB_PATH=/tmp/customer_health.db
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `8080` |
| `DB_PATH` | SQLite database path | `/tmp/customer_health.db` |

### Cloud Run Settings

- **Memory**: 1GB
- **CPU**: 1 vCPU
- **Max Instances**: 10
- **Min Instances**: 0 (scale to zero)
- **Concurrency**: 100 requests per instance
- **Timeout**: 300 seconds

## Database

The SQLite database is automatically initialized on startup with:
- 60 sample customers
- Realistic health scores and metrics
- Supporting data (events, features, payments, etc.)

**Note**: Data is ephemeral and will be lost when the container stops. For production, consider using Cloud SQL or another persistent database.

## Monitoring and Logs

### View Logs
```bash
gcloud logs read --service=customer-health-score --limit=50
```

### Monitor Performance
```bash
gcloud run services describe customer-health-score --region=us-central1
```

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check that all dependencies are properly installed
   - Verify Docker is running
   - Check Cloud Build logs: `gcloud builds log [BUILD_ID]`

2. **Service Won't Start**
   - Check environment variables
   - Verify database path is writable
   - Check service logs for errors

3. **Frontend Not Loading**
   - Verify frontend build completed successfully
   - Check that static files are being served correctly
   - Ensure React routing is handled by backend

4. **Database Issues**
   - Verify `/tmp` directory is writable
   - Check database initialization logs
   - Ensure SQLite dependencies are installed

### Debug Endpoints

The application includes several debug endpoints:
- `/api/health` - Basic health check
- `/api/debug` - Database connection and basic info
- `/api/debug/database` - Sample data and health distribution
- `/api/debug/customers` - Customer data with health levels
- `/api/debug/frontend-data` - Frontend API simulation

## Security Considerations

1. **Authentication**: Currently allows unauthenticated access
2. **Database**: SQLite file is stored in `/tmp` (ephemeral)
3. **CORS**: Configured to allow all origins
4. **Helmet**: Security headers are enabled

For production deployment, consider:
- Adding authentication/authorization
- Using a persistent database (Cloud SQL)
- Restricting CORS origins
- Implementing rate limiting
- Adding monitoring and alerting

## Cost Optimization

- **Min Instances**: Set to 0 to scale to zero when not in use
- **Max Instances**: Limit based on expected traffic
- **Memory/CPU**: Right-size based on actual usage
- **Region**: Choose closest to your users

## Next Steps

1. Set up custom domain
2. Configure SSL certificates
3. Implement CI/CD pipeline
4. Add monitoring and alerting
5. Migrate to persistent database
6. Add authentication system
