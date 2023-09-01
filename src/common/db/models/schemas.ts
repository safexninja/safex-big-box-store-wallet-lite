import { Schema } from 'mongoose';
import { CommunicationStatus } from '../../enums/communication';
import { MessageDirection, MessageStatus, MessageType } from '../../enums/messages';
import { OrderStatus } from '../../enums/orders';
import { PurchaseStatus } from '../../enums/purchases';
import { TxnStatus, SensibleTxnType } from '../../enums/txns';
import { ErrorLogComponent, ErrorLogSeverity } from '../enums/errorlog';
import { UserStatus } from '../enums/users';
import { IAccount, IConnectedApi, IErrorLog, IMessage, IOrder, IPurchase, ISellerRegistration, ISellerRegistrationOffer, ITxnHistory, IUser,  IUserSettings,  IWallet } from './interfaces';
import { User } from './models';

export const userSchema = new Schema<IUser>({
  uuid: { type: String, required: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  description: { type: String, required: false },
  status: { type: String, enum: UserStatus , required: true },
  termsAccepted: { type: Boolean, required: true },
  logsLastSeen: { type: Number, required: true },
  passwordHashed: { type: Boolean, required: true },
});

export const userSettingsSchema = new Schema<IUserSettings>({
  uuid: { type: String, required: true },
  user: { type: String, required: true },
  defaultCountry: { type: String, required: true },
  defaultAddress: { type: String, required: false },
});

export const walletSchema = new Schema<IWallet>({
  uuid: { type: String, required: true },
  user: { type: String, required: true },
  password: { type: String, required: true },
  creationHeight: { type: Number, required: true },
  label: { type: String, required: true },
  address: { type: String, required: true },
  spendKey: { type: String, required: true },
  viewKey: { type: String, required: true },
  height: { type: Number, required: true },
  cashBalance: { type: Number, required: true },
  unlockedCashBalance: { type: Number, required: true },
  tokenBalance: { type: Number, required: true },
  unlockedTokenBalance: { type: Number, required: true },
  lastError: { type: String, required: true }, 
  timestamp: { type: Number, required: true },
  deleted: { type: Boolean, required: true }
});

export const accountSchema = new Schema<IAccount>({
  uuid: { type: String, required: true },
  user: { type: String, required: true },
  account: { type: String, required: true },
  status: { type: Number, required: true },
  wallet: { type: String, required: true },
  creationHeight: { type: Number, required: true },
  secretKey: { type: String, required: true },
  lastError: { type: String, required: true },
  deleted: { type: Boolean, required: true }
 
});

export const connectedApiSchema = new Schema<IConnectedApi>({
  uuid: { type: String, required: true },
  user: { type: String, required: true },
  url: { type: String, required: true },
  isActiveApi: { type: Boolean, required: true },
  messageAddress: { type: String, required: true },
  privateKey: { type: String, required: true },
  publicKey: { type: String, required: true },
  timestamp: { type: Number, required: true } 
});


export const sellerRegistrationSchema = new Schema<ISellerRegistration>({
  uuid: { type: String, required: true },
  user: { type: String, required: true },
  url: { type: String, required: true },
  account: { type: String, required: true },
  token: { type: String, required: true },
  revokeToken: { type: String, required: true },
  timestamp: { type: Number, required: true } 
});

export const sellerRegistrationOfferSchema = new Schema<ISellerRegistrationOffer>({
  uuid: { type: String, required: true },
  sellerRegistrationUuid: { type: String, required: true },
  offerUuid: { type: String, required: true },
  offerId: { type: String, required: true },
  removeToken: { type: String, required: true },
});

export const purchaseSchema = new Schema<IPurchase>({
  uuid: { type: String, required: true },
  user: { type: String, required: true },
  connectedApi: { type: String, required: true },
  title: { type: String, required: true },
  seller: { type: String, required: true },
  sellerPubkey: { type: String, required: true },
  buyerMessageAddress: { type: String, required: true },
  buyerPubkey: { type: String, required: true },
  buyerPrivKey: { type: String, required: true },
  timestamp: { type: Number, required: true },
  offerId: { type: String, required: true },
  txn: { type: String, required: true },
  txnProofSignature: { type: String, required: true },
  txnStatus: { type: String, enum: TxnStatus ,required: true },
  blockHeight: { type: Number, required: false },
  blockTimestamp: { type: Number, required: false },
  blockConfirmations: { type: Number, required: false },
  quantity: { type: Number, required: false },
  price: { type: Number, required: false },
  communicationStatus: { type: String, enum: CommunicationStatus, required: true },
  hasNewMessages: { type: Boolean, required: true },
  purchaseStatus: { type: String, enum: PurchaseStatus, required: true },
  wallet: { type: String, required: true },
  rated: { type: Boolean, required: true },
  feedbackStars: { type: Number, required: false },
  feedbackComment: { type: String, required: false },
});

export const orderSchema = new Schema<IOrder>({
  uuid: { type: String, required: true },
  user: { type: String, required: true },
  sellerRegistration: { type: String, required: true },
  title: { type: String, required: true },
  account: { type: String, required: true },
  timestamp: { type: Number, required: true },
  offerId: { type: String, required: true },
  address: { type: String, required: true },
  txn: { type: String, required: true },
  txnProofSignature: { type: String, required: true },
  txnProofSignatureValid: { type: Boolean, required: false },
  txnStatus: { type: String, enum: TxnStatus ,required: true },
  blockHeight: { type: Number, required: false },
  blockTimestamp: { type: Number, required: false },
  blockConfirmations: { type: Number, required: false },
  quantity: { type: Number, required: false },
  price: { type: Number, required: false },
  receivedCash: { type: Number, required: false },
  messageAddress: { type: String, required: true },
  messagePubkey: { type: String, required: true },
  communicationStatus: { type: String, enum: CommunicationStatus ,required: true },
  hasNewMessages: { type: Boolean, required: true },
  orderStatus: { type: String, enum: OrderStatus, required: true },
});


export const messageSchema = new Schema<IMessage>({
  uuid: { type: String, required: true },
  messageType: { type: String, enum: MessageType ,required: true },
  purchaseUuid: { type: String, required: false },
  orderUuid: { type: String, required: false },
  message: { type: String, required: true },
  signatureValid: { type: Boolean, required: true },
  timestamp: { type: Number, required: true },
  status: { type: String, enum: MessageStatus ,required: true },
  direction: { type: String, enum: MessageDirection ,required: true },
  deleteToken: { type: String, required: true },
});


export const txnHistorySchema = new Schema<ITxnHistory>({
  wallet: { type: String, required: true },
  timestamp: { type: Number, required: true },
  txnId: { type: String, required: true },
  paymentId: { type: String, required: true },
  direction: { type: String, required: true },
  pending: { type: Boolean, required: true },
  type: { type: String, enum: SensibleTxnType, required: true },
  cashAmount: { type: Number, required: true },
  tokenAmount: { type: Number, required: true },
  fee: { type: Number, required: true },
  blockHeight: { type: Number, required: true },
  confirmations: { type: Number, required: true }  
});

export const errorLogSchema = new Schema<IErrorLog>({
  uuid: { type: String, required: true },
  user: { type: String, required: true },
  component: { type: String, enum: ErrorLogComponent, required: true },
  severity: { type: String, enum: ErrorLogSeverity, required: true },
  timestamp: { type: Number, required: true },
  message: { type: String, required: true },
});