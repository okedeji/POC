FROM ubuntu:16.04
MAINTAINER Tobi Okedeji <tobiokedeji@gmail.com>

RUN apt-get update && apt-get upgrade -y
RUN apt-get -y install \
    bzip2 \
    freetds-dev \
    git \
    libfontconfig \
    libfreetype6-dev \
    libicu-dev \
    libjpeg-dev \
    libldap2-dev \
    libmcrypt-dev \
    libmysqlclient-dev \
    libpng12-dev \
    libpq-dev \
    libwebp-dev \
    libxml2-dev \
    zlib1g-dev \
    zip \
    vim \
    wget \
    unzip

RUN apt-get -y install curl

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
#install nginx
RUN apt-get -y install nginx

RUN apt-get install -y nodejs

COPY ./package.json /root/package.json

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN apt-get update
RUN apt-get install -y gcc g++ make python3
# prepare a user which runs everything locally! - required in child images!
#RUN useradd -ms /bin/bash ubuntu
ARG NPM_TOKEN
RUN npm install pm2 -g

COPY ./ /var/www/corelocation
RUN ls /var/www/corelocation

COPY ./docker/start.sh /usr/local/bin/start.sh

#RUN mkdir /root/scripts

RUN chmod +x /usr/local/bin/start.sh 

WORKDIR /var/www/corelocation

RUN ls

RUN npm install
RUN npm run gitinfo
ENV APP_DIR=/var/www/corelocation

#set the terminal to xterm
RUN export TERM=xterm


CMD ["start.sh"]