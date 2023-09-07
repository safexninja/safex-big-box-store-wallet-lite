import { Account } from './models/models';
import { IAccount, IAccountId, IAccountStrict } from './models/interfaces';
import { UpdateWriteOpResult } from 'mongoose';
import { decryptWithHashString, encryptWithHashString } from '../crypto/crypto';
import { getDb } from './connection';

export async function addAccount(account: IAccount, encryptionHashString: string): Promise<void> {    
    return new Promise<void>((resolve, reject) => {
        try {
            account.secretKey = encryptWithHashString(account.secretKey, encryptionHashString)
            getDb().prepare(`INSERT INTO account (
                uuid,
                user,
                account,
                status,
                wallet,
                creationHeight,
                secretKey,
                lastError,
                deleted
            ) VALUES (
                '${account.uuid}',
                '${account.user}',
                '${account.account}',
                ${account.status},
                '${account.wallet}',
                ${account.creationHeight},
                '${account.secretKey}',
                '${account.lastError}',
                ${account.deleted}
            )`).run()
            resolve()
        } catch (err) {
            reject(err);
        }
    });
};

export async function findAccountByUUID(uuid: string): Promise<IAccountStrict> {
    return new Promise<IAccountStrict>((resolve, reject) => {
        try {
            const account = getDb().prepare(`SELECT * FROM accountStrict WHERE uuid='${uuid}'`).get() as IAccountStrict
            resolve(account)
        } catch (err) {
            reject(err);
        }
    });
};

export async function findAccountFullDataByUUID(uuid: string, encryptionHashString: string): Promise<IAccount> {
    return new Promise<IAccount>((resolve, reject) => {
        try {
            const account = getDb().prepare(`SELECT * FROM account WHERE uuid='${uuid}'`).get() as IAccount
            account.secretKey = decryptWithHashString(account.secretKey, encryptionHashString)
            resolve(account)
        } catch (err) {
            reject(err);
        }
    });
};

export async function findAccountByAccount(wallet: string, account: string, deleted: boolean): Promise<IAccountStrict> {
    return new Promise<IAccountStrict>((resolve, reject) => {
        try {
            const acc = getDb().prepare(`SELECT * FROM accountStrict WHERE wallet='${wallet}' AND account='${account}' AND deleted=${deleted}`).get() as IAccountStrict
            resolve(acc)
        } catch (err) {
            reject(err);
        }
    });
};

export async function findAccountsByUserUUID(uuid: string): Promise<IAccountStrict[]> {
    return new Promise<IAccountStrict[]>((resolve, reject) => {
        try {
            const acc = getDb().prepare(`SELECT * FROM accountStrict WHERE user='${uuid}'`).all() as IAccountStrict[]
            resolve(acc)
        } catch (err) {
            reject(err);
        }
    });
};

export async function findAccountsIdByUserUUID(userUuid: string): Promise<IAccountId[]> {
    return new Promise<IAccountId[]>((resolve, reject) => {
        try {
            const acc = getDb().prepare(`SELECT * FROM accountId WHERE user='${userUuid}'`).all() as IAccountId[]
            console.log(acc)
            resolve(acc)
        } catch (err) {
            reject(err);
        }
    });
};

// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllAccounts(): Promise<typeof Account[]> {
    return new Promise<typeof Account[]>((resolve, reject) => {
        try {
            const acc = getDb().prepare(`SELECT * FROM account`).all() as typeof Account[]
            resolve(acc)
        } catch (err) {
            reject(err);
        }
    });
};


export async function updateAccountDeleted(
    uuid: string,
    deleted: boolean
  ): Promise<boolean> {

    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`UPDATE account SET deleted=${deleted} WHERE uuid='${uuid}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
  }

export async function updateAccountStatus(
    uuid: string,
    status: number
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`UPDATE account SET status='${status}' WHERE uuid='${uuid}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
  }


export async function deletedAccountFromDatabase(uuid: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`DELETE FROM account WHERE uuid='${uuid}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
  }



export async function getAccountCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        try {
            const count = getDb().prepare(`SELECT COUNT(uuid) FROM account`).get() as number
            resolve(count)
        } catch (err) {
            reject(err);
        }
    });
};
