# シナリオを利用する上での準備

## 本リポジトリを利用する上で必要となるもの

以下のものを自ら準備し、シナリオを起動する際に利用します。

- [Docker](https://docs.docker.com/get-docker/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- [Amazon Web Services アカウント](https://aws.amazon.com/jp/free/)

## 準備(Init Process)

シナリオを起動する際は、はじめに以下のコマンドを実行してください。
実行することによって、シナリオを AWS アカウントにデプロイする際に利用する認証情報を保存するためのファイルを作成を行います。

```sh
bash ./script/init.sh
```

作成されたファイルに、AWS IAM User の認証情報、または IAM Identity Center の認証情報を保存してください。

**Example: AWS IAM User**

```toml
[default]
region=ap-northeast-1
aws_access_key_id=AKIDUMYACCESSKEY
aws_secret_access_key=SECRETACCESSKEY
```

**Example: AWS IAM Identity Center**

```toml
[default]
region=ap-northeast-1
aws_access_key_id=ASIDUMYACCESSKEY
aws_secret_access_key=SECRETACCESSKEY
aws_session_token=SESSIONTOKEN
```

入力後、以下のコマンドを実行して、実行環境となるコンテナイメージのビルドと環境の初期化を行います。

```sh
bash ./script/cdk-script/init.sh
```

## すべてのシナリオの起動

```sh
make start-all
```

## 各シナリオの起動

各シナリオの起動は、[各シナリオのドキュメント](../../README.md#Basic) を参照してください。

また、Docker 等を用いないで起動する場合は、[challenge.env](../../challenge.env) を参照し、実行環境で環境変数を設定してください。

## シナリオの終了

シナリオの終了は、以下のコマンドを実行してください。

```sh
bash ./script/cdk-script/destroy.sh
```

---

[戻る](../../README.md)
