import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const uploadToS3 = async (key: string, body: Buffer) => {
  const client = new S3Client({});
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME || 'example-b',
    Key: key,
    Body: body,
    ContentType: 'text/plain',
    ContentLength: body.length,
  });
  await client.send(command);
};
