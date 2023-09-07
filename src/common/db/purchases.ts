import { Purchase } from './models/models';
import { IPurchase } from './models/interfaces';
import { UpdateWriteOpResult } from 'mongoose';
import { CommunicationStatus } from '../enums/communication';
import { PurchaseStatus } from '../enums/purchases';
import { TxnStatus } from '../enums/txns';
import { NULL_VALUE, getDb } from './connection';

export async function addPurchase(purchase: IPurchase): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
        getDb().prepare(`INSERT INTO purchases (
            uuid,
            user,
            connectedApi,
            title,
            seller,
            sellerPubkey,
            buyerMessageAddress,
            buyerPubkey,
            buyerPrivKey,
            timestamp,
            offerId,
            txn,
            txnProofSignature,
            txnStatus,
            blockHeight,
            blockTimestamp,
            blockConfirmations,
            quantity,
            price,
            communicationStatus,
            hasNewMessages,
            purchaseStatus,
            wallet,
            rated,
            feedbackStars,
            feedbackComment
        ) VALUES (
            '${purchase.uuid}',
            '${purchase.user}',
            '${purchase.connectedApi}',
            '${purchase.title}',
            '${purchase.seller}',
            '${purchase.sellerPubkey}',
            '${purchase.buyerMessageAddress}',
            '${purchase.buyerPubkey}',
            '${purchase.buyerPrivKey}',
            ${purchase.timestamp},
            '${purchase.offerId}',
            '${purchase.txn}',
            '${purchase.txnProofSignature}',
            '${purchase.txnStatus}',
            ${purchase.blockHeight || NULL_VALUE},
            ${purchase.blockTimestamp || NULL_VALUE},
            ${purchase.blockConfirmations || NULL_VALUE},
            ${purchase.quantity || NULL_VALUE},
            ${purchase.price || NULL_VALUE},
            '${purchase.communicationStatus}',
            ${purchase.hasNewMessages},
            '${purchase.purchaseStatus}',
            '${purchase.wallet}',
            '${purchase.rated}',
            ${purchase.feedbackStars || NULL_VALUE},
            '${purchase.feedbackComment}'
        )`).run()
        resolve()
    } catch (err) {
        reject(err);
    }
});
};

export async function findPurchaseByUUID(user: string, uuid: string,): Promise<IPurchase> {
  return new Promise<IPurchase>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM purchases WHERE user='${user}' AND uuid='${uuid}'`).get() as IPurchase
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};


export async function findPurchasesByUser(user: string): Promise<IPurchase[]> {
  return new Promise<IPurchase[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM purchases WHERE user='${user}'`).all() as IPurchase[]
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};

export async function findPurchasesByUserAndCommunicationStatus(user: string, communicationStatus: CommunicationStatus): Promise<IPurchase[]> {
  return new Promise<IPurchase[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM purchases WHERE user='${user}' AND communicationStatus='${communicationStatus}'`).all() as IPurchase[]
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};

export async function findPurchasesByUserAndStatus(user: string, purchaseStatus: PurchaseStatus): Promise<IPurchase[]> {
  return new Promise<IPurchase[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM purchases WHERE user='${user}' AND purchaseStatus='${purchaseStatus}'`).all() as IPurchase[]
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};


export async function findPurchaseByOfferAndTxn(user: string, offerId: string, txn: string): Promise<IPurchase> {
  return new Promise<IPurchase>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM purchases WHERE user='${user}' AND offerId='${offerId}' AND txn='${txn}'`).get() as IPurchase
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
  };


// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllPurchases(): Promise<IPurchase[]> {
  return new Promise<IPurchase[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM purchases`).all() as IPurchase[]
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};


export async function updatePurchaseConfirmation(
    uuid: string,
    blockHeight: number,
    blockTimestamp: number,
    blockConfirmations: number,
    quantity: number,
    price: number,
    txnStatus: TxnStatus
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
          getDb().prepare(`UPDATE purchases 
          SET blockHeight=${blockHeight},
          blockTimestamp=${blockTimestamp},
          blockConfirmations=${blockConfirmations},
          quantity=${quantity},
          price=${price},
          txnStatus='${txnStatus}'
          WHERE uuid='${uuid}'`).run()
          resolve(true)
      } catch (err) {
          reject(false);
      }
    });
  }


export async function updatePurchaseCommunicationStatus(
    uuid: string,
    communicationStatus: CommunicationStatus
  
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
          getDb().prepare(`UPDATE purchases 
          SET communicationStatus='${communicationStatus}'
          WHERE uuid='${uuid}'`).run()
          resolve(true)
      } catch (err) {
          reject(false);
      }
    });
  }


export async function updatePurchaseRated(
    uuid: string,
    rated: boolean,
    feedbackStars: number,
    feedbackComment: string
  
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
          getDb().prepare(`UPDATE purchases 
          SET rated=${rated},
          feedbackStars=${feedbackStars},
          feedbackComment='${feedbackComment}'
          WHERE uuid='${uuid}'`).run()
          resolve(true)
      } catch (err) {
          reject(false);
      }
    });
  }


  export async function updatePurchaseStatus(
    uuid: string,
    purchaseStatus: PurchaseStatus
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
          getDb().prepare(`UPDATE purchases 
          SET purchaseStatus='${purchaseStatus}'
          WHERE uuid='${uuid}'`).run()
          resolve(true)
      } catch (err) {
          reject(false);
      }
    });
  }


export async function updateHasNewMessages(
    uuid: string,
    hasNewMessages: boolean

  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
          getDb().prepare(`UPDATE purchases 
          SET hasNewMessages=${hasNewMessages ? 1 : 0}
          WHERE uuid='${uuid}'`).run()
          resolve(true)
      } catch (err) {
          reject(false);
      }
    });
  }

