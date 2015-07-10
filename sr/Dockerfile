# dev (cached): docker build --rm=false -t=sr .
# prod (uncached): docker build --no-cache=true -t=sr .
FROM ubuntu:trusty
MAINTAINER Garth Kidd <garth@netapp.com>

ENV DEBIAN_FRONTEND noninteractive
ENV SOURCES /etc/apt/sources.list
ENV APT_MIRR http://archive.ubuntu.com/ubuntu
ENV APT_NODE http://ppa.launchpad.net/chris-lea/node.js/ubuntu

RUN echo deb $APT_MIRR trusty main restricted universe > $SOURCES
RUN echo deb $APT_MIRR trusty-updates main restricted universe >> $SOURCES
RUN echo deb $APT_MIRR trusty-security main restricted universe >> $SOURCES
RUN echo deb $APT_NODE trusty main >> $SOURCES
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys C7917B12

# new best-practice way of updating and installing:
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git-core \
    make \
    mercurial \
    nodejs \
    uuid-dev

RUN npm install node-gyp

# cache ~always busted from this line on:
COPY . /build/sr
WORKDIR /build/sr
ENV HOME /root
ENV USER root
RUN /bin/bash -e bin/build-opt-dist /build/sr /build/synergy

# This container needs to be able to build and extract, so we're not using
# EXPOSE, ENTRYPOINT, or CMD.
