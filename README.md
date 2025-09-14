# Customer Health Score Dashboard

A comprehensive full-stack application for calculating and monitoring customer health scores in SaaS platforms. This dashboard helps Customer Success teams identify at-risk customers before they churn by analyzing various health indicators and providing actionable insights.

## 🚀 Live Demo

The application is deployed on Google Cloud Run and accessible at: [https://customer-health-score-xxxxx-uc.a.run.app](https://saas-customer-health-956859179570.europe-west1.run.app/)

## �� Features

- **Real-time Health Scoring**: Calculate customer health scores based on multiple factors
- **Interactive Dashboard**: Modern React-based UI with Material-UI components
- **Comprehensive Analytics**: Visualize health trends, customer segments, and risk factors
- **Detailed Customer Views**: Drill down into individual customer health breakdowns
- **API Documentation**: Complete OpenAPI/Swagger documentation
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (SQLite)      │
│   Port: 3000    │    │   Port: 3001    │    │   File-based    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend
- **React 19.1.1** - Modern UI library
- **TypeScript 4.9.5** - Type-safe JavaScript
- **Material-UI 7.3.2** - Component library and theming
- **Recharts 3.2.0** - Data visualization and charts
- **Axios 1.11.0** - HTTP client for API communication

#### Backend
- **Node.js 18+** - Runtime environment
- **Express.js 4.18.2** - Web framework
- **SQLite3 5.1.7** - Lightweight database
- **Swagger/OpenAPI 3.0** - API documentation
- **Jest 29.7.0** - Testing framework

#### DevOps & Deployment
- **Docker** - Containerization
- **Google Cloud Run** - Serverless deployment
- **Google Cloud Build** - CI/CD pipeline
- **Nginx** - Static file serving

## Health Score Calculation

The customer health score is calculated using a weighted algorithm that considers five key factors:

### Scoring Factors & Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| **Login Frequency** | 25% | Active days in the last 30 days (max 5 points per day) |
| **Feature Adoption** | 20% | Number of unique features used (max 15 features) |
| **Support Tickets** | 15% | Penalty system based on ticket volume and priority |
| **Payment Timeliness** | 25% | On-time payment rate with overdue penalties |
| **API Usage** | 15% | API request volume and consistency |

### Health Level Classification

| Score Range | Health Level | Description |
|-------------|--------------|-------------|
| 80-100 | 🟢 **Healthy** | High engagement, low risk |
| 60-79 | 🟡 **At-Risk** | Moderate engagement, monitor closely |
| 40-59 | 🔴 **Critical** | Low engagement, high churn risk |
| 0-39 | 🔴 **Churned** | Very low engagement or inactive |

### Detailed Scoring Logic

#### Login Frequency (25% weight)
```javascript
score = Math.min(activeDays * 5, 100)
```

#### Feature Adoption (20% weight)
```javascript
score = Math.min((usedFeatures / 15) * 100, 100)
```

#### Support Tickets (15% weight)
- Base score: 100
- Penalties:
  - >10 tickets: -30 points
  - >5 tickets: -20 points
  - >2 tickets: -10 points
  - High priority tickets: -5 to -25 points

#### Payment Timeliness (25% weight)
```javascript
onTimeRate = (onTimePayments / totalPayments) * 100
score = onTimeRate - (overduePayments * 5)
```

#### API Usage (15% weight)
- Volume-based scoring (100-5000+ requests)
- Consistency bonus for active days (15-25+ days)

## 🗄️ Database Schema

### Core Tables

#### `customers`
- Customer information and metadata
- Company details, contact info, segment classification

#### `customer_events`
- Login events and user activity tracking
- Timestamped event data for analysis

#### `feature_usage`
- Feature adoption tracking
- Usage counts and last used timestamps

#### `support_tickets`
- Support ticket management
- Priority, status, and resolution tracking

#### `payments`
- Payment history and timeliness
- Due dates, payment status, and amounts

#### `api_usage`
- API consumption metrics
- Daily request counts and patterns

#### `health_scores`
- Calculated health scores and breakdowns
- Historical score tracking

## 🧪 Testing

### Test Coverage
The project maintains comprehensive test coverage at least 80& coverage threshold

### Test Structure

#### Backend Tests (130+ test cases)
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **Service Tests**: Business logic validation
- **Controller Tests**: Request/response handling

#### Frontend Tests
- **Component Tests**: React component testing
- **User Interaction Tests**: UI behavior validation
- **API Integration Tests**: Service layer testing

### Running Tests

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend

# Backend with coverage
cd src/backend && npm run test:coverage
```

##  Getting Started

### Prerequisites
- Node.js 18+ 
- npm 8+
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/customer-health-score.git
cd customer-health-score
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Set up the database**
```bash
cd src/database
npm run setup-realistic
```

4. **Start development servers**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs

### Production Deployment

#### Using Docker
```bash
# Build the image
npm run docker:build

# Run locally
npm run docker:run
```

#### Deploy to Google Cloud Run
```bash
# Deploy using Cloud Build
npm run deploy

# Or deploy directly
npm run deploy:local
```

##  API Documentation

The API is fully documented using OpenAPI 3.0 specification. Access the interactive documentation at:

- **Development**: http://localhost:3001/api-docs
- **Production**: https://your-app-url/api-docs

### Key Endpoints

- `GET /api/health` - Health check
- `GET /api/customers` - List all customers
- `GET /api/customers/:id/health` - Get customer health score
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/trends` - Health trends over time

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `DB_PATH` | Database file path | `/tmp/customer_health.db` |

### Database Configuration

The application uses SQLite for simplicity and portability. For production deployments, consider migrating to PostgreSQL or MySQL for better performance and scalability.

##  Performance

- **Frontend**: Optimized React build with code splitting
- **Backend**: Express.js with efficient SQLite queries
- **Database**: Indexed queries for fast data retrieval
- **Caching**: In-memory caching for frequently accessed data

##  Security

- **CORS**: Configured for cross-origin requests
- **Helmet**: Security headers and protection
- **Input Validation**: Request validation middleware
- **Error Handling**: Centralized error management
- **SQL Injection**: Parameterized queries








