import * as fs from 'fs';
import { log, LogLevel} from '../common/utils/logger';
import * as crypto from '../common/crypto/crypto'

// overridable from env vars:
// LOGLEVEL
// NETWORK
// DAEMON_ADDRESS
// DAEMON_PORT
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
    Port: process.env.PORT || configuration.port,
    DbName: process.env.DB_NAME || configuration.dbName,
    DbPath: process.env.DB_PATH || "",
    HashedMasterPassword: ""
};

// TODO impl other method for hashing users password
CONFIG.HashedMasterPassword = crypto.createHash("safex")

// log(LogLevel.INFO, "CONFIG: " +  JSON.stringify(CONFIG))