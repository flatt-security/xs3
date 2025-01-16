import { launch } from 'puppeteer';
import { uploadToS3 } from './s3';
import os from 'os';

const puppeteerArgs = [
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-gpu',
  '--no-gpu',
  '--disable-default-apps',
  '--disable-translate',
  '--user-agent=mini-ctf-reporter/1.0',
  '--single-process',
];

export const crawler = async (url: string) => {
  const browser = await launch({
    headless: true,
    args: puppeteerArgs,
  });

  const page = await browser.newPage();
  // DOMAIN is Challenge Page Domain
  page.setCookie({
    name: 'flag',
    value: process.env.FLAG || 'flag{dummy}',
    domain: process.env.DOMAIN || 'example.com',
  });
  await page.goto(url);
  await new Promise((resolve) => setTimeout(resolve, 1000));
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
