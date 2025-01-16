# Preparation for Using the Scenarios

## Requirements for Using This Repository

Please prepare the following items before starting the scenarios:

- [Docker](https://docs.docker.com/get-docker/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- [Amazon Web Services Account](https://aws.amazon.com/free/)

## Initialization Process

Before launching a scenario, execute the following command. This command creates a file to store authentication credentials for deploying scenarios to your AWS account.

```sh
bash ./script/init.sh
```

Save the credentials for your AWS IAM User or IAM Identity Center in the created file.

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

After entering the credentials, execute the following command to build the container image for the runtime environment and initialize the setup.

```sh
bash ./script/cdk-script/init.sh
```

## Launching Each Scenario

Refer to the [scenario documentation](../../README.en.md#Basic_Challenges) for instructions on launching each scenario.

Additionally, if you choose not to use Docker or similar tools for launching the scenarios, refer to [challenge.env](../../challenge.env) and configure the environment variables manually in your execution environment.

## Terminating Scenarios

To terminate the scenarios, execute the following command:

```sh
bash ./script/cdk-script/destroy.sh
```

---

[Back](../../README.en.md)
