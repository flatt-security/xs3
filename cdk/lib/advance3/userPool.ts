import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { UserPool, UserPoolProps, AccountRecovery, Mfa, StringAttribute, ClientAttributes, UserPoolClientIdentityProvider } from 'aws-cdk-lib/aws-cognito';

const userPoolProps = (prefix: string): UserPoolProps => {
  return {
    userPoolName: `${prefix}-adv-3-user-pool`,
    selfSignUpEnabled: false,
    signInCaseSensitive: false,
    removalPolicy: RemovalPolicy.DESTROY,
    signInAliases: {
      username: true,
    },
    autoVerify: {
      email: false,
    },
    accountRecovery: AccountRecovery.NONE,
    mfa: Mfa.OFF,
    customAttributes: {
      flag: new StringAttribute(),
    },
  };
};

export const userPool = (scope: Construct, prefix: string) => {
  const userPool = new UserPool(scope, `${prefix}-adv-3-user-pool`, userPoolProps(prefix));
  const client = userPool.addClient(`${prefix}-adv-3-user-pool-client`, {
    userPoolClientName: `${prefix}-adv-3-user-pool-client`,
    authFlows: {
      adminUserPassword: true,
      custom: false,
      userPassword: true,
      userSrp: false,
    },
    preventUserExistenceErrors: true,
    supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
    readAttributes: new ClientAttributes()
      .withStandardAttributes({
        email: true,
        emailVerified: true,
      })
      .withCustomAttributes('flag'),
    writeAttributes: new ClientAttributes(),
  });
  return { userPool, client };
};
