import { SQSEvent } from 'aws-lambda';
import { validateSQSEvent } from './validation';
import { crawler } from './crawler';

module.exports.handler = async (event: SQSEvent): Promise<void> => {
  try {
    validateSQSEvent(event);
  } catch (error) {
    console.error('Validation failed', error);
    return;
  }
  console.log('Validation passed');
  try {
    await Promise.all(
      event.Records.map(async (record) => {
        await crawler(record.body);
      }),
    );
  } catch (error) {
    console.error('Failed to crawl', error);
  }
};
