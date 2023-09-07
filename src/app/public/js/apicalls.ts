import { AccountKeys, ActiveStore, SetStoreResult, User, WalletKeys } from './interfaces';
import { IAccountStrict, IErrorLog, IUserSettings, IWalletStrict} from '../../../common/db/models/interfaces'
import { DaemonAccountInfo, DaemonHeight, DaemonInfo, DaemonOffer, DaemonOffers, DaemonPricePeg, DaemonPricePegs } from '../../../common/daemon/types/daemon'
import { StoreFrontOfferAdded, StoreFrontOfferRemoved, StoreFrontOfferReported, StoreFrontSellerOffersDetails, StoreFrontSellerRegistrationCheck, StoreFrontSellerRegistrationRevoked } from '../../../common/helpers/stores'

import { PurchaseAdd } from '../../../api/requests/ApiRequestData';
import { SensibleTxnType, TxnStatus } from '../../../common/enums/txns';
import { CommunicationStatus } from '../../../common/enums/communication';
import { MessageDirection, MessageStatus, MessageType } from '../../../common/enums/messages';
import { PurchaseStatus } from '../../../common/enums/purchases';
import { OrderStatus } from '../../../common/enums/orders';

export type StoreFrontSellerPubKeyCheck = {
  status: string,
  error: string
};


export type PurchasedProcessed = {
  status: string,
  error: string
};


export type OpenPurchase = {
  uuid: string,
  store: string,
  title: string,
  seller: string,
  timestamp: number,
  offerId: string,
  txn: string,
  txnStatus: TxnStatus,
  blockHeight?: number,
  blockTimestamp?: number,
  blockConfirmations?: number,
  quantity?: number,
  price?: number,
  communicationStatus: CommunicationStatus,
  hasNewMessages: boolean,
  wallet: string,
  rated: boolean;
  feedbackStars?: number;
  feedbackComment?: string;
};

export type Purchase = {
  uuid: string,
  store: string,
  title: string,
  timestamp: number,
  offerId: string,
  quantity?: number,
  price?: number,
  status: PurchaseStatus,
  communicationStatus: CommunicationStatus,
  hasNewMessages: boolean
};

export type ClosedPurchase = {
  uuid: string,
  store: string,
  title: string,
  seller: string,
  timestamp: number,
  offerId: string,
  txn: string,
  blockHeight?: number,
  blockTimestamp?: number,
  quantity?: number,
  price?: number,
  wallet: string,
  rated: boolean,
  feedbackStars?: number,
  feedbackComment?: string
};


export type OpenOrder = {
  uuid: string,
  store: string,
  title: string,
  account: string,
  timestamp: number,
  offerId: string,
  address: string,
  status: OrderStatus,
  txn: string,
  txnStatus: TxnStatus,
  txnProofSignature: string,
  txnProofSignatureValid: boolean
  blockHeight?: number,
  blockTimestamp?: number,
  blockConfirmations?: number,
  quantity?: number,
  price?: number,
  receivedCash?: number,
  messageAddress: string,
  communicationStatus: CommunicationStatus,
  hasNewMessages: boolean
};


export type Order = {
  uuid: string,
  store: string,
  title: string,
  timestamp: number,
  offerId: string,
  quantity?: number,
  price?: number,
  status: OrderStatus,
  communicationStatus: CommunicationStatus,
  hasNewMessages: boolean
};

export type ClosedOrder = {
  uuid: string,
  store: string,
  title: string,
  account: string,
  timestamp: number,
  offerId: string,
  address: string,
  txn: string,
  blockHeight?: number,
  blockTimestamp?: number,
  quantity?: number,
  price?: number,
  receivedCash?: number
};


export type OpenPurchases = {
  open: OpenPurchase[],
  awaiting: OpenPurchase[],
  delivered: OpenPurchase[],
};


export type OpenOrders = {
  new: OpenOrder[],
  shipped: OpenOrder[],
  delivered: OpenOrder[],
};


export type Message = {
  uuid: string,
  messageType: MessageType,
  message: string,
  timestamp: number,
  status: MessageStatus,
  direction: MessageDirection
};


export type HistoricalTxn = {
  timestamp: number,
  txnId: string,
  paymentId: string,
  direction: string,
  pending: boolean,
  type: SensibleTxnType,
  cashAmount: number,
  tokenAmount: number,
  fee: number,
  blockHeight: number,
  confirmations: number
};

export interface UserTerms {
  status: string;
}

export interface UserRegistration {
  url: string;
  account: string;
  timestamp: number
}

export interface UserLogsLast {
  timestamp: number;
}

export interface UserName {
  username: string;
}

export type GeneratedPaymentID = {
  paymentId: string
};

export type StakedTokens = {
  staked: number
};

export async function authenticate(user: string, password: string): Promise<boolean> {
    const response = await fetch('http://localhost:3101/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({name: user, password: password})
      });
    
     return response.ok
}

export async function logout(): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/auth/logout', {
    method: 'GET'
  });

 return response.ok
}

export async function refreshAuthToken(): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/auth/refresh', {
    method: 'GET'
  });

 return response.ok
}

export async function getUserName(): Promise<UserName> {
  const response = await fetch('http://localhost:3101/api/user/name', {
    method: 'GET'
  });

 return response.json()
}

export async function fetchMessages(): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/message/fetch', {
    method: 'GET'
  });

 return response.ok
}


export async function getPurchaseMessages(purchaseUuid: string): Promise<Message[]> {
  const response = await fetch('http://localhost:3101/api/message/purchase/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({purchaseUuid})
    });

   return response.json()
}

export async function orderReplyMessage(orderUuid: string, message: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/message/order/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({orderUuid, message})
    });

   return response.ok
}

export async function orderShipMessage(orderUuid: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/message/order/ship', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({orderUuid})
    });

   return response.ok
}

export async function orderCloseMessage(orderUuid: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/message/order/close', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({orderUuid})
    });

   return response.ok
}


export async function purchaseReplyMessage(purchaseUuid: string, message: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/message/purchase/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({purchaseUuid, message})
    });

   return response.ok
}

export async function purchaseDeliveredMessage(purchaseUuid: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/message/purchase/delivered', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({purchaseUuid})
    });

   return response.ok
}

export async function purchaseCloseMessage(purchaseUuid: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/message/purchase/close', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({purchaseUuid})
    });

   return response.ok
}

export async function purchaseClose(purchaseUuid: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/purchase/close', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({purchaseUuid})
    });

   return response.ok
}


export async function purchaseRate(purchaseUuid: string, stars: number, feedback: string ): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/purchase/rate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({purchaseUuid, stars, feedback})
    });

   return response.ok
}


export async function orderClose(orderUuid: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/order/close', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({orderUuid})
    });

   return response.ok
}

export async function getOrderMessages(orderUuid: string): Promise<Message[]> {
  const response = await fetch('http://localhost:3101/api/message/order/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({orderUuid})
    });

   return response.json()
}


export async function fetchUsers(): Promise<User[]> {
    const response = await fetch('http://localhost:3101/api/user/list', {
        method: 'GET'
      });
     return response.json()
}

export async function getUserSettings(): Promise<IUserSettings> {
  const response = await fetch('http://localhost:3101/api/user/settings', {
      method: 'GET'
    });
   return response.json()
}


export async function getUserRegistrations(): Promise<UserRegistration[]> {
  const response = await fetch('http://localhost:3101/api/user/registrations', {
      method: 'GET'
    });
   return response.json()
}

export async function getUserTerms(): Promise<UserTerms> {
  const response = await fetch('http://localhost:3101/api/user/terms', {
      method: 'GET'
    });
   return response.json()
}

export async function getLogsLastSeen(): Promise<UserLogsLast> {
  const response = await fetch('http://localhost:3101/api/user/logs/last', {
      method: 'GET'
    });
   return response.json()
}

export async function getLogsLastSeenTouch(): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/user/logs/touch', {
      method: 'GET'
    });
   return response.ok
}

export async function getErrorLog(since: number): Promise<IErrorLog[]> {
  const response = await fetch('http://localhost:3101/api/system/logs?since=' + since, {
      method: 'GET'
    });
   return response.json()
}


export async function setUserTermsAccepted(): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/user/terms/accept', {
      method: 'GET'
    });
   return response.ok
}


export async function saveUserSettings(defaultCountry: string, defaultAddress: string, daemonAddress: string, explorerAddress: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/user/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({defaultCountry, defaultAddress, daemonAddress, explorerAddress})
    });

   return response.ok
}

export async function createUser(user: string, password: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/user/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({name: user, password: password})
    });

   return response.ok
}

export async function setStore(url: string): Promise<SetStoreResult> {
  const response = await fetch('http://localhost:3101/api/store/set', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({url})
    });

   return response.json()
}


export async function clearStore(): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/store/clear', {
      method: 'GET'
    });
   return response.ok
}

export async function getStore(): Promise<ActiveStore> {
  const response = await fetch('http://localhost:3101/api/store/get', {
      method: 'GET'
    });
   return response.json()
}

export async function getOffers(country: string, search: string, type: string, minPrice: string, maxPrice: string, minQy: string, order: string): Promise<DaemonOffer[]> {
  const response = await fetch(`http://localhost:3101/api/store/offers?country=${country}&search=${search}&type=${type}&minPrice=${minPrice}&maxPrice=${maxPrice}&minQy=${minQy}&order=${order}`, {
      method: 'GET'
    });
   return response.json()
}

export async function getOffersFromDaemon(seller: string): Promise<DaemonOffers> {
  const response = await fetch(`http://localhost:3101/api/daemon/offers?seller=${seller}`, {
      method: 'GET'
    });
   return response.json()
}

export async function getPricePegsFromDaemon(): Promise<DaemonPricePegs> {
  const response = await fetch(`http://localhost:3101/api/daemon/pricepegs`, {
      method: 'GET'
    });
   return response.json()
}

export async function getDaemonHeight(): Promise<DaemonHeight> {
  const response = await fetch(`http://localhost:3101/api/daemon/height`, {
      method: 'GET'
    });
   return response.json()
}

export async function getDaemonInfo(): Promise<DaemonInfo> {
  const response = await fetch(`http://localhost:3101/api/daemon/info`, {
      method: 'GET'
    });
   return response.json()
}

export async function getDaemonStakedTokens(): Promise<StakedTokens> {
  const response = await fetch(`http://localhost:3101/api/daemon/staked`, {
      method: 'GET'
    });
   return response.json()
}

export async function getWallets(): Promise<IWalletStrict[]> {
  const response = await fetch('http://localhost:3101/api/user/wallets', {
      method: 'GET'
    });
   return response.json()
}

export async function getAccounts(): Promise<IAccountStrict[]> {
  const response = await fetch('http://localhost:3101/api/user/accounts', {
      method: 'GET'
    });
   return response.json()
}

export async function getAccountSecretKey(uuid: string): Promise<AccountKeys> {
  const response = await fetch(`http://localhost:3101/api/account/keys?uuid=${uuid}`, {
      method: 'GET'
    });
   return response.json()
}

export async function getWalletSecretKeys(uuid: string): Promise<WalletKeys> {
  const response = await fetch(`http://localhost:3101/api/wallet/keys?uuid=${uuid}`, {
      method: 'GET'
    });
   return response.json()
}

export async function setWalletLabel(uuid: string, label: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/wallet/label', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({uuid, label})
    });

    return response.ok
}

export async function getWalletHistory(uuid: string, filter: string): Promise<HistoricalTxn[]> {
  const response = await fetch(`http://localhost:3101/api/wallet/history?filter=${filter}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({uuid})
    });

   return response.json()
}

export async function getAccountInfoFromDaemon(account: string): Promise<DaemonAccountInfo> {
  const response = await fetch('http://localhost:3101/api/account/info?account=' + account, {
      method: 'GET'
    });
   return response.json()
}

export async function getOpenPurchases(): Promise<OpenPurchases> {
  const response = await fetch('http://localhost:3101/api/purchases/get/open', {
      method: 'GET'
    });
   return response.json()
}

export async function getPurchase(id: string): Promise<Purchase> {
  const response = await fetch('http://localhost:3101/api/purchases/get?id=' + id, {
      method: 'GET'
    });
   return response.json()
}

export async function getClosedPurchases(): Promise<ClosedPurchase[]> {
  const response = await fetch('http://localhost:3101/api/purchases/get/closed', {
      method: 'GET'
    });
   return response.json()
}

export async function getOpenOrders(): Promise<OpenOrders> {
  const response = await fetch('http://localhost:3101/api/orders/get/open', {
      method: 'GET'
    });
   return response.json()
}

export async function getOrder(id: string): Promise<Purchase> {
  const response = await fetch('http://localhost:3101/api/orders/get?id=' + id, {
      method: 'GET'
    });
   return response.json()
}

export async function getClosedOrders(): Promise<ClosedOrder[]> {
  const response = await fetch('http://localhost:3101/api/orders/get/closed', {
      method: 'GET'
    });
   return response.json()
}

export async function setOrderValidation(orderUuid: string, receivedCash: number, valid: boolean): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/order/validation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({orderUuid, receivedCash, valid})
    });

   return response.ok
}

export async function storeFrontGetSellerRegistrionCheck(account: string): Promise<StoreFrontSellerRegistrationCheck> {
  const response = await fetch('http://localhost:3101/api/store/seller/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({account})
    });
   return response.json()
}

export async function storeFrontSubmitSellerRegistration(account: string): Promise<StoreFrontSellerRegistrationCheck> {
  const response = await fetch('http://localhost:3101/api/store/seller/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({account})
    });
   return response.json()
}

export async function storeFrontRevokeSellerRegistration(account: string): Promise<StoreFrontSellerRegistrationRevoked> {
  const response = await fetch('http://localhost:3101/api/store/seller/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({account})
    });
   return response.json()
}

export async function storeFrontRevokeAllSellerRegistrations(account: string): Promise<boolean> {
  const response = await fetch('http://localhost:3101/api/store/seller/revoke/all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({account})
    });
   return response.ok
}

export async function storeFrontGetOffersDetails(account: string): Promise<StoreFrontSellerOffersDetails[]> {
  const response = await fetch('http://localhost:3101/api/store/offers/details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({account})
    });
   return response.json()
}

export async function storeFrontAddOffer(account: string, offerId: string, countries: string[] ): Promise<StoreFrontOfferAdded> {
  const response = await fetch('http://localhost:3101/api/store/offers/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({account, offerId, countries})
    });
   return response.json()
}


export async function storeFrontRemoveOffer(account: string, offerId: string ): Promise<StoreFrontOfferRemoved> {
  const response = await fetch('http://localhost:3101/api/store/offers/remove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({account, offerId})
    });
   return response.json()
}


export async function storeFrontReportOffer(offerId: string, country: string, reason: string, remark: string ): Promise<StoreFrontOfferReported> {
  const response = await fetch('http://localhost:3101/api/store/offers/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({offerId, country, reason, remark})
    });
   return response.json()
}


export async function getPricePegs(): Promise<DaemonPricePeg[]> {
  const response = await fetch('http://localhost:3101/api/store/pricepegs', {
      method: 'GET'
    });
   return response.json()
}

export async function getGeneratedPaymentId(): Promise<GeneratedPaymentID> {
  const response = await fetch('http://localhost:3101/api/gen/paymentid', {
      method: 'GET'
    });
   return response.json()
}

export async function storeFrontCheckSellerPubKey(seller: string): Promise<StoreFrontSellerPubKeyCheck> {
  const response = await fetch(`http://localhost:3101/api/store/seller/pubkey?seller=${seller}`, {
      method: 'GET'
    });
   return response.json()
}

export async function processPurchaseAndMessageSeller(
    offerId: string, 
    seller: string, 
    txn: string, 
    txnProofSignature: string, 
    quantity: number,
    develiveryAddress: string,
    emailAddress: string,
    additionalMessage: string,
    wallet: string,
  ): Promise<PurchasedProcessed> {

  const requestBody = new PurchaseAdd()
  requestBody.offerId = offerId,
  requestBody.seller = seller
  requestBody.txn = txn,
  requestBody.txnProofSignature = txnProofSignature,
  requestBody.quantity = quantity,
  requestBody.develiveryAddress = develiveryAddress,
  requestBody.emailAddress = emailAddress,
  requestBody.additionalMessage = additionalMessage
  requestBody.wallet = wallet

  const response = await fetch('http://localhost:3101/api/purchases/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
   return response.json()
}
