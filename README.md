<div id="logo" style="text-align: center;">
  <img src=images/image.png>
</div>

<div id="description" style="text-align: center;">

<h2 id=title>Cross Site Scripting Challenges for Amazon Web Services Simple Storage Service (XSSS / XS3)</h2>

README: [日本語](README.md) | English (WIP)

また、利用にあたり、下記の[免責事項](#免責事項)を一読の上、ご利用ください。

</div>

## Description

このリポジトリは、BSides Tokyo 2024 開催までの 1 週間開催されていた、登壇者である [Azara](https://twitter.com/a_zara_n) と [ei](https://twitter.com/ei01241) が提供した CTF 形式の検証環境を、より開発者やセキュリティエンジニアが理解しやすいように再構成したものです。
リポジトリ内では、Amazon Web Services Simple Storage Service (S3) に代表されるオブジェクトストレージで発生するクロスサイトスクリプティング（XSS）について、実際に発生する可能性のあるシナリオや BadPractice を再現し、実際に攻撃方法を学び、最後に、対策方法を学ぶことができます。

技術的詳細に関してはブログ記事と、リンク先のスライドをご覧ください。

[XSS using dirty Content Type in cloud era](https://speakerdeck.com/flatt_security/xss-using-dirty-content-type-in-cloud-era)
[オブジェクトストレージにおけるファイルアップロードセキュリティ - クラウド時代に"悪意のあるデータの書き込み"を再考する](https://blog.flatt.tech/entry/object_storage)
[S3 経由で XSS!?不可思議な Content-Type の値を利用する攻撃手法の新観点](https://blog.flatt.tech/entry/content_type)

また、偉大なる先駆者である[Sergey Bobrov](https://github.com/BlackFan)氏の研究が、私たちの研究において理解を深める助けになりました。この場を借りて、お礼を申し上げます。

https://github.com/BlackFan/content-type-research/blob/master/XSS.md

## table of contents

- [Description](#description)
- [なぜ今、この問題を取り上げるのか？](#なぜ今この問題を取り上げるのか)
- [脆弱性の概要](#脆弱性の概要)
  - [Amazon Web Services Simple Storage Service (S3) におけるクロスサイトスクリプティング（XSS）](#amazon-web-services-simple-storage-service-s3-におけるクロスサイトスクリプティングxss)
  - [ブラウザにおける Content-Type の挙動と任意の Content-Type を設定することによる影響](#ブラウザにおける-content-type-の挙動と任意の-content-type-を設定することによる影響)
- [リスクの理解](#リスクの理解)
- [シナリオ](#シナリオ)
- [応用](#応用)
- [免責事項](#免責事項)
- [Special Thanks](#special-thanks)

## なぜ今、この問題を取り上げるのか？

Amazon Web Services Simple Storage Service (S3) は、オブジェクトストレージとして広く利用されており、多くの開発者が利用しています。しかし、その利用方法によっては、クロスサイトスクリプティング（XSS）が発生する可能性があります。この問題は、開発者が意識していないことが多く、そのため、この問題を取り上げることで、開発者が意識し、対策を行うことができるようになることを目的としています。

また、この問題は、実際に発生する可能性のある脆弱性を再現し、それに対する攻撃方法を学ぶことで、開発者やセキュリティエンジニアが、実際の脆弱性に対するリスクを理解し、対策や早期発見を行うことができるようになることを目的としています。

## 脆弱性の概要

### Amazon Web Services Simple Storage Service (S3) におけるクロスサイトスクリプティング（XSS）

Amazon Web Services Simple Storage Service (S3) に代表されるオブジェクトストレージでは、オブジェクトに対して特定のデータを付与することが可能で、それらをメタデータと呼称します。このメタデータには、Content-Type や Content-Disposition などの情報を付与することができますが、これらの情報に対して、開発者の意図しないデータが入力されることがあります。このような場合、クロスサイトスクリプティング（XSS）が発生する可能性があります。

これは、SDK などを用いたサーバーサイドからのアップロードであっても、署名付き URL を用いたクライアントサイドからのアップロードであっても、発生する可能性があります。

### ブラウザにおける Content-Type の挙動と任意の Content-Type を設定することによる影響

Content-Type から取得される MimeType は、ブラウザが取得したリソースを判別するために利用されます。たとえば、`text/html` であれば、ブラウザは HTML として解釈し、`image/png` であれば、ブラウザは PNG として解釈します。
これは、表示されるコンテンツを見ても明らかであり、`image/png` であれば、画像として表示されますが、`text/html` であれば、HTML として解釈され、レンダリングされます。

では、`image/png, text/html` という Content-Type を設定した場合、ブラウザはどのように挙動するでしょうか？

たとえば、前方が優先し判別される場合、`image/png` として解釈されるはずです。しかし、実際には後方の `text/html` として解釈されます。

このような挙動は、ブラウザの MimeType を定義した[whatwg - Fetch standard](https://fetch.spec.whatwg.org/#content-type-header)においても定義されているものであり、ブラウザの挙動として正しい挙動といえます。
しかし、この挙動は Validation の Bypass に利用される可能性があり、詳しく知る必要があります。

また、先のオブジェクトストレージにおけるクロスサイトスクリプティング（XSS）においても、掛け合わせて悪用することで、クロスサイトスクリプティング（XSS）が発生させるリスクがあります。
詳しくは、[こちら]()の資料をご覧ください。

## リスクの理解

この問題は、攻撃者が現在のブラウザや XSS を取り巻くセキュリティ対策として提唱されている CSP や特定のサニタイザーとはまた別の経路で引き起こすことができてしまうこと、また、実際に想定可能な構成で発生しうることから、開発者は注意を払う必要があります。

例えば、アップロードをしたファイルをサービスと同一ドメインから提供する場合があります。この場合、ブラウザは、そのファイルを同一オリジンとして扱い、そのファイルに対して、サービスの Cookie などの情報を付与します。そのため、攻撃者はアップロードするファイルに対して、XSS を引き起こす細工を施すことで、ブラウザ上で任意の JavaScript を実行させることが可能です。

詳しくは、シナリオを進めながら、そのリスクを理解していきます。

# チャレンジシナリオ

このリポジトリでは、以下のチャレンジシナリオを提供しています。
また、本リポジトリで展開されるシナリオの初期準備等は、[こちら](docs/manual/README.md)をご覧ください。

チャレンジシナリオは、Basic と Advanced に分かれています。
これらのチャレンジシナリオを進めるにあたり、特段の制約等はありません。公開されているチャレンジシナリオのソースコードをご覧ください。

## Basic

- [シナリオ 1 [Introduction] Server Side Upload 　- SDK を用いた任意の HTML ファイルのアップロード](docs/scenario1/README.md)
- [シナリオ 2 [Introduction] Pre Signed Upload 　- 署名付き URL を用いた任意の HTML ファイルのアップロード](docs/scenario2/README.md)
- [シナリオ 3 [Introduction] POST Policy 　- POST Policy を用いた任意の HTML ファイルのアップロード](docs/scenario3/README.md)
- [シナリオ 4 [Validation Bypass] - Validation の Bypass と任意の HTML ファイルのアップロード](docs/scenario4/README.md)
- [シナリオ 5 [Logic Bug] - Content-Type の組み立ての不備と任意のファイルのアップロード](docs/scenario5/README.md)

## Advanced

先に、シナリオでは、オブジェクトストレージにアップロードをする際に発生する実装不備と、ブラウザにおける Content-Type の挙動を用いた検証の Bypass について学びました。次に、それらを応用し、実際に攻撃を行う方法や、脅威、対策について学びます。

- [応用 1 - URL.createObjectURL による任意の HTML ファイルの Blob URL の生成](docs/advanced1/README.md)
- [応用 2 - Content-Type の Validation Bypass と Sniffing](docs/advanced2/README.md)
- [応用 3 - Amazon Cognito などの認証情報を盗む、そして悪用する](docs/advanced3/README.md)

# 免責事項

このリポジトリは、セキュリティエンジニアや開発者が、実際に発生する可能性のある脆弱性についてのリスクや対策を学ぶためのものです。このリポジトリを使用して、他者に対して攻撃を行うことは禁止されています。
また、このリポジトリを使用して、他者に対して攻撃を行うことによって発生した損害について、作成者を含む全てのコントリビュータは一切の責任を負いません。

本リポジトリを使用する際には、自己責任で使用することを前提とし、各国の法律や職業倫理に従って使用してください。

# その他

## お問い合わせ

このリポジトリについての質問や要望がある場合は、Issue または、X(Twitter)の[@a_zara_n](https://twitter.com/a_zara_n)までご連絡ください。

## もっと AWS やクラウドセキュリティについて学びたい方へ

AWS やクラウドセキュリティについて学びたい方は、以下の資料をご覧ください。

- [AWS CDK Security Challenges (自推)](https://github.com/a-zara-n/aws-cdk-security-challenges)
- [AWS Ramp-Up Guide 〜セキュリティ編〜](https://dev.classmethod.jp/articles/aws-ramp-up-guide-security-shirabetemita/)
- [awesome-aws-security](https://github.com/jassics/awesome-aws-security)

## 謝辞

下記の皆様のご協力をいただき、本リポジトリ、及び関連する資料の公開に至りました。

- [Sergey Bobrov](https://github.com/BlackFan)氏
- Flatt Security の社内で検証や資料準備にご協力いただいた皆様
- 相談や後押しをしてくださった皆様
- XS3 Challenge CTF に参加いただいた皆様、及びフィードバック、Writeup を公開いただいた皆様
- BSides Tokyo 2024 開催にあたり運営、そして参加いただいた皆様
- Security-JAWS のワークショップでご協力いただいた運営、そして参加いただいた皆様

ご協力いただき、ありがとうございました。

## Write Ups

- https://blog.hamayanhamayan.com/entry/2024/04/27/093508
- https://y0d3n.hatenablog.com/entry/2024/04/05/080214
- https://r1k0t3k1.github.io/note/blog/XS3-Writeup
- https://www.ctfiot.com/172054.html
- https://github.com/satoki/ctf_writeups/tree/master/XS3_Challenges
- https://www.youtube.com/watch?v=M5Nn3EEk_oM
- https://www.youtube.com/watch?v=oFhrPva1Ppg
