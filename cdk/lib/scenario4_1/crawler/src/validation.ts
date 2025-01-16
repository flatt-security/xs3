import { SQSEvent } from 'aws-lambda';

export const validateURL = (url: string) => {
  if (!url) {
    throw new Error('URL is required');
  }
  // ALLOWED_URL is Challenge Page URL
  if (!url.startsWith(process.env.ALLOWED_URL || 'https://example.com/')) {
    throw new Error('URL must start with http');
  }
};

export const validateSQSEvent = async (event: SQSEvent) => {
  if (!event.Records) {
    throw new Error('No records in the event');
  }
  if (event.Records.length === 0) {
    throw new Error('Only one record is allowed');
  }

  await Promise.all(
    event.Records.map(async (record) => {
      if (!record.body) {
        throw new Error('No body in the record');
      }
      validateURL(record.body);
    }),
  );
};
