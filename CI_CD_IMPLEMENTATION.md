# BigQuery Telegram Bot - CI/CD Implementation Plan

## Overview
This document outlines the implementation of a CI/CD pipeline using Cloud Source Repositories (CSR) and Cloud Build to ensure safe deployments and protect against quota waste.

## Implementation Steps

### 1. Repository Setup
Create a Cloud Source Repository for the project to maintain version control and trigger automated builds.

### 2. Cloud Build Configuration
Create a `cloudbuild.yaml` file that defines the build pipeline with multiple stages:
- Unit testing
- Staging deployment
- Integration testing
- Production deployment

### 3. Environment Separation
Set up separate environments for development, staging, and production to prevent quota consumption in production during testing.

## Cloud Build Configuration

```yaml
# cloudbuild.yaml
steps:
# Step 1: Install dependencies
- name: 'node:18'
  id: 'npm-install'
  entrypoint: 'npm'
  args: ['ci']
  env:
    - 'NODE_ENV=development'

# Step 2: Run unit tests
- name: 'node:18'
  id: 'unit-tests'
  entrypoint: 'npm'
  args: ['run', 'test:unit']
  env:
    - 'NODE_ENV=test'
    - 'GOOGLE_CLOUD_PROJECT=${_TEST_PROJECT_ID}'

# Step 3: Run integration tests
- name: 'node:18'
  id: 'integration-tests'
  entrypoint: 'npm'
  args: ['run', 'test:integration']
  env:
    - 'NODE_ENV=test'
    - 'GOOGLE_CLOUD_PROJECT=${_TEST_PROJECT_ID}'

# Step 4: Deploy to staging (only for dev branch)
- name: 'gcr.io/cloud-builders/gcloud'
  id: 'deploy-staging'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      if [[ "${BRANCH_NAME}" == "dev" ]]; then
        echo "Deploying to staging environment..."
        # Deploy webhook function
        gcloud functions deploy telegramWebhook-staging \
          --runtime nodejs18 \
          --trigger-http \
          --allow-unauthenticated \
          --entry-point telegramWebhook \
          --source functions/ \
          --memory 128MB \
          --timeout 540s \
          --set-env-vars NODE_ENV=staging,GOOGLE_CLOUD_PROJECT=${_STAGING_PROJECT_ID}
        
        # Deploy message processor function
        gcloud functions deploy processMessage-staging \
          --runtime nodejs18 \
          --trigger-topic telegram-messages-staging \
          --entry-point processMessage \
          --source functions/ \
          --memory 256MB \
          --timeout 540s \
          --set-env-vars NODE_ENV=staging,GOOGLE_CLOUD_PROJECT=${_STAGING_PROJECT_ID}
      else
        echo "Not deploying to staging - not on dev branch"
      fi
  waitFor: ['integration-tests']

# Step 5: Deploy to production (only for main branch)
- name: 'gcr.io/cloud-builders/gcloud'
  id: 'deploy-production'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      if [[ "${BRANCH_NAME}" == "main" ]]; then
        echo "Deploying to production environment..."
        # Deploy webhook function
        gcloud functions deploy telegramWebhook \
          --runtime nodejs18 \
          --trigger-http \
          --allow-unauthenticated \
          --entry-point telegramWebhook \
          --source functions/ \
          --memory 128MB \
          --timeout 540s \
          --set-env-vars NODE_ENV=production,GOOGLE_CLOUD_PROJECT=${_PROD_PROJECT_ID}
        
        # Deploy message processor function
        gcloud functions deploy processMessage \
          --runtime nodejs18 \
          --trigger-topic telegram-messages \
          --entry-point processMessage \
          --source functions/ \
          --memory 256MB \
          --timeout 540s \
          --set-env-vars NODE_ENV=production,GOOGLE_CLOUD_PROJECT=${_PROD_PROJECT_ID}
        
        # Deploy scheduled functions
        gcloud functions deploy cleanupCache \
          --runtime nodejs18 \
          --trigger-http \
          --allow-unauthenticated \
          --entry-point cleanupCache \
          --source scheduler/ \
          --memory 128MB \
          --timeout 540s \
          --set-env-vars NODE_ENV=production,GOOGLE_CLOUD_PROJECT=${_PROD_PROJECT_ID}
        
        gcloud functions deploy sendDailyReminders \
          --runtime nodejs18 \
          --trigger-http \
          --allow-unauthenticated \
          --entry-point sendDailyReminders \
          --source workflows/ \
          --memory 128MB \
          --timeout 540s \
          --set-env-vars NODE_ENV=production,GOOGLE_CLOUD_PROJECT=${_PROD_PROJECT_ID}
      else
        echo "Not deploying to production - not on main branch"
      fi
  waitFor: ['unit-tests']

# Step 6: Run post-deployment tests (only for production)
- name: 'node:18'
  id: 'post-deployment-tests'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      if [[ "${BRANCH_NAME}" == "main" ]]; then
        echo "Running post-deployment tests..."
        npm run test:e2e
      else
        echo "Skipping post-deployment tests - not on main branch"
      fi
  env:
    - 'NODE_ENV=production'
    - 'GOOGLE_CLOUD_PROJECT=${_PROD_PROJECT_ID}'
  waitFor: ['deploy-production']

# Define substitutions
substitutions:
  _TEST_PROJECT_ID: your-test-project-id
  _STAGING_PROJECT_ID: your-staging-project-id
  _PROD_PROJECT_ID: your-production-project-id

# Define tags for easier identification
tags:
  - 'telegram-bot'
  - 'bigquery'
  - 'ci-cd'

# Define logs bucket
logsBucket: 'gs://your-build-logs-bucket'

# Define timeout
timeout: 1800s
```

## Environment Configuration

### 1. Test Environment Setup
Create a separate Google Cloud project for testing with its own:
- Firestore database
- BigQuery dataset
- Pub/Sub topics
- Cloud Storage bucket

### 2. Staging Environment Setup
Create a staging environment that mirrors production but with:
- Limited quota allocation
- Separate service accounts
- Different Telegram bot token (for testing)

### 3. Production Environment Setup
Configure the production environment with:
- Full quota allocation
- Production service accounts
- Real Telegram bot token

## Cloud Build Triggers

### 1. Development Branch Trigger
- **Branch**: `dev`
- **Action**: Run unit tests, integration tests, and deploy to staging
- **Purpose**: Safe testing environment without affecting production

### 2. Main Branch Trigger
- **Branch**: `main`
- **Action**: Run unit tests and deploy to production
- **Purpose**: Production deployment with full quality gates

### 3. Pull Request Trigger
- **Event**: Pull request creation/updates
- **Action**: Run unit tests and integration tests
- **Purpose**: Early feedback for code changes

## Quality Gates Implementation

### 1. Unit Test Quality Gate
```bash
# In package.json
"scripts": {
  "test:unit": "jest tests/unit --coverage --maxWorkers=2",
  "test:integration": "jest tests/integration --runInBand",
  "test:e2e": "jest tests/e2e --runInBand"
}
```

### 2. Integration Test Quality Gate
Tests that verify:
- Payment workflow functionality
- Cache system performance
- Snooze functionality
- Error handling mechanisms

### 3. Performance Test Quality Gate
Tests that verify:
- Response times under load
- Memory usage within limits
- Quota consumption tracking

## Quota Protection Mechanisms

### 1. Configuration Consistency
All deployment configurations are defined in `cloudbuild.yaml`:
- Memory allocation (128MB for webhook, 256MB for processor)
- Timeout settings (540s maximum)
- Environment variables
- Trigger configurations

### 2. Automated Testing
Prevents buggy code from reaching production:
- Unit tests catch logic errors
- Integration tests catch system-level issues
- End-to-end tests catch workflow problems

### 3. Environment Isolation
- Test environment quota is separate from production
- Staging environment allows safe load testing
- Production environment is only updated after all tests pass

## Monitoring and Alerting

### 1. Build Status Monitoring
- Email notifications for failed builds
- Slack notifications for production deployments
- Dashboard for build metrics

### 2. Quota Usage Monitoring
- Alerts when quota usage exceeds 80%
- Daily reports on resource consumption
- Trend analysis for capacity planning

### 3. Performance Monitoring
- Response time tracking
- Error rate monitoring
- Resource utilization metrics

## Rollback Procedures

### 1. Automated Rollback
If post-deployment tests fail:
- Automatically rollback to previous version
- Send alert to development team
- Log rollback event for audit

### 2. Manual Rollback
Commands to manually rollback to a specific version:
```bash
# Rollback webhook function
gcloud functions rollback telegramWebhook \
  --project=${PROJECT_ID} \
  --region=${REGION}

# Rollback message processor function
gcloud functions rollback processMessage \
  --project=${PROJECT_ID} \
  --region=${REGION}
```

## Security Considerations

### 1. Service Account Permissions
- Least privilege principle for all service accounts
- Separate service accounts for each environment
- Regular permission audits

### 2. Secret Management
- Use Secret Manager for sensitive configuration
- Environment-specific secrets
- Automatic secret rotation

### 3. Network Security
- VPC Service Controls for production
- Private service access where possible
- Firewall rules for function access

## Implementation Timeline

### Phase 1: Repository and Basic CI (Week 1)
- Set up Cloud Source Repository
- Create basic cloudbuild.yaml
- Implement unit test pipeline

### Phase 2: Environment Setup (Week 2)
- Create test and staging projects
- Configure separate environments
- Implement integration tests

### Phase 3: Full CD Pipeline (Week 3)
- Implement staging deployment
- Implement production deployment
- Set up monitoring and alerting

### Phase 4: Optimization (Week 4)
- Performance testing and optimization
- Security hardening
- Documentation and training

## Benefits Summary

### Direct Quota Protection
1. **Prevents Catastrophic Failures**: Bad deployments can't consume all quota instantly
2. **Optimizes Resource Usage**: Performance improvements are safely deployed
3. **Ensures Configuration Consistency**: Eliminates human error in deployment settings

### Indirect Efficiency Gains
1. **Faster Development**: Automated testing reduces manual QA time
2. **Higher Quality**: Multiple quality gates catch issues early
3. **Safer Experiments**: Staging environment allows aggressive optimization testing
4. **Better Reliability**: Consistent deployments reduce production issues

This CI/CD implementation will ensure that the BigQuery Telegram Bot system remains reliable, efficient, and within free tier limits as it grows in complexity.