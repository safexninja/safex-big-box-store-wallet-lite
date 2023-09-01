import { TxnHistory } from './models/models';
import { ITxnHistory } from './models/interfaces';

export async function addTxn(txnHistory: ITxnHistory): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const txn = new TxnHistory(txnHistory)
            txn.save(function (error: any) {
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

export async function findHistoryByWallet(wallet: string): Promise<ITxnHistory[]> {
    return new Promise<ITxnHistory[]>((resolve, reject) => {
        try {
            TxnHistory.find({wallet}, function (error: Error, history: ITxnHistory[]) {
                if (error) {
                    reject(error);
                } else {
                        resolve(history)                    
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllTxns(): Promise<ITxnHistory[]> {
    return new Promise<ITxnHistory[]>((resolve, reject) => {
        try {
            TxnHistory.find(function (error: Error, history: ITxnHistory[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(history);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};



export async function deleteHistoryByWallet(wallet: string): Promise<ITxnHistory[]> {
    return new Promise<ITxnHistory[]>((resolve, reject) => {
        try {
            TxnHistory.deleteMany({wallet}, function (error: Error, history: ITxnHistory[]) {
                if (error) {
                    reject(error);
                } else {
                        resolve(history)                    
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

