import { Message } from './models/models';
import { IMessage } from './models/interfaces';
import { UpdateWriteOpResult } from 'mongoose';
import { MessageStatus } from '../enums/messages';
import { decryptWithHashString, encryptWithHashString } from '../crypto/crypto';

export async function addMessage(message: IMessage, encryptionHashString: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {

            message.message = encryptWithHashString(message.message, encryptionHashString)

            const newMessage = new Message(message)
            newMessage.save(function (error: any) {
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

export async function findMessageByUUID(uuid: string, encryptionHashString: string): Promise<IMessage> {
    return new Promise<IMessage>((resolve, reject) => {
        try {
            Message.findOne({uuid}, function (error: Error, message: IMessage) {
                if (error) {
                    reject(error);
                } else {
                    message.message = decryptWithHashString(message.message, encryptionHashString)
                    resolve(message)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findMessagesByPurchase(purchaseUuid: string, encryptionHashString: string): Promise<IMessage[]> {
    return new Promise<IMessage[]>((resolve, reject) => {
        try {
            Message.find({purchaseUuid}, function (error: Error, message: IMessage[]) {
                if (error) {
                    reject(error);
                } else {
                    message.forEach((mess)=>{
                      mess.message = decryptWithHashString(mess.message, encryptionHashString)
                    })
                    resolve(message)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findMessagesByOrder(orderUuid: string, encryptionHashString: string): Promise<IMessage[]> {
  return new Promise<IMessage[]>((resolve, reject) => {
      try {
          Message.find({orderUuid}, function (error: Error, message: IMessage[]) {
              if (error) {
                  reject(error);
              } else {
                  message.forEach((mess)=>{
                    mess.message = decryptWithHashString(mess.message, encryptionHashString)
                  })
                  resolve(message)
              }
          });
      } catch (err) {
          reject(err);
      }
  });
};



// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllMessages(): Promise<IMessage[]> {
    return new Promise<IMessage[]>((resolve, reject) => {
        try {
          Message.find(function (error: Error, message: IMessage[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(message);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};


export async function updateMessageStatus(
    uuid: string,
    status: MessageStatus,
  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {
        Message.updateOne(
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


export async function deleteMessageFromDatabase(uuid: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        Message.deleteOne(
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


 export async function deleteAllMessagesFromDatabase(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        Message.deleteMany(
          {  },
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



export async function getMessageCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        try {
            Message.find(function (error: Error, message: IMessage[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(message.length);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};
