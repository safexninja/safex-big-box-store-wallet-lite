import { Account } from './models/models';
import { IAccount, IAccountId, IAccountStrict } from './models/interfaces';
import { UpdateWriteOpResult } from 'mongoose';
import { decryptWithHashString, encryptWithHashString } from '../crypto/crypto';

export async function addAccount(account: IAccount, encryptionHashString: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {

            account.secretKey = encryptWithHashString(account.secretKey, encryptionHashString)
            
            const newAccount = new Account(account)
            newAccount.save(function (error: any) {
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
};

export async function findAccountByUUID(uuid: string): Promise<IAccountStrict> {
    return new Promise<IAccountStrict>((resolve, reject) => {
        try {
            Account.findOne({uuid}, function (error: Error, account: IAccount) {
                if (error) {
                    reject(error);
                } else {
                    if(account == null) {
                        resolve(account);
                    } else {
                        resolve(
                            {
                                uuid: account.uuid,
                                user: account.user,
                                account: account.account,
                                status: account.status,
                                wallet: account.wallet,
                                creationHeight: account.creationHeight,
                                lastError: account.lastError,
                                deleted: account.deleted
                            }
                        )
                    }
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findAccountFullDataByUUID(uuid: string, encryptionHashString: string): Promise<IAccount> {
    return new Promise<IAccount>((resolve, reject) => {
        try {
            Account.findOne({uuid}, function (error: Error, account: IAccount) {
                if (error) {
                    reject(error);
                } else {
                    account.secretKey = decryptWithHashString(account.secretKey, encryptionHashString)
                    resolve(account)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findAccountByAccount(wallet: string, account: string, deleted: boolean): Promise<IAccountStrict> {
    return new Promise<IAccountStrict>((resolve, reject) => {
        try {
            Account.findOne({wallet, account, deleted}, function (error: Error, account: IAccount) {
                if (error) {
                    reject(error);
                } else {
                    if(account == null) {
                        resolve(account);
                    } else {
                        resolve(
                            {
                                uuid: account.uuid,
                                user: account.user,
                                account: account.account,
                                status: account.status,
                                wallet: account.wallet,
                                creationHeight: account.creationHeight,
                                lastError: account.lastError,
                                deleted: account.deleted
                            }
                        )
                    }
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findAccountsByUserUUID(uuid: string): Promise<IAccountStrict[]> {
    return new Promise<IAccountStrict[]>((resolve, reject) => {
        try {
            Account.find({user: uuid}, function (error: Error, accounts: IAccount[]) {
                if (error) {
                    reject(error);
                } else {
                    if(accounts == null) {
                        resolve(accounts);
                    } else {

                        let returnedAccounts: IAccountStrict[] = []
                        accounts.forEach((account) => {
                            returnedAccounts.push({
                                uuid: account.uuid,
                                user: account.user,
                                account: account.account,
                                status: account.status,
                                wallet: account.wallet,
                                creationHeight: account.creationHeight,
                                lastError: account.lastError,
                                deleted: account.deleted
                            })
                        })
                        resolve(returnedAccounts)

                    }
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findAccountsIdByUserUUID(uuid: string): Promise<IAccountId[]> {
    return new Promise<IAccountId[]>((resolve, reject) => {
        try {
            Account.find({user: uuid, deleted: false}, function (error: Error, accounts: IAccount[]) {
                if (error) {
                    reject(error);
                } else {
                    if(accounts == null) {
                        resolve(accounts);
                    } else {
                        let returnedAccounts: IAccountId[] = []
                        accounts.forEach((account) => {
                            returnedAccounts.push({
                                uuid: account.uuid,
                                deleted: account.deleted
                            })
                        })
                        resolve(returnedAccounts)

                    }
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllAccounts(): Promise<typeof Account> {
    return new Promise<typeof Account>((resolve, reject) => {
        try {
            Account.find(function (error: Error, account: typeof Account) {
                if (error) {
                    reject(error);
                } else {
                    resolve(account);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};


export async function updateAccountDeleted(
    uuid: string,
    deleted: boolean
  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Account.updateOne(
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

export async function updateAccountStatus(
    uuid: string,
    status: number
  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Account.updateOne(
          { uuid },
          { status },
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


export async function deletedAccountFromDatabase(uuid: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        Account.deleteOne(
          { uuid },
          function (error: Error, result: any) {
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



export async function getAccountCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        try {
            Account.find(function (error: Error, accounts: typeof Account) {
                if (error) {
                    reject(error);
                } else {
                    resolve(accounts.length);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};
