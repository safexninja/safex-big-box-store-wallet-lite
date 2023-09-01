import { Purchase } from './models/models';
import { IPurchase } from './models/interfaces';
import { UpdateWriteOpResult } from 'mongoose';
import { CommunicationStatus } from '../enums/communication';
import { PurchaseStatus } from '../enums/purchases';
import { TxnStatus } from '../enums/txns';

export async function addPurchase(purchase: IPurchase): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const newPurchase = new Purchase(purchase)
            newPurchase.save(function (error: any) {
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

export async function findPurchaseByUUID(user: string, uuid: string,): Promise<IPurchase> {
    return new Promise<IPurchase>((resolve, reject) => {
        try {
            Purchase.findOne({uuid, user}, function (error: Error, purchase: IPurchase) {
                if (error) {
                    reject(error);
                } else {
                    resolve(purchase)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};


export async function findPurchasesByUser(user: string): Promise<IPurchase[]> {
    return new Promise<IPurchase[]>((resolve, reject) => {
        try {
            Purchase.find({user}, function (error: Error, purchase: IPurchase[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(purchase)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findPurchasesByUserAndCommunicationStatus(user: string, communicationStatus: CommunicationStatus): Promise<IPurchase[]> {
    return new Promise<IPurchase[]>((resolve, reject) => {
        try {
            Purchase.find({user, communicationStatus}, function (error: Error, purchase: IPurchase[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(purchase)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findPurchasesByUserAndStatus(user: string, purchaseStatus: PurchaseStatus): Promise<IPurchase[]> {
    return new Promise<IPurchase[]>((resolve, reject) => {
        try {
            Purchase.find({user, purchaseStatus }, function (error: Error, purchase: IPurchase[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(purchase)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};


export async function findPurchaseByOfferAndTxn(user: string, offerId: string, txn: string): Promise<IPurchase> {
    return new Promise<IPurchase>((resolve, reject) => {
        try {
            Purchase.findOne({user, offerId, txn}, function (error: Error, order: IPurchase) {
                if (error) {
                    reject(error);
                } else {
                    resolve(order)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
  };


// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllPurchases(): Promise<IPurchase[]> {
    return new Promise<IPurchase[]>((resolve, reject) => {
        try {
            Purchase.find(function (error: Error, purchase: IPurchase[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(purchase);
                }
            });
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
  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Purchase.updateOne(
          { uuid },
          { blockHeight, blockTimestamp, blockConfirmations, quantity, price, txnStatus },
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


export async function updatePurchaseCommunicationStatus(
    uuid: string,
    communicationStatus: CommunicationStatus
   

  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Purchase.updateOne(
          { uuid },
          { communicationStatus },
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


export async function updatePurchaseRated(
    uuid: string,
    rated: boolean,
    feedbackStars: number,
    feedbackComment: string
  
  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Purchase.updateOne(
          { uuid },
          { rated, feedbackStars, feedbackComment},
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


  export async function updatePurchaseStatus(
    uuid: string,
    purchaseStatus: PurchaseStatus
  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Purchase.updateOne(
          { uuid },
          { purchaseStatus },
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


export async function updateHasNewMessages(
    uuid: string,
    hasNewMessages: boolean

  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Purchase.updateOne(
          { uuid },
          { hasNewMessages },
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

export async function getPurchaseCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        try {
            Purchase.find(function (error: Error, purchase: IPurchase[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(purchase.length);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};
