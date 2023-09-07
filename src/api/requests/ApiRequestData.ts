export abstract class ApiRequestData {
}

export class AuthLogin extends ApiRequestData {
    constructor(
        public name: string = '',
        public password: string = '',
    ){
        super()
        this.name = name;
        this.password = password;
    }
}

export class UserCreate extends ApiRequestData {
    constructor(
        public name: string = '',
        public password: string = ''

    ){
        super()
        this.name = name;
        this.password = password;
    }
}

export class UserUpdateInfo extends ApiRequestData {
    constructor(
        public uuid: string = '',
        public description: string = ''
    ){
        super()
        this.uuid = uuid;
        this.description = description;
    }
}

export class UserUpdatePassword extends ApiRequestData {
    constructor(
        public uuid: string = '',
        public password: string = ''
    ){
        super()
        this.uuid = uuid;
        this.password = password;
    }
}

export class UserSettings extends ApiRequestData {
    constructor(
        public defaultCountry: string = '',
        public defaultAddress: string = '',
        public daemonAddress: string = '',
        public explorerAddress: string = '',
    ){
        super()
        this.defaultCountry = defaultCountry;
        this.defaultAddress = defaultAddress;
        this.daemonAddress = daemonAddress;
        this.explorerAddress = explorerAddress;
    }
}

export class WalletUpdateInfo extends ApiRequestData {
    constructor(
        public uuid: string = '',
        public label: string = ''
    ){
        super()
        this.uuid = uuid;
        this.label = label;
    }
}

export class WalletUpdateDeleted extends ApiRequestData {
    constructor(
        public uuid: string = ''
    ){
        super()
        this.uuid = uuid;
    }
}

export class WalletHistory extends ApiRequestData {
    constructor(
        public uuid: string = ''
    ){
        super()
        this.uuid = uuid;
    }
}

export class PurchaseAdd extends ApiRequestData {
    constructor(
        public offerId: string = '',
        public seller: string = '',
        public txn: string = '',
        public txnProofSignature: string = '',
        public quantity: number = 0,
        public develiveryAddress: string = '',
        public emailAddress: string = '',
        public additionalMessage: string = '',
        public wallet: string = ''

    ){
        super()
        this.offerId = offerId;
        this.seller = seller;
        this.txn = txn;
        this.txnProofSignature = txnProofSignature;
        this.quantity = quantity;
        this.develiveryAddress = develiveryAddress;
        this.emailAddress = emailAddress;
        this.additionalMessage = additionalMessage;
        this.wallet = wallet;
    }
}

export class PurchaseReply extends ApiRequestData {
    constructor(
        public purchaseUuid: string = '',
        public message: string = '',
    ){
        super()
        this.purchaseUuid = purchaseUuid;
        this.message = message;
    }
}

export class PurchaseGetMessages extends ApiRequestData {
    constructor(
        public purchaseUuid: string = '',
    ){
        super()
        this.purchaseUuid = purchaseUuid;
    }
}

export class PurchaseCloseCommunication extends ApiRequestData {
    constructor(
        public purchaseUuid: string = '',
    ){
        super()
        this.purchaseUuid = purchaseUuid;
    }
}

export class PurchaseClose extends ApiRequestData {
    constructor(
        public purchaseUuid: string = '',
    ){
        super()
        this.purchaseUuid = purchaseUuid;
    }
}

export class PurchaseRate extends ApiRequestData {
    constructor(
        public purchaseUuid: string = '',
        public stars: number = 3,
        public feedback: string = '',
    ){
        super()
        this.purchaseUuid = purchaseUuid;
        this.stars = stars;
        this.feedback = feedback;
    }
}

export class PurchaseConfirmDelivery extends ApiRequestData {
    constructor(
        public purchaseUuid: string = '',
    ){
        super()
        this.purchaseUuid = purchaseUuid;
    }
}

export class OrderReply extends ApiRequestData {
    constructor(
        public orderUuid: string = '',
        public message: string = '',
    ){
        super()
        this.orderUuid = orderUuid;
        this.message = message;
    }
}

export class OrderGetMessages extends ApiRequestData {
    constructor(
        public orderUuid: string = '',
    ){
        super()
        this.orderUuid = orderUuid;
    }
}

export class OrderShipped extends ApiRequestData {
    constructor(
        public orderUuid: string = '',
    ){
        super()
        this.orderUuid = orderUuid;
    }
}

export class OrderCloseCommunication extends ApiRequestData {
    constructor(
        public orderUuid: string = '',
    ){
        super()
        this.orderUuid = orderUuid;
    }
}

export class OrderClose extends ApiRequestData {
    constructor(
        public orderUuid: string = '',
    ){
        super()
        this.orderUuid = orderUuid;
    }
}

export class OrderValidation extends ApiRequestData {
    constructor(
        public orderUuid: string = '',
        public receivedCash: number = 0,
        public valid: boolean = false
    ){
        super()
        this.orderUuid = orderUuid;
        this.receivedCash = receivedCash;
        this.valid = valid;
    }
}

export class SetStore extends ApiRequestData {
    constructor(
        public url: string = ''
    ){
        super()
        this.url = url;
    }
}

export class StoreSellerCheck extends ApiRequestData {
    constructor(
        public account: string = ''
    ){
        super()
        this.account = account;
    }
}

export class StoreSellerRegister extends ApiRequestData {
    constructor(
        public account: string = ''
    ){
        super()
        this.account = account;
    }
}

export class StoreSellerRevoke extends ApiRequestData {
    constructor(
        public account: string = ''
    ){
        super()
        this.account = account;
    }
}

export class StoreOffersDetails extends ApiRequestData {
    constructor(
        public account: string = '',
    ){
        super()
        this.account = account;
    }
}

export class StoreOfferAdd extends ApiRequestData {
    constructor(
        public account: string = '',
        public offerId: string = '',
        public countries: string[] = []
    ){
        super()
        this.account = account;
        this.offerId = offerId;
        this.countries = countries;
    }
}

export class StoreOfferRemove extends ApiRequestData {
    constructor(
        public account: string = '',
        public offerId: string = ''
    ){
        super()
        this.account = account;
        this.offerId = offerId;
    }
}

export class StoreOfferReport extends ApiRequestData {
    constructor(
        public offerId: string = '',
        public country: string = '',
        public reason: string = '',
        public remark: string = ''
    ){
        super()
        this.country = country;
        this.offerId = offerId;
        this.reason = reason;
        this.remark = remark;
    }
}