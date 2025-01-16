FROM node:latest

RUN apt-get update && \
    apt-get install -y \
    git \
    g++ \
    make \
    cmake \
    unzip \
    libcurl4-openssl-dev \
    build-essential \
    autoconf \
    libtool \
    m4 \
    python3 \
    libssl-dev
WORKDIR /app
COPY ./src /app
RUN npm install
RUN npm install aws-lambda-ric

