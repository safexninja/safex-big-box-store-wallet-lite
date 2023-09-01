import { UpdateWriteOpResult } from "mongoose";
import { Wallet } from "./models/models";
import { IWallet, IWalletId, IWalletStrict } from "./models/interfaces";
import { decryptWithHashString, encryptWithHashString } from "../crypto/crypto";

export async function addWallet(wallet: IWallet, encryptionHashString: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {

      wallet.spendKey = encryptWithHashString(wallet.spendKey, encryptionHashString)
      wallet.viewKey = encryptWithHashString(wallet.viewKey, encryptionHashString)
      wallet.password = encryptWithHashString(wallet.password, encryptionHashString)

      const newWallet = new Wallet(wallet);
      newWallet.save(function (error: any) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

export async function findWalletByUUID(uuid: string): Promise<IWalletStrict> {
  return new Promise<IWalletStrict>((resolve, reject) => {
    try {
      Wallet.findOne({ uuid }, function (error: Error, wallet: IWallet) {
        if (error) {
          reject(error);
        } else {
          if (wallet == null) {
            resolve(wallet);
          } else {
            resolve({
              uuid: wallet.uuid,
              user: wallet.user,
              creationHeight: wallet.creationHeight,
              label: wallet.label,
              address: wallet.address,
              height: wallet.height,
              cashBalance: wallet.cashBalance,
              unlockedCashBalance: wallet.unlockedCashBalance,
              tokenBalance: wallet.tokenBalance,
              unlockedTokenBalance: wallet.unlockedTokenBalance,
              lastError: wallet.lastError,
              timestamp: wallet.timestamp,
              deleted: wallet.deleted,
            });
          }
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}


export async function findWalletFullDataByUUID(uuid: string, encryptionHashString: string): Promise<IWallet> {
  return new Promise<IWallet>((resolve, reject) => {
    try {
      Wallet.findOne({ uuid }, function (error: Error, wallet: IWallet) {
        if (error) {
          reject(error);
        } else {
          wallet.spendKey = decryptWithHashString(wallet.spendKey, encryptionHashString)
          wallet.viewKey = decryptWithHashString(wallet.viewKey, encryptionHashString)
          wallet.password = decryptWithHashString(wallet.password, encryptionHashString)
          resolve(wallet)
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}


export async function findWalletsByUserUUID(
  uuid: string
): Promise<IWalletStrict[]> {
  return new Promise<IWalletStrict[]>((resolve, reject) => {
    try {
      Wallet.find({ user: uuid }, function (error: Error, wallets: IWallet[]) {
        if (error) {
          reject(error);
        } else {
          if (wallets == null) {
            resolve(wallets);
          } else {
                let returnedWallets: IWalletStrict[] = []
                wallets.forEach((wallet) => {
                      returnedWallets.push({
                        uuid: wallet.uuid,
                        user: wallet.user,
                        creationHeight: wallet.creationHeight,
                        label: wallet.label,
                        address: wallet.address,
                        height: wallet.height,
                        cashBalance: wallet.cashBalance,
                        unlockedCashBalance: wallet.unlockedCashBalance,
                        tokenBalance: wallet.tokenBalance,
                        unlockedTokenBalance: wallet.unlockedTokenBalance,
                        lastError: wallet.lastError,
                        timestamp: wallet.timestamp,
                        deleted: wallet.deleted,
                      })
                  })
                  resolve(returnedWallets)
          }
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}


export async function findWalletsIdByUserUUID(
  uuid: string
): Promise<IWalletId[]> {
  return new Promise<IWalletId[]>((resolve, reject) => {
    try {
      Wallet.find({ user: uuid, deleted: false }, function (error: Error, wallets: IWallet[]) {
        if (error) {
          reject(error);
        } else {
          if (wallets == null) {
            resolve(wallets);
          } else {
            let returnedWallets: IWalletId[] = []
            wallets.forEach((wallet) => {
                  returnedWallets.push({
                    uuid: wallet.uuid,
                    deleted: wallet.deleted,
                  })
              })
              resolve(returnedWallets)
          }
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}


export async function updateWalletLabel(
  uuid: string,
  label: string
): Promise<UpdateWriteOpResult> {
  return new Promise<UpdateWriteOpResult>((resolve, reject) => {
    try {
      Wallet.updateOne(
        { uuid },
        { label },
        function (error: Error, result: UpdateWriteOpResult) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    } catch (err) {
      reject(err);
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
): Promise<UpdateWriteOpResult> {
  return new Promise<UpdateWriteOpResult>((resolve, reject) => {
    try {
      Wallet.updateOne(
        { uuid },
        {
          height,
          cashBalance,
          unlockedCashBalance,
          tokenBalance,
          unlockedTokenBalance,
          timestamp,
        },
        function (error: Error, result: UpdateWriteOpResult) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

export async function updateWalletError(
  uuid: string,
  lastError: string
): Promise<UpdateWriteOpResult> {
  return new Promise<UpdateWriteOpResult>((resolve, reject) => {
    try {
      Wallet.updateOne(
        { uuid },
        { lastError },
        function (error: Error, result: UpdateWriteOpResult) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

export async function updateWalletDeleted(
  uuid: string,
  deleted: boolean
): Promise<UpdateWriteOpResult> {
  return new Promise<UpdateWriteOpResult>((resolve, reject) => {
    try {
      Wallet.updateOne(
        { uuid },
        { deleted },
        function (error: Error, result: UpdateWriteOpResult) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

export async function deletedWalletFromDatabase(uuid: string): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    try {
      Wallet.deleteOne({ uuid }, function (error: Error, result: any) {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}


export async function deletedWalletFromDatabaseByAddress(address: string): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    try {
      Wallet.deleteOne({ address }, function (error: Error, result: any) {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}


// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllWallets(): Promise<typeof Wallet> {
  return new Promise<typeof Wallet>((resolve, reject) => {
    try {
      Wallet.find(function (error: Error, wallet: typeof Wallet) {
        if (error) {
          reject(error);
        } else {
          resolve(wallet);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

export async function getWalletCount(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    try {
      Wallet.find(function (error: Error, wallets: typeof Wallet) {
        if (error) {
          reject(error);
        } else {
          resolve(wallets.length);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
