import { DockerImageFunction, DockerImageCode, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { arch } from 'os';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';

/**
 * lambdaFunction
 * @param scope
 * @param id
 * @returns Function
 *
 * @description
 * JA: lambdaFunctionはLambda関数を作成し、その関数を返します。
 */
export const lambdaFunction = (scope: Construct, id: string) => {
  const containerPath = path.join(__dirname, 'crawler');

  const lambda = new DockerImageFunction(scope, id, {
    code: DockerImageCode.fromImageAsset(containerPath, {
      file: 'Dockerfile.lambda',
      platform: Platform.LINUX_AMD64,
    }),
    timeout: cdk.Duration.seconds(10),
    architecture: Architecture.X86_64,
    memorySize: 128 * 5,
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      ADMIN_USERNAME: process.env.ADV_3_EMAIL || '',
      ADMIN_PASSWORD: process.env.ADV_3_PASSWORD || '',
    },
  });

  return lambda;
};
