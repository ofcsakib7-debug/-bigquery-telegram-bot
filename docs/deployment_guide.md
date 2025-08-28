# === PHASE COMPLETION MARKER - DO NOT MODIFY ===
# Design: Deployment
# Phase: 1
# Component: deployment_guide
# Status: COMPLETED
# Last Modified: 2025-08-28 14:00 UTC
# Next Step: System deployment
# =============================================

# BigQuery Telegram Bot System - Deployment Guide

## Prerequisites

Before deploying the system, ensure you have:

1. **Google Cloud Account** with billing enabled
2. **Project Created** in Google Cloud Console
3. **Required APIs Enabled**:
   - Cloud Functions API
   - Cloud Pub/Sub API
   - BigQuery API
   - Firestore API
   - Cloud Scheduler API
   - Cloud KMS API
   - Secret Manager API
4. **gcloud CLI** installed and configured
5. **Node.js** (version 18 or higher)
6. **Telegram Bot Token** from BotFather

## Deployment Steps

### 1. Environment Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd bigquery_telegram_bot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### 2. Google Cloud Configuration

1. **Set up gcloud**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud config set compute/region us-central1
   ```

2. **Enable required services**:
   ```bash
   gcloud services enable \
     cloudfunctions.googleapis.com \
     pubsub.googleapis.com \
     bigquery.googleapis.com \
     firestore.googleapis.com \
     cloudscheduler.googleapis.com \
     cloudkms.googleapis.com \
     secretmanager.googleapis.com
   ```

3. **Create service account**:
   ```bash
   gcloud iam service-accounts create bigquery-telegram-bot \
     --display-name="BigQuery Telegram Bot"
   ```

4. **Assign roles to service account**:
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:bigquery-telegram-bot@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/cloudfunctions.invoker"
     
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:bigquery-telegram-bot@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/pubsub.publisher"
     
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:bigquery-telegram-bot@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/bigquery.dataEditor"
     
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:bigquery-telegram-bot@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/datastore.user"
     
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:bigquery-telegram-bot@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"
   ```

5. **Create service account key**:
   ```bash
   gcloud iam service-accounts keys create key.json \
     --iam-account bigquery-telegram-bot@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

### 3. BigQuery Setup

1. **Initialize BigQuery dataset and tables**:
   ```bash
   node init.js
   ```

### 4. Cloud Functions Deployment

1. **Deploy webhook function**:
   ```bash
   gcloud functions deploy telegramWebhook \
     --runtime nodejs18 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point telegramWebhook \
     --source functions/ \
     --memory 128MB \
     --timeout 540s
   ```

2. **Deploy message processor function**:
   ```bash
   gcloud functions deploy processMessage \
     --runtime nodejs18 \
     --trigger-topic telegram-messages \
     --entry-point processMessage \
     --source functions/ \
     --memory 256MB \
     --timeout 540s
   ```

3. **Deploy validation and auto-correction functions**:
   ```bash
   gcloud functions deploy integrateValidationAndCorrection \
     --runtime nodejs18 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point integrateValidationAndCorrection \
     --source functions/ \
     --memory 128MB \
     --timeout 540s
     
   gcloud functions deploy processSearchQueryWithValidation \
     --runtime nodejs18 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point processSearchQueryWithValidation \
     --source functions/ \
     --memory 128MB \
     --timeout 540s
   ```

4. **Deploy scheduled functions**:
   ```bash
   gcloud functions deploy cleanupCache \
     --runtime nodejs18 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point cleanupCache \
     --source scheduler/ \
     --memory 128MB \
     --timeout 540s
     
   gcloud functions deploy sendDailyReminders \
     --runtime nodejs18 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point sendDailyReminders \
     --source workflows/ \
     --memory 128MB \
     --timeout 540s
   ```

### 5. Pub/Sub Setup

1. **Create Pub/Sub topic**:
   ```bash
   gcloud pubsub topics create telegram-messages
   ```

2. **Create Pub/Sub subscription**:
   ```bash
   gcloud pubsub subscriptions create telegram-messages-subscription \
     --topic telegram-messages \
     --ack-deadline 600
   ```

3. **Create dead letter topic**:
   ```bash
   gcloud pubsub topics create telegram-messages-dead-letter
   ```

### 6. Cloud KMS Setup

1. **Create key ring**:
   ```bash
   gcloud kms keyrings create business-operations \
     --location global
   ```

2. **Create crypto key**:
   ```bash
   gcloud kms keys create sensitive-data-key \
     --location global \
     --keyring business-operations \
     --purpose encryption
   ```

### 7. Telegram Bot Configuration

1. **Get function URL**:
   ```bash
   gcloud functions describe telegramWebhook --format="value(httpsTrigger.url)"
   ```

2. **Set webhook with BotFather**:
   - Message @BotFather on Telegram
   - Use `/setwebhook` command
   - Provide the function URL from step 1
   - Add your webhook secret token as a parameter

### 8. Cloud Scheduler Jobs

1. **Create scheduler jobs**:
   ```bash
   node scheduler/jobs.js
   ```

### 9. Firestore Setup

1. **Create Firestore database** (if not already created):
   - Go to Firestore in Google Cloud Console
   - Select "Native mode"
   - Choose `us-central1` location

## Environment Variables

Set the following environment variables in your `.env` file:

```env
# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here
WEBHOOK_SECRET_TOKEN=your_webhook_secret_token_here

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json

# BigQuery Configuration
BIGQUERY_DATASET_ID=business_operations

# Pub/Sub Configuration
PUBSUB_TOPIC_NAME=telegram-messages

# Cloud Storage Configuration
STORAGE_BUCKET_NAME=payment-evidence

# Region Configuration
REGION=us-central1

# Validation System Configuration
VALIDATION_CACHE_TTL=3600
TYPO_CORRECTION_CACHE_TTL=7200
```

## Monitoring and Maintenance

### Quota Monitoring

The system includes automatic quota monitoring. Set up alerts by:

1. **Configure Cloud Monitoring**:
   - Go to Monitoring in Google Cloud Console
   - Create alerts for:
     - Firestore read/write operations
     - BigQuery query bytes
     - Cloud Functions invocations
     - Pub/Sub storage

### Log Monitoring

1. **View function logs**:
   ```bash
   gcloud functions logs read processMessage --limit 50
   ```

2. **View scheduler logs**:
   ```bash
   gcloud logging read "resource.type=\"cloud_scheduler_job\"" --limit 50
   ```

### Validation System Monitoring

1. **Monitor validation performance**:
   - Track validation success rates
   - Monitor typo correction accuracy
   - Review heuristic pattern predictions
   - Analyze department-specific validation metrics

2. **Validation alerting**:
   - Set up alerts for high error rates
   - Monitor cache hit rates for validation components
   - Track BQML model performance metrics

## Troubleshooting

### Common Issues

1. **Webhook not working**:
   - Verify webhook URL is correct
   - Check webhook secret token
   - Ensure function is deployed and running

2. **Authentication errors**:
   - Verify service account permissions
   - Check service account key file
   - Ensure GOOGLE_APPLICATION_CREDENTIALS is set

3. **Quota exceeded**:
   - Check monitoring dashboards
   - Review usage patterns
   - Optimize queries and caching

4. **Validation errors**:
   - Check validation function logs
   - Review typo correction cache performance
   - Verify BQML model status

### Debugging Steps

1. **Check function logs**:
   ```bash
   gcloud functions logs read FUNCTION_NAME --limit 100
   ```

2. **Test locally**:
   ```bash
   npm run test
   npm run test:unit
   npm run test:integration
   ```

3. **Verify BigQuery tables**:
   ```bash
   bq show PROJECT_ID:DATASET_ID.TABLE_ID
   ```

4. **Test validation system**:
   ```bash
   npm run test:validation
   ```

## Security Considerations

1. **Never commit secrets** to version control
2. **Use Secret Manager** for sensitive configuration
3. **Enable Cloud Audit Logs** for security monitoring
4. **Regularly rotate** service account keys
5. **Review IAM permissions** periodically
6. **Validate all user inputs** through the validation system

## Backup and Recovery

1. **BigQuery backups**:
   - Enable BigQuery table snapshots
   - Set up export jobs to Cloud Storage

2. **Firestore backups**:
   - Enable daily backups in Firestore settings
   - Export data regularly using `gcloud firestore export`

3. **Function versions**:
   - Use version control for code
   - Tag releases in Cloud Functions

## Performance Optimization

1. **Monitor response times**:
   - Use Cloud Monitoring dashboards
   - Set up alerts for slow responses

2. **Optimize BigQuery queries**:
   - Always filter by partition column first
   - Use clustering columns in WHERE clauses
   - Avoid SELECT * queries

3. **Cache optimization**:
   - Monitor cache hit rates
   - Adjust TTL values based on data volatility
   - Pre-warm caches for peak usage times

4. **Validation system optimization**:
   - Monitor validation layer performance
   - Optimize typo correction cache
   - Review BQML model predictions

## Scaling Considerations

1. **Function scaling**:
   - Monitor concurrent executions
   - Adjust memory allocation as needed
   - Use concurrency settings for better throughput

2. **BigQuery scaling**:
   - Monitor query costs
   - Optimize data partitioning
   - Use materialized views for complex queries

3. **Pub/Sub scaling**:
   - Monitor message backlog
   - Adjust subscription configurations
   - Use message ordering when needed

## Conclusion

This deployment guide provides a comprehensive approach to deploying the BigQuery Telegram Bot System. Following these steps will ensure a successful deployment that meets all requirements specified in the design documents.

Regular monitoring and maintenance are key to ensuring the system continues to operate effectively within Google Cloud free tier limits while providing a responsive user experience for Bangladesh users.