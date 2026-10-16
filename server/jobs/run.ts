// CLI: npm run job:daily  (Railway cron service command)
import { getCtx } from '../context';
import { runJob } from './run-jobs';

const job = process.argv[2] as 'hourly' | 'daily' | 'weekly';
if (!['hourly', 'daily', 'weekly'].includes(job)) {
  console.error('Usage: tsx server/jobs/run.ts hourly|daily|weekly');
  process.exit(1);
}
runJob(getCtx(), job)
  .then((stats) => {
    console.log(job, stats);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
