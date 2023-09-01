import { Order } from './models/models';
import { IOrder } from './models/interfaces';
import { UpdateWriteOpResult } from 'mongoose';
import { CommunicationStatus } from '../enums/communication';
import { OrderStatus } from '../enums/orders';
import { TxnStatus } from '../enums/txns';

export async function addOrder(order: IOrder): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const newOrder = new Order(order)
            newOrder.save(function (error: any) {
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

export async function findOrderByUUID(user: string, uuid: string): Promise<IOrder> {
    return new Promise<IOrder>((resolve, reject) => {
        try {
            Order.findOne({uuid, user}, function (error: Error, order: IOrder) {
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

export async function findOrderByOfferAndTxn(user: string, offerId: string, txn: string): Promise<IOrder> {
  return new Promise<IOrder>((resolve, reject) => {
      try {
          Order.findOne({user, offerId, txn}, function (error: Error, order: IOrder) {
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

export async function findOrdersByUser(user: string): Promise<IOrder[]> {
    return new Promise<IOrder[]>((resolve, reject) => {
        try {
            Order.find({user}, function (error: Error, order: IOrder[]) {
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

export async function findOrdersByUserAndCommunicationStatus(user: string, communicationStatus: CommunicationStatus): Promise<IOrder[]> {
    return new Promise<IOrder[]>((resolve, reject) => {
        try {
            Order.find({user, communicationStatus}, function (error: Error, order: IOrder[]) {
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


export async function findOrdersByUserAndStatus(user: string, orderStatus: OrderStatus): Promise<IOrder[]> {
  return new Promise<IOrder[]>((resolve, reject) => {
      try {
          Order.find({user, orderStatus}, function (error: Error, order: IOrder[]) {
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
export async function findAllOrders(): Promise<IOrder[]> {
    return new Promise<IOrder[]>((resolve, reject) => {
        try {
            Order.find(function (error: Error, order: IOrder[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(order);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};


export async function updateOrderConfirmation(
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
        Order.updateOne(
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



  export async function updateOrderTxnProofSignatureValid(
    uuid: string,
    receivedCash: number,
    txnProofSignatureValid: boolean,
  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Order.updateOne(
          { uuid },
          { receivedCash, txnProofSignatureValid },
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


export async function updateOrderCommunicationStatus(
    uuid: string,
    communicationStatus: CommunicationStatus
  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Order.updateOne(
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


  export async function updateOrderStatus(
    uuid: string,
    orderStatus: OrderStatus
  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Order.updateOne(
          { uuid },
          { orderStatus },
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
        Order.updateOne(
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


export async function getOrderCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        try {
            Order.find(function (error: Error, order: IOrder[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(order.length);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};
