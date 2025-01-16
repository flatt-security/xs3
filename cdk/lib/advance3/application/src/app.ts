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
    contentType: string;
    length: number;
  };
}>('/api/upload', async (request, reply) => {
  if (!request.body.contentType || !request.body.length) {
    return reply.code(400).send({ error: 'No file uploaded' });
  }

  if (request.body.length > 1024 * 1024 * 100) {
    return reply.code(400).send({ error: 'File too large' });
  }

  const [contentType, ...params] = request.body.contentType.split(';');
  const type = contentType.split('/')[0].toLowerCase();
  const subtype = contentType.split('/')[1].toLowerCase();

  const denyMimeSubTypes = ['html', 'javascript', 'xml', 'json', 'svg', 'xhtml', 'xsl'];
  if (denyMimeSubTypes.includes(subtype)) {
    return reply.code(400).send({ error: 'Invalid file type' });
  }
  const denyStrings = new RegExp('[;,="\'()]');
  if (denyStrings.test(type) || denyStrings.test(subtype)) {
    return reply.code(400).send({ error: 'Invalid Type or SubType' });
  }

  const filename = uuidv4();
  const s3 = new S3Client({});
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `upload/${filename}`,
    ContentLength: request.body.length,
    ContentType: `${type}/${subtype}`,
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
