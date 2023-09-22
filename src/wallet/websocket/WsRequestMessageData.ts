export abstract class WsRequestMessageData {
}


export class WsRequestMessageData_OpenWallet extends WsRequestMessageData {
    constructor(
        public uuid: string = ''
    ){
        super()
        this.uuid = uuid
    }
}

export class WsRequestMessageData_RescanBc extends WsRequestMessageData {
    constructor(
    ){
        super()
    }

}

export class WsRequestMessageData_History extends WsRequestMessageData {
    constructor(
    ){
        super()
    }

}

export class WsRequestMessageData_CreateWallet extends WsRequestMessageData {
    constructor(
    ){
        super()
    }
}

export class WsRequestMessageData_CreateWalletFromKeys extends WsRequestMessageData {
    constructor(
        public address: string = '',
        public viewKey: string = '',
        public spendKey: string = ''
    ){
        super()
        this.address = address;
        this.viewKey = viewKey;
        this.spendKey = spendKey;
    }
}

export class WsRequestMessageData_CloseWallet extends WsRequestMessageData {
    constructor(
    ){
        super()
    }
}

export class WsRequestMessageData_SendCash extends WsRequestMessageData {
    constructor(
        public address: string = '',
        public amount: number = 0,
        public mixin: number = 6,
        public paymentId: string = ''
    ){
        super()
        this.address = address;
        this.amount = amount;
        this.mixin = mixin;
        this.paymentId = paymentId;
    }
}

export class WsRequestMessageData_SendToken extends WsRequestMessageData {
    constructor(
        public address: string = '',
        public amount: number = 0,
        public mixin: number = 6,
        public paymentId: string = ''
    ){
        super()
        this.address = address;
        this.amount = amount;
        this.mixin = mixin;
        this.paymentId = paymentId;
    }
}

export class WsRequestMessageData_CreateAccount extends WsRequestMessageData {
    constructor(
        public mixin: number = 6,
        public account: string = '',
        public description: string = '',
        
    ){
        super()
        this.mixin = mixin > 0 ? mixin : 6;
        this.account = account;
        this.description = description;
    }
}

export class WsRequestMessageData_RemoveAccount extends WsRequestMessageData {
    constructor(
        public account: string = '',
    ){
        super();
        this.account = account;
    }
}

export class WsRequestMessageData_RecoverAccount extends WsRequestMessageData {
    constructor(
        public account: string = '',
        public secretKey: string = '',
    ){
        super();
        this.account = account;
        this.secretKey = secretKey;
    }
}

export class WsRequestMessageData_EditAccount extends WsRequestMessageData {
    constructor(
        public mixin: number = 6,
        public account: string = '',
        public description: string = '',
        
    ){
        super()
        this.mixin = mixin > 0 ? mixin : 6;
        this.account = account;
        this.description = description;
    }
}

export class WsRequestMessageData_CreateOffer extends WsRequestMessageData {
    constructor(
        public mixin: number = 6,
        public account: string = '',
        public title: string = '',
        public price: number = 0,
        public quantity: number = 0,
        public description: string  = '',
        public pricePegUsed: number = 0,
        public pricePegId: string = '',
        public minSfxPrice: number = 0,
        public offerActive: number = 0        
    ){
        super()
        this.mixin = mixin > 0 ? mixin : 6;
        this.account = account;
        this.title = title;
        this.price = price;
        this.quantity = quantity;
        this.description = description;
        this.pricePegUsed = pricePegUsed;
        this.pricePegId = pricePegId;
        this.minSfxPrice = minSfxPrice;
        this.offerActive = offerActive;
    }
}

export class WsRequestMessageData_EditOffer extends WsRequestMessageData {
    constructor(
        public mixin: number = 6,
        public account: string = '',
        public offerId: string = '',
        public title: string = '',
        public price: number = 0,
        public quantity: number = 0,
        public description: string = '',
        public pricePegUsed: number = 0,
        public pricePegId: string = '',
        public minSfxPrice: number = 0,
        public offerActive: number = 0        
    ){
        super()
        this.mixin = mixin > 0 ? mixin : 6;
        this.account = account;
        this.offerId = offerId
        this.title = title;
        this.price = price;
        this.quantity = quantity;
        this.description = description;
        this.pricePegUsed = pricePegUsed;
        this.pricePegId = pricePegId;
        this.minSfxPrice = minSfxPrice;
        this.offerActive = offerActive;
    }
}

export class WsRequestMessageData_PurchaseOffer extends WsRequestMessageData {
    constructor(
        public mixin: number = 6,
        public offerId: string = '',
        public quantity: number = 0,
        public sellerAddress: string = '',
        public txnProofMessage: string = '',

    ){
        super();
        this.mixin = mixin > 0 ? mixin : 6;
        this.offerId = offerId;
        this.quantity = quantity;
        this.sellerAddress = sellerAddress;
        this.txnProofMessage = txnProofMessage;
    }
}

export class WsRequestMessageData_GiveFeedback extends WsRequestMessageData {
    constructor(
        public mixin: number = 6,
        public offerId: string = '',
        public stars: number = 3,
        public comment: string = '',
    ){
        super();
        this.mixin = mixin > 0 ? mixin : 6;
        this.offerId = offerId;
        this.stars = stars;
        this.comment = comment;
    }
}


export class WsRequestMessageData_GetFeedbacks extends WsRequestMessageData {
    constructor(
    ){
        super();
    }
}

export class WsRequestMessageData_CheckTxProof extends WsRequestMessageData {
    constructor(
        public txnId: string = '',
        public signature: string = '',
        public txnProofMessage: string = '',
    ){
        super();
        this.txnId = txnId;
        this.signature = signature;
        this.txnProofMessage = txnProofMessage;
    }
}


export class WsRequestMessageData_StakeTokens extends WsRequestMessageData {
    constructor(
        public mixin: number = 6,
        public amount: number = 0,
    ){
        super();
        this.mixin = mixin;
        this.amount = amount;
    }
}

export class WsRequestMessageData_UnStakeTokens extends WsRequestMessageData {
    constructor(
        public mixin: number = 6,
        public amount: number = 0,
        public blockHeight: number = 0,
    ){
        super();
        this.mixin = mixin;
        this.amount = amount;
        this.blockHeight = blockHeight;
    }
}