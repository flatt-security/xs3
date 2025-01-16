import server from './app';
import awsLambdaFastify from '@fastify/aws-lambda';

module.exports.handler = awsLambdaFastify(server, {
  retainStage: true,
  pathParameterUsedAsPath: 'proxy',
});
