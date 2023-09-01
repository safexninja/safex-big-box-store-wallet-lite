FROM node:16.19.0-buster

RUN apt-get update -y 
RUN DEBIAN_FRONTEND="noninteractive" apt-get -y install tzdata

RUN apt-get install -y \
    sudo \
    git \
    rsync \
    nano 

ARG USER=docker
ARG USERID=1001
ENV HOME /home/$USER

RUN groupadd -g $USERID $USER 
RUN adduser -u $USERID -gid $USERID --disabled-password --gecos '' $USER

RUN adduser $USER sudo
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

USER $USER
WORKDIR $HOME
RUN mkdir safex
RUN mkdir git
RUN mkdir update

COPY run-update.sh $HOME/safex/run-update.sh
RUN sudo chmod +x $HOME/safex/run-update.sh

WORKDIR $HOME/safex

LABEL author="Safex.Ninja"
