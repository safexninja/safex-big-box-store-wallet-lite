import * as fs from 'fs';
import { log, LogLevel} from '../common/utils/logger';
import * as crypto from '../common/crypto/crypto'

// overridable from env vars:
// LOGLEVEL
// NETWORK
// DAEMON_ADDRESS
// DAEMON_PORT
// FILE_STORE_DIR
// WALLET_INTACTIVE_TIMEOUT
// PORT
// DB_HOST
// DB_NAME
// DB_USER
// DB_PASSWORD

const NETWORK = process.env.NETWORK || "stagenet";
process.env.NETWORK = NETWORK

const configuration = require(`./configs/config.${NETWORK}.json`);

export const CONFIG = {
    Network : configuration.network,
    DaemonAddress: process.env.DAEMON_ADDRESS || configuration.daemonAddress,
    DaemonPort: process.env.DAEMON_PORT ||configuration.daemonPort,
    FileStoreDir: process.env.FILE_STORE_DIR || configuration.fileStoreDir,
    WalletInactiveTimeout: process.env.WALLET_INTACTIVE_TIMEOUT || configuration.walletInactiveTimeout,
    Port: process.env.PORT || configuration.port,
    DbHost: process.env.DB_HOST || configuration.dbHost,
    DbName: process.env.DB_NAME || configuration.dbName,
    DbUser: process.env.DB_USER || configuration.dbUser,
    DbPassword: process.env.DB_PASSWORD || configuration.dbPassword,
    DbPort: process.env.DB_PORT || configuration.dbPort,
    HashedMasterPassword: ""
};

CONFIG.HashedMasterPassword = crypto.createHash(CONFIG.DbPassword)

// log(LogLevel.INFO, "CONFIG: " +  JSON.stringify(CONFIG))

fs.access(CONFIG.FileStoreDir, fs.constants.W_OK, function(err) {
    if(err){
      log(LogLevel.ERROR, CONFIG.FileStoreDir + " is not writable")
      process.exit(1);
    }
  });
