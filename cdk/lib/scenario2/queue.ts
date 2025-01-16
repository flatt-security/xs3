import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
export const queue = (scope: Construct, prefix: string) => {
  const queue = new Queue(scope, `${prefix}-2`, {
    queueName: `${prefix}-2`,
    retentionPeriod: cdk.Duration.days(7),
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    visibilityTimeout: cdk.Duration.seconds(20),
  });
  return queue;
};
