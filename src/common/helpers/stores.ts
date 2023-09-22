import axios from "axios";
import { response } from "express";

// utils
import { log, LogLevel } from "../../common/utils/logger";
import { MessageDirection } from "../enums/messages";

export type StoreFrontApiStatus = {
    status: string;
    height: number;
};

export type StoreFrontApiConfig = {
    item: string;
    value: string;
};

export type StoreFrontApiOffers = {
    seller: string,
    offers: string[]
};


export type StoreFrontSellerRegistrationCheck = {
    account: string,
    status: string,
    error: string
};

export type StoreFrontSellerRegistrationSubmitted = {
    uuid: string,
    account: string,
    token: string,
    revokeToken: string,
    error: string
};


export type StoreFrontSellerRegistrationRevoked = {
    uuid: string,
    revokeToken: string,
    status: string,
    error: string
};

export type StoreFrontSellerOffersDetails = {
    uuid: string,
    offerId: string,
    timestamp: string,
    countries: string[],
    error: string
};

export type StoreFrontOfferAdded = {
    uuid: string,
    offerId: string,
    removeToken: string,
    status: string,
    error: string
};

export type StoreFrontOfferRemoved = {
    status: string,
    error: string
};

export type StoreFrontSellerPubKey = {
    seller: string,
    pubKey: string
    error: string
};

export type StoreFrontMessagePosted = {
    messageId: string
};

export type StoreFrontMessageFetched = {
    uuid: string,
    from: string,
    offerId: string,
    txnId: string,
    encryptedMessage: string,
    signature: string,
    direction: MessageDirection,
    timestamp: number
};


export class StoreFrontSendMessage {
    constructor(
        public from: string = '',
        public to: string = '',
        public offerId: string = '',
        public txnId: string = '',
        public encryptedMessage: string = '',
        public signature: string = '',
        public direction: MessageDirection = MessageDirection.BUYER_TO_SELLER,
        public deleteToken: string = ''

    ){
        this.from = from;
        this.to = to;
        this.offerId = offerId;
        this.txnId = txnId;
        this.encryptedMessage = encryptedMessage;
        this.signature = signature;
        this.direction = direction;
        this.deleteToken = deleteToken;
    }
}

export class StoreFrontFetchMessages {
    constructor(
        public to: string = '',
        public since: number = 0
    ){
        this.to = to;
        this.since = since;
       
    }
}

export type StoreFrontMessageDeleted = {
    status: string,
    error: string
};


export type StoreFrontOfferReported = {
    status: string,
    error: string
};

export interface StoreFrontMessageDeleteEntry {
    uuid: string,
    deleteToken: string;
}


export async function storeFrontGetApiStatus(url: string): Promise<StoreFrontApiStatus | undefined> {
    try {
        const { data } = await axios.get<StoreFrontApiStatus>(`${url}/api/status`,
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO01 - Error getting Store Front API status from ${url}: ${error}`);
        return undefined;
    }
}

export async function storeFrontGetConfig(url: string): Promise<StoreFrontApiConfig[] | undefined> {
    try {
        const { data } = await axios.get<StoreFrontApiConfig[]>(`${url}/api/list/config`,
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO02 - Error getting Store Front API configuration from ${url}: ${error}`);
        return undefined;
    }
}



export async function storeFrontGetOffers(url: string, country: string | undefined): Promise<StoreFrontApiOffers[] | undefined> {
    try {
        const { data } = await axios.get<StoreFrontApiOffers[]>(`${url}/api/list/offers?country=${country}`,
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO03 - Error getting Store Front API offers from ${url}: ${error}`);
        return undefined;
    }
}

export async function storeFrontGetSellerRegistrationStatus(url: string, account: string): Promise<StoreFrontSellerRegistrationCheck | undefined> {
    try {
        const { data } = await axios.post<StoreFrontSellerRegistrationCheck>(`${url}/api/seller/check`,
            {
                account: account
            },
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
     
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO04 - Error getting seller registration status ${url}: ${error}`);
        return undefined;
    }
}


export async function storeFrontSubmitSellerRegistration(url: string, account: string, messageAddress: string, pubKey: string): Promise<StoreFrontSellerRegistrationSubmitted | undefined> {
    try {
        const { data } = await axios.post<StoreFrontSellerRegistrationSubmitted>(`${url}/api/seller/register`,
            {
                account: account,
                user: messageAddress,
                pubKey: pubKey
            },
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
     
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO05 - Error submiting seller registration ${url}: ${error}`);
        return undefined;
    }
}

export async function storeFrontRevokeSellerRegistration(url: string, account: string, revokeToken: string): Promise<StoreFrontSellerRegistrationRevoked | undefined> {
    try {
        const { data } = await axios.post<StoreFrontSellerRegistrationRevoked>(`${url}/api/seller/revoke`,
            {
                account: account,
                revokeToken: revokeToken
            },
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
     
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO06 - Error revoking seller registration ${url}: ${error}`);
        return undefined;
    }
}


export async function storeFrontGetPricePegs(url: string): Promise<string[] | undefined> {
    try {
        const { data } = await axios.get<string[]>(`${url}/api/list/pricepegs`,
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO07 - Error getting Store Front API price pegs from ${url}: ${error}`);
        return undefined;
    }
}

export async function storeFrontGetOffersDetails(url: string, uuid:string, account: string, token: string): Promise<StoreFrontSellerOffersDetails[] | undefined> {
    try {
        const { data } = await axios.post<StoreFrontSellerOffersDetails[]>(`${url}/api/offers/details`,
            {
                uuid: uuid,
                account: account,
                token: token
            },
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
     
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO08 - Error getting sellers offers details ${url}: ${error}`);
        return undefined;
    }
}


export async function storeFrontAddOffer(url: string, uuid:string, account: string, offerId: string, countries: string[], token: string): Promise<StoreFrontOfferAdded | undefined> {
    try {
        const { data } = await axios.post<StoreFrontOfferAdded>(`${url}/api/offers/add`,
            {
                uuid: uuid,
                account: account,
                offerId: offerId,
                countries: countries,
                token: token
            },
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
     
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO09 - Error adding offer to store front ${url}: ${error}`);
        return undefined;
    }
}


export async function storeFrontRemoveOffer(url: string, uuid: string, removeToken: string): Promise<StoreFrontOfferRemoved | undefined> {
    try {
        const { data } = await axios.post<StoreFrontOfferRemoved>(`${url}/api/offers/remove`,
            {
                uuid: uuid,
                removeToken: removeToken
            },
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
     
        return {status: response.statusMessage, error: ""};
    } catch (error) {
        log(LogLevel.ERROR, `STO10 - Error removing offer from store front ${url}: ${error}`);
        return undefined;
    }
}


export async function storeFrontGeSellerPubkey(url: string, seller: string): Promise<StoreFrontSellerPubKey | undefined> {
    try {
        const { data } = await axios.get<StoreFrontSellerPubKey>(`${url}/api/seller/pubkey?seller=${seller}`,
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO11 - Error getting Store Front API seller messaging pubKey ${url}: ${error}`);
        return undefined;
    }
}

export async function storeFrontPostMessage(
    url: string, 
    from: string, 
    to: string, 
    offerId: string, 
    txnId: string,
    encryptedMessage: string,
    signature: string,
    direction: MessageDirection,
    deleteToken: string
    ): Promise<StoreFrontMessagePosted | undefined> {

    const messageData = new StoreFrontSendMessage()
    messageData.from = from
    messageData.to = to
    messageData.offerId = offerId
    messageData.txnId = txnId
    messageData.encryptedMessage = encryptedMessage
    messageData.signature = signature
    messageData.direction = direction
    messageData.deleteToken = deleteToken

    try {
        const { data } = await axios.post<StoreFrontMessagePosted>(`${url}/api/message/send`,
        messageData,
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
     
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO11 - Error posting message to store front ${url}: ${error}`);
        return undefined;
    }
}

export async function storeFrontFetchMessages(
    url: string,
    to: string, 
    ): Promise<StoreFrontMessageFetched[] | undefined> {

    const messageData = new StoreFrontFetchMessages()
    messageData.to = to
  
    try {
        const { data } = await axios.post<StoreFrontMessageFetched[]>(`${url}/api/message/fetch`,
        messageData,
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
     
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO12 - Error fetching messages from store front ${url}: ${error}`);
        return undefined;
    }
}

export async function storeFrontDeleteMessages(
    url: string,
    messages: StoreFrontMessageDeleteEntry[], 
    ): Promise<StoreFrontMessageDeleted | undefined> {
  
    try {
        const { data } = await axios.post<StoreFrontMessageDeleted>(`${url}/api/message/delete`,
            {
                messages: messages
            },
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
     
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO13 - Error deleting messages from store front ${url}: ${error}`);
        return undefined;
    }
}

export async function storeFrontReportOffer(url: string, offerId: string, country: string, reason: string, remark: string): Promise<StoreFrontOfferReported | undefined> {
    try {
        const { data } = await axios.post<StoreFrontOfferReported>(`${url}/api/offers/report`,
            {
                offerId,
                country,
                reason,
                remark
            },
            {
                headers: {
                Accept: "application/json",
                }
                // uncomment lines below for testing with self signed certs
                // ,
                // httpsAgent: new https.Agent({
                // rejectUnauthorized: false
                // })
            }
        );
     
        return data;
    } catch (error) {
        log(LogLevel.ERROR, `STO14 - Error reporting offer to store front ${url}: ${error}`);
        return undefined;
    }
}