import { IMessage } from './models/interfaces';
import { MessageStatus } from '../enums/messages';
import { decryptWithHashString, encryptWithHashString } from '../crypto/crypto';
import { getDb } from './connection';

export async function addMessage(message: IMessage, encryptionHashString: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {

        message.message = encryptWithHashString(message.message, encryptionHashString)

        getDb().prepare(`INSERT INTO message (
            uuid,
            messageType,
            purchaseUuid,
            orderUuid,
            message,
            signatureValid,
            timestamp,
            status,
            direction,
            deleteToken
        ) VALUES (
            '${message.uuid}',
            '${message.messageType}',
            '${message.purchaseUuid}',
            '${message.orderUuid}',
            '${message.message}',
            ${message.signatureValid},
            ${message.timestamp},
            '${message.status}',
            '${message.direction}',
            '${message.deleteToken}'
        )`).run()
        resolve()
    } catch (err) {
        reject(err);
    }
});

};

export async function findMessageByUUID(uuid: string, encryptionHashString: string): Promise<IMessage> {
  return new Promise<IMessage>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM message WHERE uuid='${uuid}'`).get() as IMessage
        res.message = decryptWithHashString(res.message, encryptionHashString)
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });

};

export async function findMessagesByPurchase(purchaseUuid: string, encryptionHashString: string): Promise<IMessage[]> {
  return new Promise<IMessage[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM message WHERE purchaseUuid='${purchaseUuid}'`).all() as IMessage[]
        
        for (const mess of res ){
          mess.message = decryptWithHashString(mess.message, encryptionHashString)
        }
                
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};

export async function findMessagesByOrder(orderUuid: string, encryptionHashString: string): Promise<IMessage[]> {
  return new Promise<IMessage[]>((resolve, reject) => {
    try {
        const res = getDb().prepare(`SELECT * FROM message WHERE orderUuid='${orderUuid}'`).all() as IMessage[]
        
        for (const mess of res ){
          mess.message = decryptWithHashString(mess.message, encryptionHashString)
        }
                
        resolve(res)
    } catch (err) {
        reject(err);
    }
  });
};



export async function updateMessageStatus(
    uuid: string,
    status: MessageStatus,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
          getDb().prepare(`UPDATE message SET status='${status}' WHERE uuid='${uuid}'`).run()
          resolve(true)
      } catch (err) {
          reject(false);
      }
  });
  }


export async function deleteMessageFromDatabase(uuid: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    try {
        getDb().prepare(`DELETE FROM message WHERE uuid='${uuid}'`).run()
        resolve(true)
    } catch (err) {
        reject(false);
    }
   });
}


 export async function deleteAllMessagesFromDatabase(): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    try {
        getDb().prepare(`DELETE FROM message`).run()
        resolve(true)
    } catch (err) {
        reject(false);
    }
   });
  }



export async function getMessageCount(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    try {
        const count = getDb().prepare(`SELECT COUNT(uuid) FROM message`).get() as number
        resolve(count)
    } catch (err) {
        reject(err);
    }
});
};
