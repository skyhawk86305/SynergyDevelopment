# Performance measurement image.
# Stops short of installing source.
FROM ubuntu:trusty
MAINTAINER Garth Kidd <garth@netapp.com>

ENV NODE_VERSION 0.11.14
ENV DEBIAN_FRONTEND noninteractive
ENV SOURCES /etc/apt/sources.list
ENV APT_MIRR http://mirror.anl.gov/pub/ubuntu/

RUN echo deb $APT_MIRR trusty main restricted universe > $SOURCES
RUN echo deb $APT_MIRR trusty-updates main restricted universe >> $SOURCES
RUN echo deb $APT_MIRR trusty-security main restricted universe >> $SOURCES

# new best-practice way of updating and installing:
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git-core \
    make \
    mercurial \
    uuid-dev

RUN mkdir -p /usr/local/src && \
    cd /usr/local/src && \
    curl -OL https://github.com/joyent/node/archive/v${NODE_VERSION}.tar.gz && \
    tar xvzf v${NODE_VERSION}.tar.gz && \
    cd node-${NODE_VERSION} && \
    ./configure && \
    make install
