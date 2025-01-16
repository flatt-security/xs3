import fastify from 'fastify';
import { fastifyStatic } from '@fastify/static';

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const server = fastify();

server.register(fastifyStatic, {
  root: path.join('/app', 'public'),
});

const port = 3000;
const stage = process.env.STAGE || 'dev';

server.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
});

server.post<{
  Body: {
    extention: string;
    length: number;
  };
}>('/api/upload', async (request, reply) => {
  if (!request.body.extention || !request.body.length) {
    return reply.code(400).send({ error: 'No file uploaded' });
  }

  if (request.body.length > 1024 * 1024 * 100) {
    return reply.code(400).send({ error: 'File too large' });
  }

  const denyStringRegex = /[\s\;()]/;

  if (denyStringRegex.test(request.body.extention)) {
    return reply.code(400).send({ error: 'Invalid file type' });
  }

  const allowExtention = ['png', 'jpeg', 'jpg', 'gif'];

  const isAllowExtention = allowExtention.filter((ext) => request.body.extention.includes(ext)).length > 0;
  if (!isAllowExtention) {
    return reply.code(400).send({ error: 'Invalid file extention' });
  }

  const contentType = `image/${request.body.extention}`;
  const filename = uuidv4();
  const s3 = new S3Client({});
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `upload/${filename}`,
    ContentLength: request.body.length,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, {
    expiresIn: 60 * 60 * 24,
    signableHeaders: new Set(['content-type']),
  });
  return reply.header('content-type', 'application/json').send({
    url,
    filename,
  });
});

server.post<{ Body: { url: string } }>('/api/report', async (request, reply) => {
  const data = request.body;
  if (!data) {
    return reply.code(400).send({ error: 'No url provided' });
  }

  const sqs = new SQSClient({});
  const command = new SendMessageCommand({
    QueueUrl: process.env.QUEUE_URL,
    MessageBody: data.url,
  });

  await sqs.send(command);

  return reply.send('Crawling request has been sent');
});

server.get<{ Params: { filename: string } }>('/api/report/:filename', async (request, reply) => {
  console.log(`Params: ${request.params}`);
  const s3 = new S3Client({});
  const command = new HeadObjectCommand({
    Bucket: process.env.DELIVERY_BUCKET_NAME,
    Key: `delivery/${request.params.filename}`,
  });
  try {
    console.log(`command: ${command}`);
    const response = await s3.send(command);
    console.log(`response: ${JSON.stringify(response)}`);
    reply.send({ message: 'ok' });
    return reply;
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: 'File not found' });
  }
});

if (stage === 'dev') {
  server.listen({ port: port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      server.log.error(err);
      process.exit(1);
    }
    server.log.info(`server listening on ${address}`);
  });
}

export default server;
