import { InterestInfo } from "safex-nodejs-wallet-lib"
import { WsResponseType } from "../enums/walletworker"

export interface WorkerConfiguration  {
    daemonAddress: String,
    daemonPort: String
}

export interface WorkerData  {
    token: string
}


export interface WorkerReponseMessage {
    type: WsResponseType,
    data: object
}

export interface WorkerErrorMessage extends WorkerReponseMessage {
    data: {
        error: string,
        message: string
    }
}

export interface WorkerAuthMessage extends WorkerReponseMessage {
    data: {
        message: string
    }
}


export interface WorkerWalletCreatedMessage extends WorkerReponseMessage {
    data: {
        uuid: string
    }
}

export interface WorkerWalletOpenedMessage extends WorkerReponseMessage {
    data: {
        uuid: string,
        address: string
    }
}

export interface WorkerBcUpdatedMessage extends WorkerReponseMessage {
    data: {
        bc_height: number,
    }
}

export interface WorkerRefreshedMessage extends WorkerReponseMessage {
    data: {
        height: number,
        balance: number,
        unlockedBalance: number,
        tokenBalance: number,
        unlockedTokenBalance: number
        accounts: object[]
        interestInfo: InterestInfo[]
    }
}


export interface WorkerCashSendMessage extends WorkerReponseMessage {
    data: {
        address: string,
        amount: number,
        mixin: number,
        fee: string,
        txn_id: string[]
    }
}

export interface WorkerTokenSendMessage extends WorkerReponseMessage {
    data: {
        address: string,
        amount: number,
        mixin: number,
        fee: string,
        txn_id: string[]
    }
}

export interface WorkerTokensStaked extends WorkerReponseMessage {
    data: {
        amount: number,
        fee: string,
        txn_id: string[]
    }
}

export interface WorkerTokensUnStaked extends WorkerReponseMessage {
    data: {
        amount: number,
        fee: string,
        txn_id: string[]
    }
}

export interface WorkerAccountCreated extends WorkerReponseMessage {
    data: {
        account: string,
        fee: string,
        txn_id: string[]
    }
}

export interface WorkerAccountEdited extends WorkerReponseMessage {
    data: {
        account: string,
        fee: string,
        txn_id: string[]
    }
}

export interface WorkerAccountRemoved extends WorkerReponseMessage {
    data: {
        account: string
    }
}

export interface WorkerAccountRecovered extends WorkerReponseMessage {
    data: {
        account: string
    }
}

export interface WorkerOfferCreated extends WorkerReponseMessage {
    data: {
        offer_title: string,
        fee: string,
        txn_id: string[]
    }
}

export interface WorkerOfferEdited extends WorkerReponseMessage {
    data: {
        offer_id: string,
        offer_title: string,
        fee: string,
        txn_id: string[]
    }
}


export interface WorkerOfferPurchased extends WorkerReponseMessage {
    data: {
        offer_id: string,
        quantity: number,
        fee: string,
        txn_id: string,
        txn_proof: string
    }
}

export interface WorkerFeedbackGiven extends WorkerReponseMessage {
    data: {
        offer_id: string,
        stars: number,
        comment: string,
        fee: string,
        txn_id: string[]
    }
}

export interface WorkerFeedbacks extends WorkerReponseMessage {
    data: {
        feedbacks: object[]
    }
}

export interface WorkerTxnProofChecked extends WorkerReponseMessage {
    data: {
        result: string
    }
}

export interface WorkerHistory extends WorkerReponseMessage {
    data: {
        result: string
    }
}