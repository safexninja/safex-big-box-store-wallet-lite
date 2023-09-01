FROM node:16.19.0-buster

RUN apt-get update -y 
RUN DEBIAN_FRONTEND="noninteractive" apt-get -y install tzdata

RUN apt-get install -y \
    sudo \
    build-essential \ 
    cmake \
    make \
    libboost-all-dev \
    miniupnpc \
    graphviz \
    doxygen \
    pkg-config \
    libcurl4-openssl-dev \
    libgtest-dev \
    libreadline-dev \
    libsodium-dev \
    libzmq3-dev \
    libpcsclite-dev \
    libunwind8-dev \
    libssl-dev \ 
    libunbound-dev \ 
    libminiupnpc-dev \
    liblzma-dev \ 
    libldns-dev \
    libexpat1-dev \
    libprotobuf-dev \
    git \
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
RUN mkdir files

# Build safex-nodejs-libwallet
RUN git clone https://github.com/safex/safex-nodejs-libwallet
WORKDIR $HOME/safex-nodejs-libwallet
RUN npm install node-pre-gyp
RUN build_type="linux" npm run build
RUN sudo npm link

COPY run-wallet-server.sh $HOME/safex/run-wallet-server.sh
RUN sudo chmod +x $HOME/safex/run-wallet-server.sh

COPY run-api-server.sh $HOME/safex/run-api-server.sh
RUN sudo chmod +x $HOME/safex/run-api-server.sh

COPY run-app-server.sh $HOME/safex/run-app-server.sh
RUN sudo chmod +x $HOME/safex/run-app-server.sh

WORKDIR $HOME/safex

LABEL author="Safex.Ninja"


