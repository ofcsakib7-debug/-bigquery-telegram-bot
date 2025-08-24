# BigQuery Telegram Bot - GitHub Testing Setup

This repository contains a complete GitHub Actions setup for testing the BigQuery Telegram Bot system with comprehensive error logging and debugging capabilities.

## 🚀 Quick Start

1. Push your code to a GitHub repository
2. Enable GitHub Actions in the repository settings
3. Monitor the Actions tab for test results
4. Check detailed logs for any errors

## 🧪 Testing Workflows

### 1. Test Workflow (`test.yml`)
- Runs on every push and pull request
- Executes unit tests, integration tests, and verification
- Provides detailed error logging
- Uploads test results as artifacts

### 2. Verify System Workflow (`verify-system.yml`)
- Checks module imports and function accessibility
- Validates file structure and package.json configuration
- Provides comprehensive system verification

### 3. Debug Workflow (`debug.yml`)
- Manual workflow for detailed debugging
- Allows specific module testing
- Provides full stack traces and error details
- Can be triggered with different debug levels

### 4. Security Workflow (`security.yml`)
- Runs weekly security scans
- Checks for vulnerabilities with `npm audit`
- Scans for sensitive files that shouldn't be committed
- Validates package.json for security issues

## 📋 Error Logging Features

### Detailed Error Reports
- Full stack traces for all errors
- Module-specific error messages
- Function execution results
- Environment variable information

### Debug Information
- Node.js and NPM version information
- Environment variable dumps
- File structure verification
- Dependency checking

### Test Results
- Unit test execution logs
- Integration test results
- System verification summaries
- Performance metrics

## 🔧 Debugging Capabilities

### Manual Debug Workflow
Trigger the debug workflow manually with:
- **Debug Level**: basic, detailed, or full
- **Test Module**: payment, snooze, cache, or all

### Error Analysis
- Stack trace analysis
- Module import error detection
- Function accessibility verification
- Runtime error reproduction

## 🛡️ Security Features

### Automated Security Scanning
- Weekly npm audit scans
- Sensitive file detection
- Dangerous script pattern checking
- Security vulnerability reporting

## 📊 Test Coverage

### Unit Tests
- Core function testing
- Input validation
- Error handling
- Edge case scenarios

### Integration Tests
- Module interaction testing
- Data flow verification
- System component integration
- Performance testing

### System Verification
- Module import validation
- Function accessibility checks
- File structure verification
- Configuration validation

## 📈 Monitoring and Reporting

### Real-time Monitoring
- GitHub Actions dashboard
- Live test execution logs
- Immediate error notifications
- Test progress tracking

### Artifact Storage
- Test result archives
- Debug log uploads
- Coverage reports
- Performance metrics

## 🆘 Troubleshooting

### Common Issues

1. **Module Import Failures**
   - Check file paths in import statements
   - Verify file permissions
   - Ensure all dependencies are installed

2. **Function Accessibility Errors**
   - Check function exports in module files
   - Verify function names match exports
   - Check for typos in function names

3. **Test Execution Failures**
   - Review test setup in `tests/setup.js`
   - Check environment variable configuration
   - Verify test data and mock services

### Debugging Steps

1. **Run Manual Debug Workflow**
   - Go to Actions tab
   - Select "Debug System Issues"
   - Choose appropriate debug level
   - Run workflow and check logs

2. **Check Test Results**
   - Download test artifacts
   - Review detailed error logs
   - Analyze stack traces

3. **Verify Local Setup**
   - Run `npm test` locally
   - Check Node.js version compatibility
   - Verify all dependencies are installed

## 📝 Best Practices

### For Development
- Run tests locally before pushing
- Use descriptive commit messages
- Keep workflows up to date
- Monitor test results regularly

### For Debugging
- Use appropriate debug levels
- Test one module at a time
- Check environment configuration
- Review recent code changes

### For Security
- Regular security scans
- Avoid committing sensitive files
- Keep dependencies updated
- Review npm audit reports

## 🆗 Getting Help

If you encounter issues:

1. Check the detailed logs in GitHub Actions
2. Run the manual debug workflow
3. Review the system verification output
4. Check for common issues in this document
5. Create an issue with the error logs and description

The GitHub Actions setup provides a completely free and risk-free way to test the BigQuery Telegram Bot system with comprehensive error logging and debugging capabilities.