#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Scenario1Stack, Scenario2Stack, Scenario3Stack, Scenario4_1Stack, Scenario4_2Stack, Scenario4_3Stack, Scenario5Stack, Adv1Stack, Adv2Stack, Adv3Stack } from '../lib/';
const app = new cdk.App();

const environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};
const props = {
  env: environment,
};

new Scenario1Stack(app, props);
new Scenario2Stack(app, props);
new Scenario3Stack(app, props);
new Scenario4_1Stack(app, props);
new Scenario4_2Stack(app, props);
new Scenario4_3Stack(app, props);
new Scenario5Stack(app, props);
new Adv1Stack(app, props);
new Adv2Stack(app, props);
new Adv3Stack(app, props);
