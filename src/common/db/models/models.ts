import { model } from 'mongoose';
import { IAccount, IConnectedApi, IErrorLog, IMessage, IOrder, IPurchase, ISellerRegistration, ISellerRegistrationOffer, ITxnHistory, IUser, IUserSettings, IWallet } from './interfaces';
import { accountSchema, connectedApiSchema, sellerRegistrationSchema, sellerRegistrationOfferSchema, userSchema, walletSchema, userSettingsSchema, purchaseSchema, messageSchema, orderSchema, txnHistorySchema, errorLogSchema } from './schemas';

export const User = model<IUser>('User', userSchema);
export const UserSettings = model<IUserSettings>('UserSettings', userSettingsSchema);
export const Wallet = model<IWallet>('Wallet', walletSchema);
export const Account = model<IAccount>('Account', accountSchema);
export const ConnectedApi = model<IConnectedApi>('ConnectedApi', connectedApiSchema);
export const SellerRegistration = model<ISellerRegistration>('SellerRegistration', sellerRegistrationSchema);
export const SellerRegistrationOffer = model<ISellerRegistrationOffer>('SellerRegistrationOffer', sellerRegistrationOfferSchema);
export const Purchase = model<IPurchase>('Purchase', purchaseSchema);
export const Order = model<IOrder>('Order', orderSchema);
export const Message = model<IMessage>('Message', messageSchema);
export const TxnHistory = model<ITxnHistory>('TxnHistory', txnHistorySchema);
export const ErrorLog = model<IErrorLog>('ErrorLog', errorLogSchema);