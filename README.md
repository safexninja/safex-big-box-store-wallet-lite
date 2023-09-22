# Safex Big Box Store Wallet Lite
## Description
Safex Big Box Store is a community study on developing applications on top of the [Safex](https://github.com/safex) blockchain and e-commerce protocol. This Safex Big Box Store Wallet is a multiwallet manager and marketplace with messaging and simple order management. For e-commerce activities it is required to connect to a [Safex Big Box Store Front](https://github.com/safexninja/safex-big-box-store-front), which acts as a moderating and message relay service.

### Summary
Safex Big Box Store Wallet Lite is an Electron app. It provides a webbased GUI wallet. Supported features:
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


### Files
***!Important!: backup the files directory frequently to prevent data loss***
The data and files of the application are located at:
- Windows: C:\Users<USERNAME>\AppData\Roaming\Safex-Big-Box-Store-Wallet\
- Mac: ~/Library/Application Support/Safex-Big-Box-Store-Wallet
- Linux: ~/.config/Safex-Big-Box-Store-Wallet

In the `/bigbox` directory the following sub directories will be created
- wallets; the safex wallet files, created for each wallet
- database; the big box database, containing your keys, purchases, orders, messages etc.

### Technical Details
#### Languages / Libs / Deps
Typescript, Express, Handlebars, Sqlite3, JWT authentication, Electron

#### Database encryption
In regards of additional security the following data is saved encryted in the database, encrypted with a sha256 hash of the user's password:
- Wallet private keys
- Account secret keys
- Wallet file password
- Contents of messages

#### Message encryption
The messages that go through a Safex Big Box Store Front between different parties are encrypted with RSA 4096

<br><br>

Copyright (c) 2018 The Safex Project.

Portions Copyright (c) 2014-2018 The Monero Project.

Portions Copyright (c) 2012-2013 The Cryptonote developers.
