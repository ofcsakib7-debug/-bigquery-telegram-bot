# BigQuery Telegram Bot System

A comprehensive business management system with Telegram bot interface designed for operations in Bangladesh. This system operates entirely within Google Cloud free tier limits while providing a responsive user experience.

## System Overview

This project implements a multi-design system based on the Qwen Coder specifications:

1. **Design 1**: Financial Operations (payments, accounting, expense tracking)
2. **Design 2**: Machine Inventory Management and Service Tracking
3. **Design 3**: Customer Relationship Management and Collections
4. **Design 4**: Local Development & Debugging Environment
5. **Design 5**: Continuation Protocol for Qwen Coder

## Core Principles

- **"Don't Type, Tap" Philosophy**: All user interactions via predefined buttons to eliminate validation needs
- **Free Tier Compliance**: Operates entirely within Google Cloud free tier limits
- **Latency Optimization**: Optimized for Bangladesh users with 200-300ms transcontinental latency
- **Aggressive Caching**: 90% of bot responses from cache tables to minimize processing
- **Event Sourcing**: Append-only journal tables with materialized views for current state

## Technology Stack

- **Telegram Bot API** for user interface
- **Google Cloud Functions (Gen 2)** for processing
- **Pub/Sub** for message queuing
- **BigQuery** for data storage and analytics
- **Firestore** for user state and configuration
- **Cloud Workflows and Scheduler** for automation
- **Cloud KMS** for sensitive data encryption
- **Sharp** for image processing

## System Architecture

### Core Components

1. **Telegram Bot Layer**
   - Webhook receiver function (responds within 1 second)
   - Message processing function (handles business logic)
   - Department-specific workflows
   - Context-aware snooze functionality

2. **Data Layer**
   - 18 BigQuery tables with strict partitioning and clustering
   - Firestore for user state and configuration
   - Cloud Storage for evidence images
   - Master cache system for quota optimization

3. **Processing Layer**
   - Pub/Sub for asynchronous message processing
   - Micro-batching for BigQuery writes
   - BQML for predictive analytics
   - Scheduled jobs for data aggregation

4. **Monitoring & Security**
   - Quota monitoring and alerting
   - Error handling with retry logic
   - KMS encryption for sensitive data
   - Circuit breaker pattern for resilience

### Key Features

- **Payment Recording**: Complete workflow with evidence collection
- **Expense Logging**: Department-specific accounting heads
- **Inventory Management**: Machine tracking with service tickets
- **Customer Relations**: Collections with friendly competition
- **Department Workflows**: Role-based access control
- **Snooze Intelligence**: Context-aware reminder system

## Project Structure

```
bigquery_telegram_bot/
├── functions/          # Cloud Functions
├── telegram_bot/       # Telegram bot implementation
├── bigquery/           # BigQuery schemas and queries
├── scheduler/          # Scheduled jobs
├── workflows/          # Cloud Workflows
├── docs/              # Documentation and tracking
└── tests/             # Test suite
```

## Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Google Cloud credentials**:
   - Create a service account with required permissions
   - Download the JSON key file
   - Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the system**:
   ```bash
   node init.js
   ```

## Deployment

The system follows the implementation sequence specified in the design documents:

1. Set up Telegram bot and webhook connection
2. Configure Cloud Functions and Pub/Sub pipeline
3. Implement Firestore structure for user states
4. Create BigQuery dataset and tables
5. Connect all components with error handling

## Monitoring and Maintenance

- **Quota Monitoring**: Automated checks for Firestore, BigQuery, and Cloud Functions limits
- **Performance Monitoring**: Response time and error rate tracking
- **Error Monitoring**: Pattern detection and alerting
- **Scheduled Maintenance**: Daily, weekly, and monthly jobs

## Security Features

- **KMS Encryption**: For sensitive data like bank account numbers
- **Input Validation**: Regex patterns and format checking
- **Role-Based Access**: Department and role-specific permissions
- **Secure Storage**: Telegram tokens in Secret Manager

## Verification

The system has been verified and all core functionality is working correctly:

- **Payment Workflow**: Complete implementation with validation
- **Snooze Functionality**: Context-aware options working
- **Cache System**: Optimized for Google Cloud free tier
- **Telegram Integration**: Webhook and message processing ready
- **BigQuery Integration**: All required tables defined and accessible
- **Firestore Integration**: User states and profiles working

Recent fixes:
- Implemented lazy initialization for Google Cloud services to prevent import hangs
- Fixed function exports for external access
- Verified all core functions with direct testing

## License

MIT

## Contributing

This project follows the Continuation Protocol specified in Design 5:
- Development is broken into resume-able segments
- Progress is tracked with completion markers
- Context is preserved with minimal token usage
- Implementation follows exact design specifications