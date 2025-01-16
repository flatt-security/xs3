import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AuthFlowType,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import * as fs from 'fs';
import * as path from 'path';

const getUser = async (userPoolId: string, username: string) => {
  console.log('Get user ', username);
  const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1' });
  const command = new AdminGetUserCommand({
    UserPoolId: userPoolId,
    Username: username,
  });
  try {
    console.log('Get user command');
    const result = await client.send(command);
    console.log('Get user result', result);
    return { result, exists: true };
  } catch (e) {
    const error = e as { name: string };
    if (error.name === 'UserNotFoundException') {
      console.log('User not found. Creating user...');
      return { result: null, exists: false };
    } else if (error.name === 'UsernameExistsException') {
      console.log('User already exists.');
      return { result: null, exists: true };
    }
    throw { exists: false, error: e };
  }
};

const createUser = async (userPoolId: string, email: string, username: string) => {
  const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1' });
  const command = new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: username,
    TemporaryPassword: 'Password123!',
    UserAttributes: [
      {
        Name: 'email',
        Value: email,
      },
      {
        Name: 'email_verified',
        Value: 'true',
      },
      {
        Name: 'custom:flag',
        Value: process.env.ADV_3_FLAG || 'false',
      },
    ],
  });
  const result = await client.send(command);
  return result;
};

const authenticate = async (clientId: string, username: string, password: string) => {
  const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1' });

  try {
    const authCommand = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: 'Password123!',
      },
      ClientId: clientId,
    });
    const authResult = await client.send(authCommand);
    const session = authResult.Session;
    const challenge = authResult.ChallengeName;
    if (challenge === 'NEW_PASSWORD_REQUIRED') {
      const respondCommand = new RespondToAuthChallengeCommand({
        ChallengeName: challenge,
        ClientId: clientId,
        ChallengeResponses: {
          USERNAME: username,
          NEW_PASSWORD: password,
        },
        Session: session,
      });
      const result = await client.send(respondCommand);
      return result;
    }
    return authResult;
  } catch (e) {
    const error = e as { name: string };
    if (error.name === 'NotAuthorizedException') {
      const authCommand = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
        ClientId: clientId,
      });
      const authResult = await client.send(authCommand);
      return authResult;
    }
    throw e;
  }
};

const exec = async () => {
  // output.jsonを読み込む
  console.log('Start init user');
  const output = fs.readFileSync(path.join(__dirname, 'output.json'), 'utf-8');
  console.log('Read output.json');
  const outputJson = JSON.parse(output).Adv3;
  const userPoolId = outputJson.UserPoolId;
  const clientId = outputJson.UserPoolClientId;
  console.log('Read output.json');
  const user = await getUser(userPoolId, process.env.ADV_3_USERNAME || 'adv3_user');
  console.log('Get user');
  if (!user.exists) {
    console.log('Create user');
    await createUser(userPoolId, process.env.ADV_3_EMAIL || 'example@example.com', process.env.ADV_3_USERNAME || 'adv3_user');
  }
  const authResult = await authenticate(clientId, process.env.ADV_3_USERNAME || 'adv3_user', process.env.ADV_3_PASSWORD || 'Password123!');
  console.log('Authenticate');
  console.log(authResult.AuthenticationResult);
};

(async () => {
  await exec();
})();
