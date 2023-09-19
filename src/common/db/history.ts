import { ITxnHistory } from './models/interfaces';
import { getDb } from './connection';


export async function addTxn(txnHistory: ITxnHistory): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            getDb().prepare(`INSERT INTO txnHistory (
                wallet,
                timestamp,
                txnId,
                paymentId,
                direction,
                pending,
                type,
                cashAmount,
                tokenAmount,
                fee,
                blockHeight,
                confirmations
            ) VALUES (
                '${txnHistory.wallet}',
                ${txnHistory.timestamp},
                '${txnHistory.txnId}',
                '${txnHistory.paymentId}',
                '${txnHistory.direction}',
                ${txnHistory.pending},
                '${txnHistory.type}',
                ${txnHistory.cashAmount},
                ${txnHistory.tokenAmount},
                ${txnHistory.fee},
                ${txnHistory.blockHeight},
                ${txnHistory.confirmations}
            )`).run()
            resolve()
        } catch (err) {
            reject(err);
        }
    });
};

export async function findHistoryByWallet(wallet: string): Promise<ITxnHistory[]> {
    return new Promise<ITxnHistory[]>((resolve, reject) => {
        try {
            const res = getDb().prepare(`SELECT * FROM txnHistory WHERE wallet='${wallet}'`).all() as ITxnHistory[]
            resolve(res)
        } catch (err) {
            reject(err);
        }
    });
};

export async function deleteHistoryByWallet(wallet: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`DELETE FROM txnHistory WHERE wallet='${wallet}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
};

