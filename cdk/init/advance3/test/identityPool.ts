import * as fs from 'fs';
import * as path from 'path';
import { CognitoIdentityProviderClient, AuthFlowType, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { GetIdCommand, CognitoIdentityClient, GetCredentialsForIdentityCommand, GetOpenIdTokenCommand } from '@aws-sdk/client-cognito-identity';

const initAuth = async (clientId: string) => {
  const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1', credentials: undefined });
  const authCommand = new InitiateAuthCommand({
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    AuthParameters: {
      USERNAME: process.env.ADV_3_USERNAME || 'adv3_user',
      PASSWORD: process.env.ADV_3_PASSWORD || 'Password123!',
    },
    ClientId: clientId,
  });
  const authResult = await client.send(authCommand);
  return authResult;
};

const exec = async () => {
  // output.jsonを読み込む
  const output = fs.readFileSync(path.join(__dirname, '../../../../output/adv3.json'), 'utf-8');
  const outputJson = JSON.parse(output).Adv3;
  const userPoolId = outputJson.UserPoolId;
  const clientId = outputJson.UserPoolClientId;
  const identityPoolId = outputJson.IdentityPoolId;
  const userPoolProviderName = outputJson.UserPoolName as string;
  const authResult = await initAuth(clientId);
  console.log(authResult);
  const identityClient = new CognitoIdentityClient({ region: 'ap-northeast-1', credentials: undefined });
  const identityCommand = new GetIdCommand({
    IdentityPoolId: identityPoolId,
    Logins: {
      [userPoolProviderName]: authResult.AuthenticationResult?.IdToken || '',
    },
  });
  const identityResult = await identityClient.send(identityCommand);
  const identityId = identityResult.IdentityId;
  // console.log(identityId);
  const credentialsCommand = new GetCredentialsForIdentityCommand({
    IdentityId: identityId,
    Logins: {
      [userPoolProviderName]: authResult.AuthenticationResult?.IdToken || '',
    },
  });
  const credentialsResult = await identityClient.send(credentialsCommand);
  console.log(credentialsResult);
};

(async () => {
  await exec();
})();
