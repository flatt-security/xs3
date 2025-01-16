import { launch } from 'puppeteer';
import { uploadToS3 } from './s3';
import { CognitoIdentityProviderClient, InitiateAuthCommand, InitiateAuthCommandOutput } from '@aws-sdk/client-cognito-identity-provider';

const puppeteerArgs = [
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-gpu',
  '--no-gpu',
  '--disable-default-apps',
  '--disable-translate',
  '--single-process',
];

export const crawler = async (url: string) => {
  const browser = await launch({
    headless: true,
    args: puppeteerArgs,
  });
  /**
   * Dummy Cognito User Pool Login
   */
  const client = new CognitoIdentityProviderClient({ region: process.env.REGION, credentials: undefined });
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID || '',
    AuthParameters: {
      USERNAME: process.env.ADMIN_USERNAME || '',
      PASSWORD: process.env.ADMIN_PASSWORD || '',
    },
  });
  console.log(`command: ${JSON.stringify(command)}`);
  const response = await client.send(command);
  console.log(`response: ${JSON.stringify(response)}`);

  const IdToken = response.AuthenticationResult?.IdToken || '';
  const AccessToken = response.AuthenticationResult?.AccessToken || '';
  const RefreshToken = response.AuthenticationResult?.RefreshToken || '';
  const page = await browser.newPage();
  await page.goto(`${process.env.ALLOWED_URL || 'example.com'}`);
  await page.evaluate(
    (IdToken: string, AccessToken: string, RefreshToken: string) => {
      const randomNumber = Math.floor(Math.random() * 1000000);
      localStorage.setItem(`CognitoIdentityServiceProvider.${randomNumber}.idToken`, IdToken);
      localStorage.setItem(`CognitoIdentityServiceProvider.${randomNumber}.accessToken`, AccessToken);
      localStorage.setItem(`CognitoIdentityServiceProvider.${randomNumber}.refreshToken`, RefreshToken);
    },
    IdToken,
    AccessToken,
    RefreshToken,
  );

  await page.goto(url);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const bodyHandle = await page.$('body');
  const html = await page.evaluate((body) => {
    if (!body) {
      return 'HTML is empty';
    }
    return body.innerHTML;
  }, bodyHandle);
  const path = new URL(url).pathname;
  await uploadToS3(`delivery/${path.split('/').pop()}`, Buffer.from(html));
  await browser.close();
};
