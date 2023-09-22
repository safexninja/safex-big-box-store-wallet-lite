import { IWallet, IWalletId, IWalletStrict } from "./models/interfaces";
import { decryptWithHashString, encryptWithHashString } from "../crypto/crypto";
import { getDb } from './connection';

export async function addWallet(wallet: IWallet, encryptionHashString: string): Promise<void> {

  return new Promise<void>((resolve, reject) => {
    try {

      wallet.spendKey = encryptWithHashString(wallet.spendKey, encryptionHashString)
      wallet.viewKey = encryptWithHashString(wallet.viewKey, encryptionHashString)
      wallet.password = encryptWithHashString(wallet.password, encryptionHashString)

        getDb().prepare(`INSERT INTO wallet (
            uuid,
            user,
            password,
            creationHeight,
            label,
            address,
            spendKey,
            viewKey,
            height,
            cashBalance,
            unlockedCashBalance,
            tokenBalance,
            unlockedTokenBalance,
            lastError,
            timestamp,
            deleted
        ) VALUES (
            '${wallet.uuid}',
            '${wallet.user}',
            '${wallet.password}',
            ${wallet.creationHeight},
            '${wallet.label}',
            '${wallet.address}',
            '${wallet.spendKey}',
            '${wallet.viewKey}',
            ${wallet.height},
            ${wallet.cashBalance},
            ${wallet.unlockedCashBalance},
            ${wallet.tokenBalance},
            ${wallet.unlockedTokenBalance},
            '${wallet.lastError}',
            ${wallet.timestamp},
            ${wallet.deleted}
      
        )`).run()
        resolve()
    } catch (err) {
        reject(err);
    }
  });

}

export async function findWalletByUUID(uuid: string): Promise<IWalletStrict> {

  return new Promise<IWalletStrict>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM walletStrict WHERE uuid='${uuid}'`).get() as IWalletStrict
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });

}


export async function findWalletFullDataByUUID(uuid: string, encryptionHashString: string): Promise<IWallet> {

  return new Promise<IWallet>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM wallet WHERE uuid='${uuid}'`).get() as IWallet
        if(res){
          res.spendKey = decryptWithHashString(res.spendKey, encryptionHashString)
          res.viewKey = decryptWithHashString(res.viewKey, encryptionHashString)
          res.password = decryptWithHashString(res.password, encryptionHashString)
        }
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });

}


export async function findWalletsByUserUUID(
  userUuid: string
): Promise<IWalletStrict[]> {
  return new Promise<IWalletStrict[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM walletStrict WHERE user='${userUuid}'`).all() as IWalletStrict[]
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
}


export async function findWalletsIdByUserUUID(
  userUuid: string
): Promise<IWalletId[]> {

  return new Promise<IWalletId[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM walletId WHERE user='${userUuid}'`).all() as IWalletId[]
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });

}


export async function updateWalletLabel(
  uuid: string,
  label: string
): Promise<boolean> {

  return new Promise<boolean>((resolve, reject) => {
    try {
        getDb().prepare(`UPDATE wallet SET label='${label}' WHERE uuid='${uuid}'`).run()
        resolve(true)
    } catch (err) {
        reject(false);
    }
  });

}

export async function updateWalletInfo(
  uuid: string,
  height: number,
  cashBalance: number,
  unlockedCashBalance: number,
  tokenBalance: number,
  unlockedTokenBalance: number,
  timestamp: number
): Promise<boolean> {

  return new Promise<boolean>((resolve, reject) => {
    try {
        getDb().prepare(`UPDATE wallet 
        SET height=${height},
        cashBalance=${cashBalance},
        unlockedCashBalance=${unlockedCashBalance},
        tokenBalance=${tokenBalance},
        unlockedTokenBalance=${unlockedTokenBalance},
        timestamp=${timestamp}
        WHERE uuid='${uuid}'`).run()
        resolve(true)
    } catch (err) {
        reject(false);
    }
  });

  
}

export async function updateWalletError(
  uuid: string,
  lastError: string
): Promise<boolean> {

  return new Promise<boolean>((resolve, reject) => {
    try {
        getDb().prepare(`UPDATE wallet 
        SET lastError='${lastError}'
        WHERE uuid='${uuid}'`).run()
        resolve(true)
    } catch (err) {
        reject(false);
    }
  });

}

export async function updateWalletDeleted(
  uuid: string,
  deleted: boolean
): Promise<boolean> {

  return new Promise<boolean>((resolve, reject) => {
    try {
        getDb().prepare(`UPDATE wallet 
        SET deleted=${deleted}
        WHERE uuid='${uuid}'`).run()
        resolve(true)
    } catch (err) {
        reject(false);
    }
  });

}

