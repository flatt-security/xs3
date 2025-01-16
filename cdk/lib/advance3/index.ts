import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { lambdaFunction as applicationLambdaFunction } from './application';
import { lambdaFunction as crawlerLambdaFunction } from './crawler';
import { uploadS3bucket, crawlingContentDeliveryS3bucket, specialFlagDeliveryS3bucket } from './s3';
import { cloudFront } from './cloudfront';
import { createHash } from 'crypto';
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { queue } from './queue';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { userPool } from './userPool';
import { identityPool } from './identityPool';

export interface ScenarioStackProps extends cdk.StackProps {}

export class ScenarioStack extends cdk.Stack {
  static readonly StackName: string = 'Adv3';
  constructor(scope: Construct, props: ScenarioStackProps) {
    super(scope, ScenarioStack.StackName, props);
    const userUniqueId = createHash('sha256').update(cdk.Stack.of(this).account).digest('hex');

    const specialFlagBucket = specialFlagDeliveryS3bucket(this, 'SpecialFlagBucket', userUniqueId);
    const { userPool: idp, client: idpClient } = userPool(this, 'UserPool');
    const idPool = identityPool(this, 'IdentityPool', idp, idpClient, specialFlagBucket);

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
    crawler.addEnvironment('COGNITO_USER_POOL_CLIENT_ID', idpClient.userPoolClientId);
    crawler.addEnvironment('ADMIN_USERNAME', process.env.ADV_3_USERNAME || '');
    crawler.addEnvironment('ADMIN_PASSWORD', process.env.ADV_3_PASSWORD || '');

    uploadBucket.grantPut(application);
    deliveryBucket.grantRead(application);

    new cdk.CfnOutput(this, 'CloudFront URL', {
      exportName: 'Adv3CloudFrontURL',
      description: 'Adv3 CloudFront URL',
      value: `https://${distribution.distributionDomainName}/`,
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      exportName: 'Adv3IdentityPoolId',
      description: 'Adv3 Identity Pool Id',
      value: idPool.ref,
    });

    new cdk.CfnOutput(this, 'IdentityPoolName', {
      exportName: 'Adv3IdentityPoolName',
      description: 'Adv3 Identity Pool Name',
      value: idPool.identityPoolName || '',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      exportName: 'Adv3UserPoolId',
      description: 'Adv3 User Pool Id',
      value: idp.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolName', {
      exportName: 'Adv3UserPoolName',
      description: 'Adv3 User Pool Name',
      value: idp.userPoolProviderName || '',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      exportName: 'Adv3UserPoolClientId',
      description: 'Adv3 User Pool Client Id',
      value: idpClient.userPoolClientId,
    });
  }
}
