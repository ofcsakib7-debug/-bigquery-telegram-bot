// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 1
// Component: cloud_scheduler_jobs
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 16:30 UTC
// Next Step: Implement job creation and management
// =============================================

const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

/**
 * Create Cloud Scheduler jobs for the system
 */
async function createSchedulerJobs() {
  try {
    console.log('Creating Cloud Scheduler jobs...');
    
    // Create daily cache table updates job (1:15 AM UTC / 7:15 AM Bangladesh)
    await createJob({
      name: 'daily-cache-updates',
      description: 'Daily cache table updates',
      schedule: '15 1 * * *', // 1:15 AM UTC
      timeZone: 'Asia/Dhaka',
      uri: `https://${process.env.REGION || 'us-central1'}-${process.env.GOOGLE_CLOUD_PROJECT}.cloudfunctions.net/cleanupCache`,
      httpMethod: 'GET'
    });
    
    // Create weekly report generation job (2:00 AM UTC Mondays / 8:00 AM Bangladesh Mondays)
    await createJob({
      name: 'weekly-report-generation',
      description: 'Weekly report generation',
      schedule: '0 2 * * 1', // 2:00 AM UTC on Mondays
      timeZone: 'Asia/Dhaka',
      uri: `https://${process.env.REGION || 'us-central1'}-${process.env.GOOGLE_CLOUD_PROJECT}.cloudfunctions.net/generateWeeklyReports`,
      httpMethod: 'GET'
    });
    
    // Create monthly data cleanup job (3:00 AM UTC on 1st / 9:00 AM Bangladesh on 1st)
    await createJob({
      name: 'monthly-data-cleanup',
      description: 'Monthly data cleanup',
      schedule: '0 3 1 * *', // 3:00 AM UTC on 1st of month
      timeZone: 'Asia/Dhaka',
      uri: `https://${process.env.REGION || 'us-central1'}-${process.env.GOOGLE_CLOUD_PROJECT}.cloudfunctions.net/monthlyDataCleanup`,
      httpMethod: 'GET'
    });
    
    // Create daily BQML training job (2:00 AM UTC / 8:00 AM Bangladesh)
    await createJob({
      name: 'daily-bqml-training',
      description: 'Daily BQML model training',
      schedule: '0 2 * * *', // 2:00 AM UTC
      timeZone: 'Asia/Dhaka',
      uri: `https://${process.env.REGION || 'us-central1'}-${process.env.GOOGLE_CLOUD_PROJECT}.cloudfunctions.net/trainUiStruggleModel`,
      httpMethod: 'GET'
    });
    
    // Create daily UI optimization cache rebuild job (2:30 AM UTC / 8:30 AM Bangladesh)
    await createJob({
      name: 'daily-ui-optimization-cache',
      description: 'Daily UI optimization cache rebuild',
      schedule: '30 2 * * *', // 2:30 AM UTC
      timeZone: 'Asia/Dhaka',
      uri: `https://${process.env.REGION || 'us-central1'}-${process.env.GOOGLE_CLOUD_PROJECT}.cloudfunctions.net/rebuildUiOptimizationCache`,
      httpMethod: 'GET'
    });
    
    // Create daily BQML training data rebuild job (1:00 AM UTC / 7:00 AM Bangladesh)
    await createJob({
      name: 'daily-bqml-training-data',
      description: 'Daily BQML training data rebuild',
      schedule: '0 1 * * *', // 1:00 AM UTC
      timeZone: 'Asia/Dhaka',
      uri: `https://${process.env.REGION || 'us-central1'}-${process.env.GOOGLE_CLOUD_PROJECT}.cloudfunctions.net/rebuildBqmlTrainingData`,
      httpMethod: 'GET'
    });
    
    // Create daily reminder system job (1:00 AM UTC / 7:00 AM Bangladesh)
    await createJob({
      name: 'daily-reminders',
      description: 'Daily reminder system',
      schedule: '0 1 * * *', // 1:00 AM UTC
      timeZone: 'Asia/Dhaka',
      uri: `https://${process.env.REGION || 'us-central1'}-${process.env.GOOGLE_CLOUD_PROJECT}.cloudfunctions.net/sendDailyReminders`,
      httpMethod: 'GET'
    });
    
    console.log('Cloud Scheduler jobs created successfully');
    
  } catch (error) {
    console.error('Error creating Cloud Scheduler jobs:', error);
  }
}

/**
 * Create a Cloud Scheduler job
 * @param {Object} jobConfig - Job configuration
 */
async function createJob(jobConfig) {
  try {
    const {
      name,
      description,
      schedule,
      timeZone,
      uri,
      httpMethod
    } = jobConfig;
    
    // Construct the gcloud command
    const command = `
      gcloud scheduler jobs create http ${name} \\
        --description="${description}" \\
        --schedule="${schedule}" \\
        --time-zone="${timeZone}" \\
        --uri="${uri}" \\
        --http-method=${httpMethod} \\
        --project=${process.env.GOOGLE_CLOUD_PROJECT} \\
        --location=${process.env.REGION || 'us-central1'}
    `;
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`Error creating job ${name}:`, stderr);
    } else {
      console.log(`Job ${name} created successfully:`, stdout);
    }
    
  } catch (error) {
    console.error(`Error creating job ${jobConfig.name}:`, error);
  }
}

/**
 * Update an existing Cloud Scheduler job
 * @param {Object} jobConfig - Job configuration
 */
async function updateJob(jobConfig) {
  try {
    const {
      name,
      description,
      schedule,
      timeZone,
      uri,
      httpMethod
    } = jobConfig;
    
    // Construct the gcloud command
    const command = `
      gcloud scheduler jobs update http ${name} \\
        --description="${description}" \\
        --schedule="${schedule}" \\
        --time-zone="${timeZone}" \\
        --uri="${uri}" \\
        --http-method=${httpMethod} \\
        --project=${process.env.GOOGLE_CLOUD_PROJECT} \\
        --location=${process.env.REGION || 'us-central1'}
    `;
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`Error updating job ${name}:`, stderr);
    } else {
      console.log(`Job ${name} updated successfully:`, stdout);
    }
    
  } catch (error) {
    console.error(`Error updating job ${jobConfig.name}:`, error);
  }
}

/**
 * Delete a Cloud Scheduler job
 * @param {string} jobName - Name of the job to delete
 */
async function deleteJob(jobName) {
  try {
    // Construct the gcloud command
    const command = `
      gcloud scheduler jobs delete ${jobName} \\
        --project=${process.env.GOOGLE_CLOUD_PROJECT} \\
        --location=${process.env.REGION || 'us-central1'} \\
        --quiet
    `;
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`Error deleting job ${jobName}:`, stderr);
    } else {
      console.log(`Job ${jobName} deleted successfully:`, stdout);
    }
    
  } catch (error) {
    console.error(`Error deleting job ${jobName}:`, error);
  }
}

/**
 * List all Cloud Scheduler jobs
 */
async function listJobs() {
  try {
    // Construct the gcloud command
    const command = `
      gcloud scheduler jobs list \\
        --project=${process.env.GOOGLE_CLOUD_PROJECT} \\
        --location=${process.env.REGION || 'us-central1'}
    `;
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error('Error listing jobs:', stderr);
    } else {
      console.log('Current Cloud Scheduler jobs:');
      console.log(stdout);
    }
    
  } catch (error) {
    console.error('Error listing jobs:', error);
  }
}

/**
 * Pause a Cloud Scheduler job
 * @param {string} jobName - Name of the job to pause
 */
async function pauseJob(jobName) {
  try {
    // Construct the gcloud command
    const command = `
      gcloud scheduler jobs pause ${jobName} \\
        --project=${process.env.GOOGLE_CLOUD_PROJECT} \\
        --location=${process.env.REGION || 'us-central1'}
    `;
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`Error pausing job ${jobName}:`, stderr);
    } else {
      console.log(`Job ${jobName} paused successfully:`, stdout);
    }
    
  } catch (error) {
    console.error(`Error pausing job ${jobName}:`, error);
  }
}

/**
 * Resume a Cloud Scheduler job
 * @param {string} jobName - Name of the job to resume
 */
async function resumeJob(jobName) {
  try {
    // Construct the gcloud command
    const command = `
      gcloud scheduler jobs resume ${jobName} \\
        --project=${process.env.GOOGLE_CLOUD_PROJECT} \\
        --location=${process.env.REGION || 'us-central1'}
    `;
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`Error resuming job ${jobName}:`, stderr);
    } else {
      console.log(`Job ${jobName} resumed successfully:`, stdout);
    }
    
  } catch (error) {
    console.error(`Error resuming job ${jobName}:`, error);
  }
}

// Export functions
module.exports = {
  createSchedulerJobs,
  createJob,
  updateJob,
  deleteJob,
  listJobs,
  pauseJob,
  resumeJob
};