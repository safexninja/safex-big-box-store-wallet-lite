import { Order } from './models/models';
import { IOrder } from './models/interfaces';
import { UpdateWriteOpResult } from 'mongoose';
import { CommunicationStatus } from '../enums/communication';
import { OrderStatus } from '../enums/orders';
import { TxnStatus } from '../enums/txns';
import { NULL_VALUE, getDb } from './connection';

export async function addOrder(order: IOrder): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
        getDb().prepare(`INSERT INTO orders (
            uuid,
            user,
            sellerRegistration,
            title,
            account,
            timestamp,
            offerId,
            address,
            txn,
            txnProofSignature,
            txnProofSignatureValid,
            txnStatus,
            blockHeight,
            blockTimestamp,
            blockConfirmations,
            quantity,
            price,
            receivedCash,
            messageAddress,
            messagePubkey,
            communicationStatus,
            hasNewMessages,
            orderStatus
        ) VALUES (
            '${order.uuid}',
            '${order.user}',
            '${order.sellerRegistration}',
            '${order.title}',
            '${order.account}',
            ${order.timestamp},
            '${order.offerId}',
            '${order.address}',
            '${order.txn}',
            '${order.txnProofSignature}',
            ${order.txnProofSignatureValid || NULL_VALUE},
            '${order.txnStatus}',
            '${order.blockHeight || NULL_VALUE}',
            ${order.blockTimestamp || NULL_VALUE},
            ${order.blockConfirmations || NULL_VALUE},
            ${order.quantity || NULL_VALUE},
            ${order.price || NULL_VALUE},
            ${order.receivedCash || NULL_VALUE},
            '${order.messageAddress}',
            '${order.messagePubkey}',
            '${order.communicationStatus}',
            ${order.hasNewMessages},
            '${order.orderStatus}'
        )`).run()
        resolve()
    } catch (err) {
        reject(err);
    }
});
};

export async function findOrderByUUID(user: string, uuid: string): Promise<IOrder> {
    return new Promise<IOrder>((resolve, reject) => {
      try {
          const res = getDb().prepare(`SELECT * FROM orders WHERE user='${user}' AND uuid='${uuid}'`).get() as IOrder
          resolve(res)
      } catch (err) {
          reject(err);
      }
    });
};

export async function findOrderByOfferAndTxn(user: string, offerId: string, txn: string): Promise<IOrder> {
  return new Promise<IOrder>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM orders WHERE user='${user}' AND offerId='${offerId}' AND txn='${txn}'`).get() as IOrder
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};

export async function findOrdersByUser(user: string): Promise<IOrder[]> {
  return new Promise<IOrder[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM orders WHERE user='${user}'`).all() as IOrder[]
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};

export async function findOrdersByUserAndCommunicationStatus(user: string, communicationStatus: CommunicationStatus): Promise<IOrder[]> {
  return new Promise<IOrder[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM orders WHERE user='${user}' AND communicationStatus='${communicationStatus}'`).all() as IOrder[]
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};


export async function findOrdersByUserAndStatus(user: string, orderStatus: OrderStatus): Promise<IOrder[]> {
  return new Promise<IOrder[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM orders WHERE user='${user}' AND orderStatus='${orderStatus}'`).all() as IOrder[]
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};


export async function findAllOrders(): Promise<IOrder[]> {
  return new Promise<IOrder[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM orders`).all() as IOrder[]
        resolve(res)
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
  ): Promise<boolean> {

    return new Promise<boolean>((resolve, reject) => {
      try {
          getDb().prepare(`UPDATE orders 
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



export async function updateOrderTxnProofSignatureValid(
  uuid: string,
  receivedCash: number,
  txnProofSignatureValid: boolean,
): Promise<boolean> {

  return new Promise<boolean>((resolve, reject) => {
    try {
        getDb().prepare(`UPDATE orders 
        SET receivedCash=${receivedCash},
        txnProofSignatureValid=${txnProofSignatureValid}
        WHERE uuid='${uuid}'`).run()
        resolve(true)
    } catch (err) {
        reject(false);
    }
  });
}


export async function updateOrderCommunicationStatus(
    uuid: string,
    communicationStatus: CommunicationStatus
  ): Promise<boolean> {
    
  return new Promise<boolean>((resolve, reject) => {
    try {
        getDb().prepare(`UPDATE orders 
        SET communicationStatus='${communicationStatus}'
        WHERE uuid='${uuid}'`).run()
        resolve(true)
    } catch (err) {
        reject(false);
    }
  });

  }


  export async function updateOrderStatus(
    uuid: string,
    orderStatus: OrderStatus
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
    try {
        getDb().prepare(`UPDATE orders 
        SET orderStatus='${orderStatus}'
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
          getDb().prepare(`UPDATE orders 
          SET hasNewMessages=${hasNewMessages ? 1 : 0}
          WHERE uuid='${uuid}'`).run()
          resolve(true)
      } catch (err) {
          reject(false);
      }
    });
  }
