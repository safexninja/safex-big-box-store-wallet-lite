# Safex Big Box Store Wallet
## Description
Safex Big Box Store is a community study on developing applications on top of the [Safex](https://github.com/safex) blockchain and e-commerce protocol. This Safex Big Box Store Wallet is a webbased multiwallet manager and marketplace with messaging and simple order management. For e-commerce activities it is required to connect to a [Safex Big Box Store Front](https://github.com/safexninja/safex-big-box-store-front), which acts as a moderating and message relay service.

### Summary
Safex Big Box Store runs on the [Docker](https://docker.com) platform. It provides a webbased GUI wallet, which comes with a full package: it also contains a locally running Safex Daemon and a locally running Safex Block Explorer. Supported features:
- Creating wallets
- Restoring wallets
- Sending Safex Cash / Safex Tokens
- Staking / unstaking Safex Tokens
- Transaction history
- Generating payment ID's
- Creating / restoring merchant accounts
- Creating / editing offers on the blockchain
- Purchases offers
- Registering merchant account to multiple Safex Big Box Store Fronts
- Browsing different markets using different Safex Big Box Store Front ***URLs***
- Purchases and Order management, with status workflow
- Encrypted messaging between parties
- Safex Daemon / Blockchain node
- Block Explorer

***Safex Big Box Store Wallet is intended to run locally on the operating system of the intended user and is not intended to be run as a hosted service i.e. on a publicly accessible webserver to provide the service to other users.***


### Files
***!Important!: backup the `/files` directory frequently to prevent data loss***

In the `/files` directory the following sub directories will be created
- blockchain; containing the blockchain data
- wallets; the safex wallet files, created for each wallet
- database; the big box database, containing your keys, purchases, orders, messages etc.


### Components
The benefit of utilizing the Docker platform is that various components can easily be ran as separate services in an isolated environment, and enable a full package, containing:
- an application server
- a backend server
- a wallet server (for handling wallets, utilizing the [Safex NodeJS](https://github.com/safex/safex-nodejs-libwallet) library
- a safex node/daemon
- a safex block explorer
- a database server
- nginx webserver and reverse proxy to route traffic between components

Running a safex node and a block explorer locally makes you less dependend on another party hosting this for you. The basic wallet features (Send, Receive, Stake) can be then be done without connecting to an external service. It also brings faster response times; all the offer and pricepeg data that is required can be pulled from the local node.

![Alt text](/docs/images/components.png?raw=true "Components")

### Technical Details
#### Languages / Libs / Deps
Typescript, Express, Handlebars, MongoDb, Mongoose, Nginx, JWT authentication, Docker

#### Database encryption
The Mongo database uses password authentication using the master password that is set on the first run.

In regards of additional security the following data is saved encryted in the database, encrypted with a sha256 hash of the master password:
- Wallet private keys
- Account secret keys
- Wallet file password
- Contents of messages

#### Message encryption
The messages that go through a Safex Big Box Store Front between different parties are encrypted with RSA 4096

<br>

## Running on Mac OS
### Installing Docker
- Consider the [Docker Desktop License Agreement](https://docs.docker.com/subscription/desktop-license/)
- Download [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/), please mind there are different versions for various chipsets
- No need to create an account and/or sign in
- For better experience open the Docker Desktop app and go to Settings > Resources > Advanced
  + Set CPU and memory to at least half your available resources
  + Set Swap to Max
  + Set Disk image Size to at least 60GB if available

### Running the wallet
- Download the code as zip and unzip into a desired folder. 
- Open a terminal and navigate to that folder (or open terminal from that folder)
- Run the command `./run_wallet.sh` to start the wallet
- On the first run it will ask you for a master password (this password is required on the next run)
- After that, the app is available on "https://localhost"
- On the first run it might take a bit longer before everything has started
- On the first use you need to accept a security exception in the browser due to using a local SSL certificate
- To quit, in the terminal window press CTRL + C, wait for everything to shut down

If you'd like to see some statistics on the running services, open another terminal window and give the command `docker stats` (and press CTRL + C to quit this)

<br>

## Running Linux
### Installing Docker
#### Method 1: Script
Installing using Docker's [convenience script](https://docs.docker.com/engine/install/ubuntu/#install-using-the-convenience-script)
- curl -fsSL https://get.docker.com -o get-docker.sh
- sudo sh get-docker.sh
#### Method 2: Snap (Ubuntu)
On Ubuntu you can install Docker easily with snap
- `sudo apt install snapd` (on recent Ubuntu versions already installed by default)
- `sudo snap install docker`

### Running the wallet
- Download the code as zip and unzip into a desired folder. 
- Open a terminal and navigate to that folder (or open terminal from that folder)
- Run the command `sudo ./run_wallet.sh` to start the wallet
- On the first run it will ask you for a master password (this password is required on the next run)
- After that, the app is available on "https://localhost"
- On the first run it might take a bit longer before everything has started
- On the first use you need to accept a security exception in the browser due to using a local SSL certificate
- To quit, in the terminal window press CTRL + C, wait for everything to shut down

If you'd like to see some statistics on the running services, open another terminal window and give the command `sudo docker stats` (and press CTRL + C to quit this)

<br>

## Running On Windows
Windows works very differently from MacOs and Linux in regards of running Docker. For an experienced Docker user it is possible to use WSL2 to run the Linux containers on your Windows host. But for less experienced users it is advised to run the Linux version in a Virtual Machine using Virtual Box. There will be a video on how to do this shortly.

### Create VM
- Download [Virtual Box](https://www.virtualbox.org/) and install it.
- Download one of these Linux OS iso: 
  + [Ubuntu](https://ubuntu.com/download/desktop)
  + [Linux Mint](https://linuxmint.com/edition.php?id=302) (scroll down for download mirrors)
 
### Installing and Running
Then follow Linux steps

<br><br>

Copyright (c) 2018 The Safex Project.

Portions Copyright (c) 2014-2018 The Monero Project.

Portions Copyright (c) 2012-2013 The Cryptonote developers.
