import SqlLite from 'better-sqlite3';
import { log } from '../utils/logger'
import { LogLevel } from '../utils/logger';

var sqlDatabase: SqlLite.Database
export var NULL_VALUE = `NULL`

function setDb(db: SqlLite.Database): void   {
   sqlDatabase = db
}

export function getDb(): SqlLite.Database   {
    return sqlDatabase
}

export function connectDb(path: string): void   {
    try {
        const db = new SqlLite(path, {verbose: console.log})
        db.pragma('journal_mode = WAL');
        setDb(db)
        log(LogLevel.MESSAGE, "Opened database:  " + path)
    } catch (error) {
        log(LogLevel.MESSAGE, "Error on connecting database: " + error)
    }
}


export function createTables(): void   {
    try {
        const db = getDb()

        // create USER table
        db.exec(`CREATE TABLE IF NOT EXISTS user (
            uuid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            password TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            termsAccepted NUMERIC NOT NULL,
            logsLastSeen NUMERIC NOT NULL,
            passwordHashed NUMERIC NOT NULL
        );`)


        // create USER STRICT view
        db.exec(`CREATE VIEW IF NOT EXISTS userStrict 
        AS
        SELECT 
            uuid,
            name,
            status,
            termsAccepted,
            logsLastSeen
        FROM user        
        ;`)


         // create USER SETTINGS table
         db.exec(`CREATE TABLE IF NOT EXISTS userSettings (
            uuid TEXT PRIMARY KEY,
            user TEXT NOT NULL,
            defaultCountry TEXT NOT NULL,
            defaultAddress TEXT NOT NULL,
            daemonAddress TEXT NOT NULL,
            explorerAddress TEXT NOT NULL
        );`)

         // create WALLET table
         db.exec(`CREATE TABLE IF NOT EXISTS wallet (
            uuid TEXT PRIMARY KEY,
            user TEXT NOT NULL,
            password TEXT NOT NULL,
            creationHeight INTEGER NOT NULL,
            label TEXT NOT NULL,
            address TEXT NOT NULL,
            spendKey TEXT NOT NULL,
            viewKey TEXT NOT NULL,
            height INTEGER NOT NULL,
            cashBalance NUMERIC NOT NULL,
            unlockedCashBalance NUMERIC NOT NULL,
            tokenBalance NUMERIC NOT NULL,
            unlockedTokenBalance NUMERIC NOT NULL,
            lastError  TEXT NOT NULL,
            timestamp NUMERIC NOT NULL,
            deleted NUMERIC NOT NULL
        );`)


         // create WALLET STRICT view
         db.exec(`CREATE VIEW IF NOT EXISTS walletStrict 
         AS
         SELECT 
             uuid,
             user,
             creationHeight,
             label,
             address,
             height,
             cashBalance,
             unlockedCashBalance,
             tokenBalance,
             unlockedTokenBalance,
             lastError,
             timestamp,
             deleted
         FROM wallet        
         ;`)

          // create WALLET ID view
          db.exec(`CREATE VIEW IF NOT EXISTS walletId 
          AS
          SELECT 
              uuid,
              user,
              deleted
          FROM wallet        
          ;`)


        // create ACCOUNT table
         db.exec(`CREATE TABLE IF NOT EXISTS account (
            uuid TEXT PRIMARY KEY,
            user TEXT NOT NULL,
            account TEXT NOT NULL,
            status INTEGER NOT NULL,
            wallet TEXT NOT NULL,
            creationHeight INTEGER NOT NULL,
            secretKey TEXT NOT NULL,
            lastError TEXT NOT NULL,
            deleted NUMERIC NOT NULL
        );`)

         // create ACCOUNT STRICT view
         db.exec(`CREATE VIEW IF NOT EXISTS accountStrict 
         AS
         SELECT 
             uuid,
             user,
             account,
             status,
             wallet,
             creationHeight,
             lastError,
             deleted
         FROM account        
         ;`)

         // create ACCOUNT ID view
         db.exec(`CREATE VIEW IF NOT EXISTS accountId
         AS
         SELECT 
             uuid,
             user,
             deleted
         FROM account        
         ;`)

         // create CONNECTED API table
         db.exec(`CREATE TABLE IF NOT EXISTS connectedApi (
            uuid TEXT PRIMARY KEY,
            user TEXT NOT NULL,
            url TEXT NOT NULL,
            isActiveApi NUMERIC NOT NULL,
            messageAddress TEXT NOT NULL,
            privateKey TEXT NOT NULL,
            publicKey TEXT NOT NULL,
            timestamp NUMERIC NOT NULL
        );`)

         // create SELLER REGISTRATION table
         db.exec(`CREATE TABLE IF NOT EXISTS sellerRegistration (
            uuid TEXT PRIMARY KEY,
            user TEXT NOT NULL,
            url TEXT NOT NULL,
            account TEXT NOT NULL,
            token TEXT NOT NULL,
            revokeToken TEXT NOT NULL,
            timestamp NUMERIC NOT NULL
        );`)

        // create SELLER OFFER REGISTRATION table
        db.exec(`CREATE TABLE IF NOT EXISTS sellerOfferRegistration (
            uuid TEXT PRIMARY KEY,
            sellerRegistrationUuid TEXT NOT NULL,
            offerUuid TEXT NOT NULL,
            offerId TEXT NOT NULL,
            removeToken TEXT NOT NULL
        );`)

        // create PURCHASE table
        db.exec(`CREATE TABLE IF NOT EXISTS purchases (
            uuid TEXT PRIMARY KEY,
            user TEXT NOT NULL,
            connectedApi TEXT NOT NULL,
            title TEXT NOT NULL,
            seller TEXT NOT NULL,
            sellerPubkey TEXT NOT NULL,
            buyerMessageAddress TEXT NOT NULL,
            buyerPubkey TEXT NOT NULL,
            buyerPrivKey TEXT NOT NULL,
            timestamp NUMERIC NOT NULL,
            offerId TEXT NOT NULL,
            txn TEXT NOT NULL,
            txnProofSignature TEXT NOT NULL,
            txnStatus TEXT NOT NULL,
            blockHeight INTEGER,
            blockTimestamp NUMERIC,
            blockConfirmations INTEGER,
            quantity INTEGER,
            price NUMERIC,
            communicationStatus TEXT NOT NULL,
            hasNewMessages NUMERIC NOT NULL,
            purchaseStatus TEXT NOT NULL,
            wallet TEXT NOT NULL,
            rated NUMERIC NOT NULL,
            feedbackStars INTEGER,
            feedbackComment TEXT
        );`)


         // create ORDERS table
         db.exec(`CREATE TABLE IF NOT EXISTS orders (
            uuid TEXT PRIMARY KEY,
            user TEXT NOT NULL,
            sellerRegistration TEXT NOT NULL,
            title TEXT NOT NULL,
            account TEXT NOT NULL,
            timestamp NUMERIC NOT NULL,
            offerId TEXT NOT NULL,
            address TEXT NOT NULL,
            txn TEXT NOT NULL,
            txnProofSignature TEXT NOT NULL,
            txnProofSignatureValid NUMERIC,
            txnStatus TEXT NOT NULL,
            blockHeight INTEGER,
            blockTimestamp NUMERIC,
            blockConfirmations INTEGER,
            quantity INTEGER,
            price NUMERIC,
            receivedCash NUMERIC,
            messageAddress TEXT NOT NULL,
            messagePubkey TEXT NOT NULL,
            communicationStatus TEXT NOT NULL,
            hasNewMessages NUMERIC NOT NULL,
            orderStatus TEXT NOT NULL
        );`)

        // create MESSAGE table
        db.exec(`CREATE TABLE IF NOT EXISTS message (
            uuid TEXT NOT NULL,
            messageType TEXT NOT NULL,
            purchaseUuid TEXT,
            orderUuid TEXT,
            message TEXT NOT NULL,
            signatureValid NUMERIC NOT NULL,
            timestamp NUMERIC NOT NULL,
            status TEXT NOT NULL,
            direction TEXT NOT NULL,
            deleteToken TEXT NOT NULL
        );`)

        // create TXN HISTORY table
        db.exec(`CREATE TABLE IF NOT EXISTS txnHistory (
            wallet TEXT,
            timestamp NUMERIC NOT NULL,
            txnId TEXT NOT NULL,
            paymentId TEXT NOT NULL,
            direction TEXT NOT NULL,
            pending NUMERIC NOT NULL,
            type TEXT NOT NULL,
            cashAmount NUMERIC NOT NULL,
            tokenAmount NUMERIC NOT NULL,
            fee NUMERIC NOT NULL,
            blockHeight INTEGER NOT NULL,
            confirmations INTEGER NOT NULL
        );`)

        // create ERROR LOG table
        db.exec(`CREATE TABLE IF NOT EXISTS errorLog (
            uuid TEXT PRIMARY KEY,
            user TEXT NOT NULL,
            component TEXT NOT NULL,
            severity TEXT NOT NULL,
            timestamp NUMERIC NOT NULL,
            message TEXT NOT NULL
        );`)





    } catch (error) {
        log(LogLevel.ERROR, "Error while creating database tables " + error)
    }
}


export function disconnectDb(): void {
    log(LogLevel.INFO, "Closing database ...")
    getDb().close()
};
