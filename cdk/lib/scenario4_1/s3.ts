import { Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

/**
 * uploadS3bucket
 * @param scope
 * @param prefix
 * @returns Bucket
 *
 * @description
 * JA: Lambda関数にホストするアプリケーションからのアップロード用のS3バケットを作成します。
 * 外部からのアクセスは許可せずに、Lambda関数からのみアクセスできるようにします。
 * EN: Create an S3 bucket for uploading from the application hosted on the Lambda function.
 * Access from outside is not allowed, and only access from the Lambda function is allowed.
 */
export const uploadS3bucket = (scope: Construct, prefix: string, uniqueId: string): Bucket => {
  return new Bucket(scope, `${prefix}UploadBucket`, {
    bucketName: `${prefix.toLocaleLowerCase()}-${uniqueId.slice(0, 10)}-4-1-upload`,
    removalPolicy: RemovalPolicy.DESTROY,
    encryption: BucketEncryption.S3_MANAGED,
    autoDeleteObjects: true,
    versioned: false,
    cors: [
      {
        allowedHeaders: ['*'],
        allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST, HttpMethods.DELETE, HttpMethods.HEAD],
        allowedOrigins: ['*'],
        exposedHeaders: ['ETag'],
        maxAge: 3000,
      },
    ],
  });
};

/**
 * crawlingContentDeliveryS3bucket
 * @param scope
 * @param prefix
 * @returns Bucket
 *
 * @description
 * JA: Lambda関数から取得したクローリング結果を配信するためのS3バケットを作成します。
 * 外部からのアクセスは許可せずに、CloudFrontからのみアクセスできるようにします。
 * また、配信するファイルは、Content-Dispositionヘッダーの値をattachmentに設定し、Content-Typeヘッダーの値をapplication/octet-streamに設定します。
 * EN: Create an S3 bucket to deliver the crawling results obtained from the Lambda function.
 * Access from outside is not allowed, and only access from CloudFront is allowed.
 * Also, the files to be delivered are set to attachment for the value of the Content-Disposition header and application/octet-stream for the value of the Content-Type header.
 */
export const crawlingContentDeliveryS3bucket = (scope: Construct, prefix: string, uniqueId: string): Bucket => {
  return new Bucket(scope, `${prefix}DeliveryBucket`, {
    bucketName: `${prefix.toLocaleLowerCase()}-${uniqueId.slice(0, 10)}-4-1-delivery`,
    removalPolicy: RemovalPolicy.DESTROY,
    encryption: BucketEncryption.S3_MANAGED,
    autoDeleteObjects: true,
    versioned: false,
    cors: [
      {
        allowedHeaders: ['*'],
        allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
        allowedOrigins: ['*'],
        exposedHeaders: ['ETag'],
        maxAge: 3000,
      },
    ],
  });
};
