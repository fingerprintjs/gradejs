import { createWorker } from './app';
import {
  initDatabase,
  getPort,
  checkRequiredEnvironmentVariables,
  Env,
} from '@gradejs-public/shared';

checkRequiredEnvironmentVariables([
  Env.AwsRegion,
  Env.AwsS3Bucket,
  Env.DatabaseUrl,
  Env.InternalApiRootUrl,
  Env.SqsWorkerQueueUrl,
]);

const port = getPort(8080);

initDatabase({ runMigrations: true }).then(() => {
  createWorker().listen(port, () => {
    console.log(`gradejs worker started, listening on port ${port}`);
  });
});
