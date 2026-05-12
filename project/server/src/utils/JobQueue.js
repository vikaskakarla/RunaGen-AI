import EventEmitter from 'events';
import { randomUUID } from 'crypto';

/**
 * A simple in-memory job queue system.
 * In a production environment, this should be replaced by Redis/BullMQ.
 */
class JobQueue extends EventEmitter {
    constructor() {
        super();
        this.jobs = new Map();
        this.processing = false;
        this.maxConcurrent = 2;
        this.activeJobs = 0;
    }

    /**
     * Add a new job to the queue
     * @param {string} type - Job type (e.g., 'generate_simulation')
     * @param {Object} data - Payload for the job
     * @returns {string} jobId
     */
    addJob(type, data) {
        const jobId = randomUUID();
        const job = {
            id: jobId,
            type,
            data,
            status: 'pending', // pending, processing, completed, failed
            createdAt: new Date(),
            result: null,
            error: null
        };

        this.jobs.set(jobId, job);
        this.processQueue();
        return jobId;
    }

    /**
     * Get job status and result
     * @param {string} jobId 
     */
    getJob(jobId) {
        return this.jobs.get(jobId);
    }

    /**
     * Process pending jobs
     */
    async processQueue() {
        if (this.activeJobs >= this.maxConcurrent) return;

        // Find next pending job (simple FIFO)
        // sort by creation time
        const pendingJob = Array.from(this.jobs.values())
            .filter(j => j.status === 'pending')
            .sort((a, b) => a.createdAt - b.createdAt)[0];

        if (!pendingJob) return;

        this.activeJobs++;
        pendingJob.status = 'processing';
        this.emit('jobStarted', pendingJob);

        // Process asynchronously without awaiting here to not block the loop
        this.executeJob(pendingJob).finally(() => {
            this.activeJobs--;
            this.processQueue(); // Look for next
        });
    }

    /**
     * Execute the actual worker logic
     * @param {Object} job 
     */
    async executeJob(job) {
        try {
            // Emit event so the worker handler in server.js can perform the logic
            // We wrap this in a Promise to allow the event listener to be async
            const result = await new Promise((resolve, reject) => {
                // We emit 'processJob' and pass the job + resolve/reject callbacks
                // This allows external logic to handle the job
                const handled = this.emit('processJob', job, resolve, reject);
                if (!handled) {
                    reject(new Error(`No processor registered for job type: ${job.type}`));
                }
            });

            job.result = result;

            job.status = 'completed';
            job.completedAt = new Date();
            this.emit('jobCompleted', job);
        } catch (error) {
            console.error(`Job ${job.id} failed:`, error);
            job.status = 'failed';
            job.error = error.message;
            this.emit('jobFailed', job);
        }
    }
}

export const jobQueue = new JobQueue();
