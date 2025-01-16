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
 * 設定には、Lambda Function URLsを設定し、インターネットからのURLのアクセスを許可します。
 * また、Lambda関数にはarm形式のContainerイメージを使用します。その際に利用するファイルは、`./application/Dockerfile.lambda`を使用します。
 */
export const lambdaFunction = (scope: Construct, id: string) => {
  const containerPath = path.join(__dirname, 'application');

  const lambda = new DockerImageFunction(scope, id, {
    code: DockerImageCode.fromImageAsset(containerPath, {
      file: 'Dockerfile.lambda',
      platform: arch() === 'arm' ? Platform.LINUX_ARM64 : Platform.LINUX_AMD64,
    }),
    timeout: cdk.Duration.seconds(6),
    architecture: arch() === 'arm' ? Architecture.ARM_64 : Architecture.X86_64,
    memorySize: 128 * 3,
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    },
  });

  return lambda;
};
