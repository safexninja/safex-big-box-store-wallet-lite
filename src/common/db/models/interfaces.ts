import { UserStatus } from "../enums/users";
import { TxnStatus, SensibleTxnType } from "../../enums/txns";
import { CommunicationStatus } from "../../enums/communication";
import { MessageDirection, MessageStatus, MessageType } from "../../enums/messages";
import { OrderStatus } from "../../enums/orders";
import { PurchaseStatus } from "../../enums/purchases";
import { ErrorLogComponent, ErrorLogSeverity } from "../enums/errorlog";

export interface IUser {
    uuid: string;
    name: string;
    password: string;
    description?: string;
    status: UserStatus;
    termsAccepted: boolean;
    logsLastSeen: number;
    passwordHashed: boolean;
}

export interface IUserStrict {
    uuid: string;
    name: string;
    status: UserStatus;
    termsAccepted: boolean;   
    logsLastSeen: number;
}

export interface IUserSettings {
    uuid: string;
    user: string;
    defaultCountry: string;
    defaultAddress: string;
    daemonAddress: string;
    explorerAddress: string;
}

export interface IWallet {
    uuid: string;
    user: string;
    password: string;
    creationHeight: number;
    label: string;
    address: string;
    spendKey: string;
    viewKey: string;
    height: number;
    cashBalance: number;
    unlockedCashBalance: number;
    tokenBalance: number;
    unlockedTokenBalance: number;
    lastError: string;
    timestamp: number;
    deleted: boolean;
}

export interface IWalletStrict {
    uuid: string;
    user: string;
    creationHeight: number;
    label: string;
    address: string;
    height: number;
    cashBalance: number;
    unlockedCashBalance: number;
    tokenBalance: number;
    unlockedTokenBalance: number;
    lastError: string;
    timestamp: number;
    deleted: boolean;
}

export interface IWalletId{
    uuid: string;
    deleted: boolean
}

export interface IAccount {
    uuid: string;
    user: string;
    account: string;
    status: number;
    wallet: string;
    creationHeight: number;
    secretKey: string;
    lastError: string;
    deleted: boolean;
}

export interface IAccountStrict {
    uuid: string;
    user: string;
    account: string;
    status: number;
    wallet: string;
    creationHeight: number;
    lastError: string;
    deleted: boolean;
}

export interface IAccountId {
    uuid: string;
    deleted: boolean
}

export interface IConnectedApi {
    uuid: string;
    user: string;
    url: string;
    isActiveApi: boolean;
    messageAddress: string;
    privateKey: string;
    publicKey: string;
    timestamp: number
}

export interface ISellerRegistration {
    uuid: string;
    user: string;
    url: string;
    account: string;
    token: string;
    revokeToken: string;
    timestamp: number
}

export interface ISellerRegistrationOffer {
    uuid: string;
    sellerRegistrationUuid: string;
    offerUuid: string;
    offerId: string;
    removeToken: string;
}

export interface IPurchase {
    uuid: string;
    user: string; //uuid of user
    connectedApi: string //uuid of connected api
    title: string;
    seller: string;
    sellerPubkey: string; // pubkey from store front api for communication
    buyerMessageAddress: string, // generated for every purchase
    buyerPubkey: string, // generated for every purchase
    buyerPrivKey: string, // generated for every purchase
    timestamp: number;
    offerId: string;
    txn: string;
    txnProofSignature: string;
    txnStatus: TxnStatus;
    blockHeight?: number;
    blockTimestamp?: number;
    blockConfirmations?: number;
    quantity?: number;
    price?: number; // confirmed price from txn
    communicationStatus: CommunicationStatus
    hasNewMessages: boolean;
    purchaseStatus: PurchaseStatus;
    wallet: string;
    rated: boolean;
    feedbackStars?: number;
    feedbackComment?: string;
}

export interface IOrder {
    uuid: string;
    user: string; //uuid of user
    sellerRegistration: string //uuid of sellerRegistration
    title: string;
    account: string;
    timestamp: number;
    offerId: string;
    address: string;
    txn: string;
    txnProofSignature: string;
    txnProofSignatureValid?: boolean;
    txnStatus: TxnStatus;
    blockHeight?: number;
    blockTimestamp?: number;
    blockConfirmations?: number;
    quantity?: number; // confirmed from txn
    price?: number; // confirmed price from txn
    receivedCash?: number; // confirmed price from txn proof validation
    messageAddress: string //message address of the buyer
    messagePubkey: string //pubkey
    communicationStatus: CommunicationStatus
    hasNewMessages: boolean;
    orderStatus: OrderStatus
}

export interface IMessage {
    uuid: string; // remote uuid from store front API
    messageType: MessageType
    purchaseUuid?: string;
    orderUuid?: string;
    message: string;
    signatureValid: boolean;
    timestamp: number;
    status: MessageStatus;
    direction: MessageDirection;
    deleteToken: string
}

export interface ITxnHistory {
    wallet: string; //uuid of the wallet
    timestamp: number;
    txnId: string;
    paymentId: string;
    direction: string;
    pending: boolean;
    type: SensibleTxnType;
    cashAmount: number;
    tokenAmount: number;
    fee: number;
    blockHeight: number;
    confirmations: number;
}


export interface IErrorLog {
    uuid: string;
    user: string;
    component: ErrorLogComponent;
    severity: ErrorLogSeverity;
    timestamp: number;
    message: string
}