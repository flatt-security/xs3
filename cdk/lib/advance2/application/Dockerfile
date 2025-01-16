FROM node:latest

RUN apt-get update && apt-get install -y git
ENV BUCKET_NAME=xs3-testing-bucket
WORKDIR /app
COPY ./src /app
RUN npm install
RUN npm run build
CMD ["npm", "run","start"]