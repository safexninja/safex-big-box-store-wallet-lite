import { MessageType } from "../enums/messages";

export interface Message_OpenCommunication {
    quantity: number,
    deleteToken: string,
    deliveryAddress: string,
    emailAddress: string,
    additionalMessage: string,
 }
 
export interface Message_Reply {
    message: string,
    deleteToken: string,
 }
 
export interface Message_CloseCommunication {
    deleteToken: string,
 }
 
export interface Message_ConfirmShipment {
   deleteToken: string,
}

export interface Message_ConfirmDelivery {
   deleteToken: string,
}
 
export interface Message_Contents {
    type: MessageType,
    data: Message_OpenCommunication | Message_Reply | Message_CloseCommunication | Message_ConfirmDelivery | Message_ConfirmDelivery 
 }

export interface Message_Envelope {
   encryptedMessage: string,
   encryptedTxnProofSignature?: string,
   encryptedPubkeyCipher?: string,
   encryptedPubKey?: string
}