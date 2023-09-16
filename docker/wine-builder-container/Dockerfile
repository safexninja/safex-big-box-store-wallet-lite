FROM electronuserland/builder:16-wine-mono

RUN apt-get update -y 

RUN apt-get install -y \
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
    nano \
    sudo 

ARG USER=docker
ARG USERID=1000
ENV HOME /home/$USER
RUN groupadd -g $USERID $USER 
RUN adduser -u $USERID -gid $USERID --disabled-password --gecos '' $USER

RUN adduser $USER sudo
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

USER $USER
WORKDIR $HOME

LABEL author="Safex.Ninja"