import { Construct } from 'constructs';

import {
  CloudFrontWebDistribution,
  ViewerProtocolPolicy,
  HttpVersion,
  OriginAccessIdentity,
  SourceConfiguration,
  CloudFrontAllowedMethods,
  CloudFrontAllowedCachedMethods,
} from 'aws-cdk-lib/aws-cloudfront';
import { initialStringUpperCase } from './utils';
import { Bucket } from 'aws-cdk-lib/aws-s3';

/**
 *
 * @param scope
 * @param prefix
 * @param bucket
 * @returns
 */
export const cloudFront = (scope: Construct, prefix: string, furl: string, bucket: Bucket, deliveryBucket: Bucket) => {
  const oai = createOriginAccessIdentity(scope, prefix);
  const props = createCloudFrontProps(prefix, furl, bucket, deliveryBucket, oai);
  return new CloudFrontWebDistribution(scope, `${initialStringUpperCase(prefix)}CloudFront`, props);
};

const createOriginAccessIdentity = (scope: Construct, prefix: string) => {
  const id = `${initialStringUpperCase(prefix)}OAI`;
  return new OriginAccessIdentity(scope, id, {
    comment: `OAI for ${id}`,
  });
};

const createCloudFrontProps = (prefix: string, furl: string, bucket: Bucket, deliveryBucket: Bucket, oai: OriginAccessIdentity) => {
  const id = `${initialStringUpperCase(prefix)}CloudFront`;

  const errorConfigurations = [
    {
      errorCode: 403,
      responseCode: 200,
      responsePagePath: '/',
    },
    {
      errorCode: 404,
      responseCode: 200,
      responsePagePath: '/',
    },
  ];
  const originConfigs: SourceConfiguration[] = [
    {
      customOriginSource: {
        domainName: furl,
      },
      behaviors: [
        {
          isDefaultBehavior: true,
          allowedMethods: CloudFrontAllowedMethods.ALL,
          cachedMethods: undefined,
          compress: true,
        },
      ],
    },
    {
      s3OriginSource: {
        s3BucketSource: bucket,
        originAccessIdentity: oai,
      },
      behaviors: [
        {
          pathPattern: '/upload/*',
          allowedMethods: CloudFrontAllowedMethods.GET_HEAD,
          cachedMethods: CloudFrontAllowedCachedMethods.GET_HEAD,
          compress: true,
        },
      ],
    },
    {
      s3OriginSource: {
        s3BucketSource: deliveryBucket,
        originAccessIdentity: oai,
      },
      behaviors: [
        {
          pathPattern: '/delivery/*',
          allowedMethods: CloudFrontAllowedMethods.GET_HEAD,
          compress: true,
        },
      ],
    },
  ];
  return {
    comment: `Distribution for SCENARIO4 1`,
    defaultRootObject: 'index.html',
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    httpVersion: HttpVersion.HTTP2,
    errorConfigurations,
    originConfigs,
  };
};
