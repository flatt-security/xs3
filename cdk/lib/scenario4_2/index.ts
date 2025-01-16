import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { lambdaFunction as applicationLambdaFunction } from './application';
import { lambdaFunction as crawlerLambdaFunction } from './crawler';
import { uploadS3bucket, crawlingContentDeliveryS3bucket } from './s3';
import { cloudFront } from './cloudfront';
import { createHash } from 'crypto';
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { queue } from './queue';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export interface ScenarioStackProps extends cdk.StackProps {}

export class ScenarioStack extends cdk.Stack {
  static readonly StackName: string = 'Scenario4-2';
  constructor(scope: Construct, props: ScenarioStackProps) {
    super(scope, ScenarioStack.StackName, props);
    const userUniqueId = createHash('sha256').update(cdk.Stack.of(this).account).digest('hex');

    const uploadBucket = uploadS3bucket(this, 'UploadBucket', userUniqueId);
    const deliveryBucket = crawlingContentDeliveryS3bucket(this, 'DeliveryBucket', userUniqueId);

    const application = applicationLambdaFunction(this, 'Application');

    const crawlingQueue = queue(this, 'CrawlingQueue');
    crawlingQueue.grantSendMessages(application);

    application.addEnvironment('BUCKET_NAME', uploadBucket.bucketName);
    application.addEnvironment('DELIVERY_BUCKET_NAME', deliveryBucket.bucketName);
    application.addEnvironment('QUEUE_URL', crawlingQueue.queueUrl);

    const crawler = crawlerLambdaFunction(this, 'Crawler');
    deliveryBucket.grantPut(crawler);

    crawler.addEventSource(new SqsEventSource(crawlingQueue));

    const furl = application.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });

    const splitFunctionUrl = cdk.Fn.select(2, cdk.Fn.split('/', furl.url));
    const distribution = cloudFront(this, 'CloudFront', splitFunctionUrl, uploadBucket, deliveryBucket);

    crawler.addEnvironment('BUCKET_NAME', deliveryBucket.bucketName);
    crawler.addEnvironment('ALLOWED_URL', `https://${distribution.distributionDomainName}/`);
    crawler.addEnvironment('DOMAIN', distribution.distributionDomainName);

    // FLAGを環境変数からSCENARIO_4_2_FLAGから取得
    const flag = process.env.SCENARIO_4_2_FLAG;
    crawler.addEnvironment('FLAG', flag || 'flag{dummy}');

    uploadBucket.grantPut(application);
    deliveryBucket.grantRead(application);

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      exportName: 'Scenario4to2CloudFrontURL',
      description: 'Scerario4-2 CloudFront URL',
      value: `https://${distribution.distributionDomainName}/`,
    });
  }
}
