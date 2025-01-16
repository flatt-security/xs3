import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnIdentityPool, CfnIdentityPoolPrincipalTag, CfnIdentityPoolRoleAttachment, UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { SessionTagsPrincipal, WebIdentityPrincipal, Role, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';

export const identityPool = (scope: Construct, prefix: string, userPool: UserPool, client: UserPoolClient, bucket: Bucket) => {
  const identityPool = new CfnIdentityPool(scope, `${prefix}-adv-3-identity-pool`, {
    allowUnauthenticatedIdentities: false,
    cognitoIdentityProviders: [
      {
        clientId: client.userPoolClientId,
        providerName: userPool.userPoolProviderName,
      },
    ],
    identityPoolName: `${prefix}-adv-3-identity-pool`,
  });

  /**
   * Cognito User Pool to Identity Pool Principal Tag
   */
  new CfnIdentityPoolPrincipalTag(scope, `${prefix}-adv-3-identity-pool-principal-tag`, {
    identityPoolId: identityPool.ref,
    identityProviderName: userPool.userPoolProviderName,
    principalTags: {
      username: 'sub',
      client: 'aud',
    },
    useDefaults: true,
  });

  const federatedPrincipal = new WebIdentityPrincipal('cognito-identity.amazonaws.com', {
    StringEquals: {
      'cognito-identity.amazonaws.com:aud': identityPool.ref,
    },
    'ForAnyValue:StringLike': {
      'cognito-identity.amazonaws.com:amr': 'authenticated',
    },
  });
  // Role to allow sts:TagSession when accepting PrincipalTag from Cognito Identity Pool
  const sessionTagsPrincipal = new SessionTagsPrincipal(federatedPrincipal);
  const authenticatedRole = new Role(scope, `${prefix}-adv-3-authenticated-role`, {
    assumedBy: sessionTagsPrincipal,
  });

  authenticatedRole.addToPolicy(
    new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
    }),
  );

  authenticatedRole.addToPolicy(
    new PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [bucket.bucketArn],
    }),
  );

  authenticatedRole.addToPolicy(
    new PolicyStatement({
      actions: ['s3:ListAllMyBuckets'],
      resources: ['*'],
    }),
  );

  new CfnIdentityPoolRoleAttachment(scope, `${prefix}-adv-3-identity-pool-role-attachment`, {
    identityPoolId: identityPool.ref,
    roles: {
      authenticated: authenticatedRole.roleArn,
    },
  });

  return identityPool;
};
