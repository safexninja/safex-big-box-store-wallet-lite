import { arrayRemoveIndex } from '../../../common/utils/arrays'
import Cookies from 'js-cookie'
import { WsResponseType } from '../../../wallet/enums/walletworker'
import { WsRequestMessageData_CheckTxProof, WsRequestMessageData_CreateAccount, WsRequestMessageData_CreateOffer, WsRequestMessageData_CreateWallet, WsRequestMessageData_CreateWalletFromKeys, WsRequestMessageData_EditAccount, WsRequestMessageData_EditOffer, WsRequestMessageData_GiveFeedback, WsRequestMessageData_OpenWallet, WsRequestMessageData_PurchaseOffer, WsRequestMessageData_RecoverAccount, WsRequestMessageData_RemoveAccount, WsRequestMessageData_SendCash, WsRequestMessageData_StakeTokens, WsRequestMessageData_UnStakeTokens } from '../../../wallet/websocket/WsRequestMessageData'
import { WsRequestMessage } from '../../../wallet/websocket/WsRequestMessage'
import { WsRquestMessageType } from '../../../wallet/enums/websocket'
import { WorkerAccountCreated, WorkerAccountEdited, WorkerAccountRecovered, WorkerAccountRemoved, WorkerBcUpdatedMessage, WorkerCashSendMessage, WorkerErrorMessage, WorkerFeedbackGiven, WorkerHistory, WorkerOfferCreated, WorkerOfferEdited, WorkerOfferPurchased, WorkerRefreshedMessage, WorkerTokenSendMessage, WorkerTokensStaked, WorkerTokensUnStaked, WorkerTxnProofChecked, WorkerWalletCreatedMessage } from '../../../wallet/interfaces/walletworker'
import { showToast } from './toast';
import { convertTimestampToDate } from '../../../common/utils/dates'
import { roundToTenDecimals, toNormalUnits } from '../../../common/utils/units'
import { BB_OfferDescription } from '../../../common/interfaces/offerFormat'
import { stringify } from 'querystring'
import { InterestInfo } from 'safex-nodejs-libwallet'
import * as staking from '../../../common/constants/staking'
import { ErrorRequestHandler } from 'express'

export enum WsConnectionState {
    INITIATED = "INITIATED",
    CONNECTED = "CONNECTED",
    WALLET_OPENED = "WALLET_OPENED",
    CLOSABLE = "CLOSABLE",
    CLOSING = "CLOSING",
    CLOSED = "CLOSED"
}

export enum WsAccountRecoverState {
    NONE = "NONE",
    RECOVERING = "RECOVERING"
}

export enum WsPurchaseState {
    NONE = "NONE",
    PROCESSING = "PROCESSING",
    COMITTED = "COMITTED"
}

export enum WsCheckTxnProofState {
    NONE = "NONE",
    PROCESSING = "PROCESSING"
}

export enum WsHistoryLoadingState {
    NONE = "NONE",
    LOADING = "LOADING"
}

export enum WsConnectionOpenWalletType {
    EXISTING = "EXISTING",
    CREATE_NEW = "CREATE_NEW",
    CREATE_FROM_KEYS = "CREATE_FROM_KEYS"
}

export interface WsConnectionCreateWalletArgs {
    address: string,
    viewKey: string,
    spendKey: string
}

export interface WsSafexAccount {
    account: string,
    status: number
}

export interface WsInterestInfo {
    tokenStaked: string,
    collectedInterest: string,
    blockHeight: string
}



function createWebSocketPath(path: string): string {
    var protocolPrefix = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';
    return protocolPrefix + '//' + location.host + path
}


interface WsConnectionManagerEntry {
    walletUuid: string
    wsConnection: WalletWsConnectionHandler
}


class WsConnectionManager {

    private wsConnections: WsConnectionManagerEntry[]

    public constructor() {
        this.wsConnections = []
    }

    public getConnection (uuid: string): WsConnectionManagerEntry {
        const connection = this.wsConnections.find(webSocket => webSocket.walletUuid == uuid)
        if(connection){
            return connection
        } else {
            const newConnection: WalletWsConnectionHandler = new WalletWsConnectionHandler(uuid, WsConnectionOpenWalletType.EXISTING)
            this.addConnection(uuid, newConnection)
            return {walletUuid: uuid, wsConnection: newConnection}
        }
    }

    public addConnection (uuid: string, websocketConnection: WalletWsConnectionHandler) {
        const connection = this.wsConnections.find(webSocket => webSocket.walletUuid == uuid)
        if(connection){
            connection.wsConnection.close()
            this.removeConnection(uuid)
        } 
        this.wsConnections.push({walletUuid: uuid, wsConnection: websocketConnection})    
    }

    public removeConnection(uuid: string){
        const connection = this.wsConnections.find(webSocket => webSocket.walletUuid == uuid)    
        if(connection){
            connection.wsConnection.close()
            this.wsConnections = arrayRemoveIndex(this.wsConnections, this.wsConnections.indexOf(connection))
        }
    }
}

let websocketConnectionManager = new WsConnectionManager()
export { websocketConnectionManager }





export class WalletWsConnectionHandler {

    private socket: WebSocket
    private state: WsConnectionState
    private height: number = 0
    private balance: number = 0
    private unlockedBalance: number = 0
    private tokenBalance: number = 0
    private unlockedTokenBalance: number = 0
    private accounts: WsSafexAccount[] = []
    private interestInfo: WsInterestInfo[] = []
    private accountRecoverState: WsAccountRecoverState = WsAccountRecoverState.NONE
    private purchaseState: WsPurchaseState = WsPurchaseState.NONE
    private purchaseTnxData: any
    private txnCheckProofState: WsCheckTxnProofState = WsCheckTxnProofState.NONE
    private txnProofResult: any
    private historyLoadingState: WsHistoryLoadingState = WsHistoryLoadingState.NONE
    private historyData: any
    // private accounts: 

    public constructor(
        private uuid: string,
        private openWalletType: WsConnectionOpenWalletType,
        private createWalletArgs?: WsConnectionCreateWalletArgs
    ) {

        this.state = this.setState(WsConnectionState.INITIATED)
        
        
        let token = Cookies.get('access_token')

        this.socket = new WebSocket(createWebSocketPath("/ws") + "?token=" + token);

        this.socket.onopen = function(e) {
        };

        this.socket.onmessage = function(this: WalletWsConnectionHandler,event: any) {

            try{

                const parsedMessage = JSON.parse(event.data)
                const messageType = WsResponseType[parsedMessage.type as keyof typeof WsResponseType];
    
                switch (messageType) {
                    case WsResponseType.CONNECTED:   
                        this.state = this.setState(WsConnectionState.CONNECTED);

                        if(this.openWalletType === WsConnectionOpenWalletType.EXISTING){
                            this.openWallet();
                        }

                        if(this.openWalletType === WsConnectionOpenWalletType.CREATE_NEW){
                            this.createWallet()
                            
                        }

                        if(this.openWalletType === WsConnectionOpenWalletType.CREATE_FROM_KEYS){
                            this.createWalletFromKeys()
                        }
                        
                        break;
                    case WsResponseType.WALLET_OPENED:   
                        this.state = this.setState(WsConnectionState.WALLET_OPENED);
                        break;
                    case WsResponseType.WALLET_CREATED:   
                        this.state = this.setState(WsConnectionState.WALLET_OPENED);
                        this.handleCreatedWallet(parsedMessage as WorkerWalletCreatedMessage)
                        break;
                    case WsResponseType.WALLET_BC_UPDATED:   
                        this.state = this.setState(WsConnectionState.WALLET_OPENED);
                        this.updateBcHeight(parsedMessage as WorkerBcUpdatedMessage)
                        break;
                    case WsResponseType.WALLET_REFRESHED:   
                        this.state = this.setState(WsConnectionState.CLOSABLE);
                        this.updateWalletData(parsedMessage as WorkerRefreshedMessage)
                        break;
                    case WsResponseType.ERROR:   
                        this.purchaseState = WsPurchaseState.NONE
                        this.displayError(parsedMessage as WorkerErrorMessage);
                        break;
                    case WsResponseType.CASH_SEND:   
                        this.displayCashSend(parsedMessage as WorkerCashSendMessage);
                        break;
                    case WsResponseType.TOKEN_SEND:   
                        this.displayTokenSend(parsedMessage as WorkerTokenSendMessage);
                        break;
                    case WsResponseType.ACCOUNT_CREATED:   
                        this.displayAccountCreated(parsedMessage as WorkerAccountCreated);
                        break;
                    case WsResponseType.ACCOUNT_RECOVERED:  
                        this.accountRecoverState = WsAccountRecoverState.NONE
                        this.displayAccountRecovered(parsedMessage as WorkerAccountRecovered);
                        break;
                    case WsResponseType.ACCOUNT_EDITED:
                        this.displayAccountEdited(parsedMessage as WorkerAccountEdited);
                        break;
                    case WsResponseType.ACCOUNT_REMOVED:
                        this.displayAccountRemoved(parsedMessage as WorkerAccountRemoved);
                        break;
                    case WsResponseType.OFFER_CREATED:   
                        this.displayOfferCreated(parsedMessage as WorkerOfferCreated);
                        break;
                    case WsResponseType.OFFER_EDITED:   
                        this.displayOfferEdited(parsedMessage as WorkerOfferEdited);
                        break;
                    case WsResponseType.OFFER_PURCHASED:   
                        this.purchaseState = WsPurchaseState.COMITTED
                        this.purchaseTnxData = (parsedMessage as WorkerOfferPurchased)
                        this.displayOfferPurchased(parsedMessage as WorkerOfferPurchased);
                        break;
                    case WsResponseType.HISTORY:   
                        this.historyLoadingState = WsHistoryLoadingState.NONE
                        this.historyData = (parsedMessage as WorkerHistory)
                        break;
                    case WsResponseType.TX_PROOF_CHECKED:   
                        this.txnCheckProofState = WsCheckTxnProofState.NONE
                        this.txnProofResult = (parsedMessage as WorkerTxnProofChecked).data.result
                        break;
                    case WsResponseType.FEEDBACK_GIVEN:
                        this.displayFeedbackGiven(parsedMessage as WorkerFeedbackGiven);
                        break;
                    case WsResponseType.TOKENS_STAKED:
                        this.displayTokensStaked(parsedMessage as WorkerTokensStaked);
                        break;
                    case WsResponseType.TOKENS_UNSTAKED:
                        this.displayTokensUnstaked(parsedMessage as WorkerTokensUnStaked);
                        break;
                    default:
                        break;
                }
            } catch (error){
                console.log(`Something went wrong with the wallet websocket connection for wallet id '${this.uuid}' ...`)
            }
               
        
        }.bind(this);

        this.socket.onclose = function(this: WalletWsConnectionHandler, event: any) {
            websocketConnectionManager.removeConnection(uuid)
            this.setState(WsConnectionState.CLOSED)
        }.bind(this);

        this.socket.onerror = function(error) {
            console.log(error)
            showToast("Connection error",  (error as unknown as Error).message || error.toString(), 15000)
        };
    }

     public getUuid(): string {
        return this.uuid
    }


    public close(){
        this.setState(WsConnectionState.CLOSING)
        this.socket.close()
    }

    public send(message: string){
        this.socket.send(message)
    }

    private openWallet(){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.OPEN_WALLET, 
                    new WsRequestMessageData_OpenWallet(this.uuid)
                    )           
            )
        )
    }

    private createWallet(){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.CREATE_WALLET, 
                    new WsRequestMessageData_CreateWallet()
                    )           
            )
        )
    }

    private createWalletFromKeys(){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.CREATE_WALLET_FROM_KEYS, 
                    new WsRequestMessageData_CreateWalletFromKeys(this.createWalletArgs?.address, this.createWalletArgs?.viewKey, this.createWalletArgs?.spendKey)
                    )           
            )
        )
    }

    private handleCreatedWallet(message: WorkerWalletCreatedMessage){
        this.uuid = message.data.uuid
        websocketConnectionManager.addConnection(message.data.uuid, this)
    }

    public sendCash(recipientAddress: string, amount: number, mixin: number, paymentId: string){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.SEND_CASH, 
                    new WsRequestMessageData_SendCash(recipientAddress, amount, mixin, paymentId)
                    )           
            )
        )
    }
    
    public sendToken(recipientAddress: string, amount: number, mixin: number, paymentId: string){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.SEND_TOKEN, 
                    new WsRequestMessageData_SendCash(recipientAddress, amount, mixin, paymentId)
                    )           
            )
        )
    }

    public stakeTokens(amount: number, mixin: number){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.STAKE_TOKENS, 
                    new WsRequestMessageData_StakeTokens(mixin, amount)
                    )           
            )
        )
    }

    public unstakeTokens(amount:number, blockHeight: number, mixin: number){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.UNSTAKE_TOKENS, 
                    new WsRequestMessageData_UnStakeTokens(mixin, amount, blockHeight)
                    )           
            )
        )
    }

    public createAccount(account: string, description: string, mixin: number){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.CREATE_ACCOUNT, 
                    new WsRequestMessageData_CreateAccount(mixin, account, JSON.stringify(description))
                    )           
            )
        )
    }

    public recoverAccount(account: string, secretKey: string){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.RECOVER_ACCOUNT, 
                    new WsRequestMessageData_RecoverAccount(account, secretKey)
                    )           
            )
        )
    }

    public editAccount(account: string, description: string, mixin: number){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.EDIT_ACCOUNT, 
                    new WsRequestMessageData_EditAccount(mixin, account, description)
                    )           
            )
        )
    }

    public removeAccount(account: string){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.REMOVE_ACCOUNT, 
                    new WsRequestMessageData_RemoveAccount(account)
                    )           
            )
        )
    }

    public giveFeedback(offerId: string, stars: number, comment: string, mixin: number){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.GIVE_FEEDBACK, 
                    new WsRequestMessageData_GiveFeedback(mixin, offerId, stars, comment)
                    )           
            )
        )
    }


    public createOffer(
        account: string,
        title: string,
        price: number,
        quantity: number,
        description: BB_OfferDescription,
        pricePegUsed: number,
        pricePegId: string,
        minSfxPrice: number,
        offerActive: number,
        mixin: number){

        const newOffer = new WsRequestMessageData_CreateOffer()
        newOffer.mixin = mixin
        newOffer.account  = account
        newOffer.title = title
        newOffer.price = price
        newOffer.quantity = quantity
        newOffer.description = JSON.stringify(description)
        newOffer.pricePegUsed = pricePegUsed
        newOffer.pricePegId = pricePegId
        newOffer.minSfxPrice = minSfxPrice,
        newOffer.offerActive = offerActive
        
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.CREATE_OFFER, newOffer
                    )           
            )
        )
    }

    public editOffer(
        account: string,
        offerId: string,
        title: string,
        price: number,
        quantity: number,
        description: BB_OfferDescription,
        pricePegUsed: number,
        pricePegId: string,
        minSfxPrice: number,
        offerActive: number,
        mixin: number){

        const existingOffer = new WsRequestMessageData_EditOffer()
        existingOffer.mixin = mixin
        existingOffer.account  = account
        existingOffer.offerId = offerId
        existingOffer.title = title
        existingOffer.price = price
        existingOffer.quantity = quantity
        existingOffer.description = JSON.stringify(description)
        existingOffer.pricePegUsed = pricePegUsed
        existingOffer.pricePegId = pricePegId
        existingOffer.minSfxPrice = minSfxPrice,
        existingOffer.offerActive = offerActive
        
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.EDIT_OFFER, existingOffer)           
            )
        )
    }

    public purchaseOffer(offerId: string, quantity: number, mixin: number, sellerAddress: string){
        const offer = new WsRequestMessageData_PurchaseOffer()

        offer.mixin = mixin
        offer.offerId = offerId
        offer.quantity = quantity
        offer.sellerAddress = sellerAddress
        offer.txnProofMessage = offerId

        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.PURCHASE_OFFER, offer)
            )
        )
    }

    public checkTxtProof(txnId: string, signature: string, txnProofMessage: string){
        const txnProofData = new WsRequestMessageData_CheckTxProof()
        txnProofData.txnId = txnId
        txnProofData.signature = signature
        txnProofData.txnProofMessage = txnProofMessage

        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.CHECK_TX_PROOF, txnProofData)
            )
        )
    }

    public hardRescanBC(){
        this.setState(WsConnectionState.CONNECTED)
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.RESCAN_BC, 
                    {}
                    )           
            )
        )
    }

    public getHistory(){
        this.socket.send( JSON.stringify(
                new WsRequestMessage(
                    WsRquestMessageType.HISTORY, 
                    {}
                    )           
            )
        )
    }

    private displayError(message: WorkerErrorMessage){
           showToast(message.data.message, message.data.error , 15000)  
    }

    private displayCashSend(message: WorkerCashSendMessage){
        setTimeout(()=>{
            showToast("Safex Cash Send!", `<b>${message.data.amount} SFX</b> has been sent to<br><br> ${message.data.address}<br><br> (fee: ${toNormalUnits(parseInt(message.data.fee))} SFX), <br><br> txn: <a href="/tx/${message.data.txn_id}" target="_blank">${message.data.txn_id}</a>`, 30000)
        }, 2500)
    }

    private displayTokenSend(message: WorkerTokenSendMessage){
        setTimeout(()=>{
            showToast("Safex Token Send!", `<b>${message.data.amount} SFT</b> has been sent to<br><br> ${message.data.address}<br><br> (fee: ${toNormalUnits(parseInt(message.data.fee))} SFX),<br><br> txn: <a href="/tx/${message.data.txn_id}" target="_blank">${message.data.txn_id}</a>`, 30000)
        }, 2500)
        
    }

    private displayAccountCreated(message: WorkerAccountCreated){
        setTimeout(()=>{
            showToast("Safex Account Created!", `Account "<b>${message.data.account}</b>" creation was succesfully sent to the blockchain.<br><br> (fee: ${toNormalUnits(parseInt(message.data.fee))} SFX),<br><br> txn: <a href="/tx/${message.data.txn_id}" target="_blank">${message.data.txn_id}</a>`, 30000)
        }, 2500) 
    }

    private displayAccountRecovered(message: WorkerAccountRecovered){
        setTimeout(()=>{
            showToast("Safex Account Restored!", `Account "<b>${message.data.account}</b>" was succesfully restored into the wallet`, 30000)
        }, 1000)
    }

    private displayAccountEdited(message: WorkerAccountEdited){
        setTimeout(()=>{
            showToast("Safex Account Edited!", `Account "<b>${message.data.account}</b>" edit was succesfully send to the blockchain. Please refresh your wallet page after the transaction has been confirmed.<br><br> (fee: ${toNormalUnits(parseInt(message.data.fee))} SFX),<br><br> txn: <a href="/tx/${message.data.txn_id}" target="_blank">${message.data.txn_id}</a>`, 30000)
        }, 2500)
    }

    private displayAccountRemoved(message: WorkerAccountRemoved){
        setTimeout(()=>{
            showToast("Safex Account Removed!", `Account "<b>${message.data.account}</b>" edit was removed from your wallet.`, 30000)
        }, 1000)     
    }

    private displayOfferCreated(message: WorkerOfferCreated){
        setTimeout(()=>{
            showToast("Offer Created!", `Offer "<b>${message.data.offer_title}</b>" creation was succesfully sent to the blockchain. After confirmation the offer will be visible in your listings.<br><br> (fee: ${toNormalUnits(parseInt(message.data.fee))} SFX),<br><br> txn: <a href="/tx/${message.data.txn_id}" target="_blank">${message.data.txn_id}</a>`, 30000)
        }, 2500)
    }

    private displayOfferEdited(message: WorkerOfferEdited){
        setTimeout(()=>{
            showToast("Offer Edited!", `Changes to offer "<b>${message.data.offer_title}</b>" was succesfully sent to the blockchain. After confirmation the changes will be reflected in your listings.<br><br> (fee: ${toNormalUnits(parseInt(message.data.fee))} SFX),<br><br> txn: <a href="/tx/${message.data.txn_id}" target="_blank">${message.data.txn_id}</a>`, 30000)
        }, 2500)
    }

    private displayOfferPurchased(message: WorkerOfferPurchased){
        setTimeout(()=>{
            showToast("Offer Purchased!", `Purchase of offer "<b>${message.data.offer_id}</b>" with quantity ${message.data.quantity} was succesfully sent to the blockchain.<br><br> (fee: ${toNormalUnits(parseInt(message.data.fee))} SFX),<br><br> txn: <a href="/tx/${message.data.txn_id}" target="_blank">${message.data.txn_id}</a>`, 30000)
        }, 2500)
    }

    private displayFeedbackGiven(message: WorkerFeedbackGiven){
        setTimeout(()=>{
            showToast("Feedback GIven!", `Your feedback for offer "<b>${message.data.offer_id}</b>"  was succesfully sent to the blockchain. <br><br> (fee: ${toNormalUnits(parseInt(message.data.fee))} SFX),<br><br> txn: <a href="/tx/${message.data.txn_id}" target="_blank">${message.data.txn_id}</a>`, 30000)
        }, 2500)     
    }
    
    private displayTokensStaked(message: WorkerTokensStaked){
        setTimeout(()=>{
            showToast("Tokens Staked!", `Staking of "<b>${message.data.amount}</b>" Safex Tokens was succesfully sent to the blockchain. <br><br> (fee: ${toNormalUnits(parseInt(message.data.fee))} SFX),<br><br> txn: <a href="/tx/${message.data.txn_id}" target="_blank">${message.data.txn_id}</a>`, 20000)
        }, 2500)     
    }

    private displayTokensUnstaked(message: WorkerTokensUnStaked){
        setTimeout(()=>{
            showToast("Tokens Unstaked!", `Unstaking of "<b>${message.data.amount}</b>" Safex Tokens was succesfully sent to the blockchain. <br><br> (fee: ${toNormalUnits(parseInt(message.data.fee))} SFX),<br><br> txn: <a href="/tx/${message.data.txn_id}" target="_blank">${message.data.txn_id}</a>`, 20000)
        }, 2500)     
    }

    private updateWalletData(message: WorkerRefreshedMessage){
        const height = document.querySelectorAll(`span[data=height][data-wallet="${this.uuid}"]`)
        const timestamp = document.querySelectorAll(`span[data=timestamp][data-wallet="${this.uuid}"]`)
        const cashBalance = document.querySelectorAll(`span[data=cash_balance][data-wallet="${this.uuid}"]`)
        const tokenBalance = document.querySelectorAll(`span[data=token_balance][data-wallet="${this.uuid}"]`)
        const cashBalancePending = document.querySelectorAll(`span[data=cash_balance_pending][data-wallet="${this.uuid}"]`)
        const tokenBalancePending = document.querySelectorAll(`span[data=token_balance_pending][data-wallet="${this.uuid}"]`)
        
        height.forEach((field)=>{
            (field as HTMLElement).innerText = message.data.height.toString()
        })

        timestamp.forEach((field)=>{
            (field as HTMLElement).innerText = convertTimestampToDate(Date.now())
        })

        cashBalance.forEach((field)=>{
            (field as HTMLElement).innerText = toNormalUnits(message.data.unlockedBalance).toString()
        })

        tokenBalance.forEach((field)=>{
            (field as HTMLElement).innerText = toNormalUnits(message.data.unlockedTokenBalance).toString()
        })

        cashBalancePending.forEach((field)=>{
            (field as HTMLElement).innerText = toNormalUnits(message.data.balance - message.data.unlockedBalance).toString()
        })

        tokenBalancePending.forEach((field)=>{
            (field as HTMLElement).innerText = toNormalUnits(message.data.tokenBalance - message.data.unlockedTokenBalance).toString()
        })

        this.balance = message.data.balance
        this.unlockedBalance = message.data.unlockedBalance
        this.tokenBalance = message.data.tokenBalance
        this.unlockedTokenBalance = message.data.unlockedBalance
        this.height = message.data.height
        this.accounts = message.data.accounts as WsSafexAccount[]
        this.interestInfo = message.data.interestInfo as WsInterestInfo[]

        this.interestInfo.forEach((stakingEntry)=>{

            const entryRemainingBlocks = document.querySelectorAll(`span[data-function="staking_show_remaining_blocks"][data-wallet="${this.uuid}"][data-amount="${toNormalUnits(parseInt(stakingEntry.tokenStaked))}"][data-block="${stakingEntry.blockHeight}"]`)
            entryRemainingBlocks.forEach((field)=>{
                (field as HTMLElement).innerHTML = (500000 - (this.height - parseInt(stakingEntry.blockHeight))).toString()
            })

            const entryRemainingBlocksUnstaking = document.querySelectorAll(`span[data-function=staking_show_remaining_blocks_unstaking][data-wallet="${this.uuid}"][data-amount="${toNormalUnits(parseInt(stakingEntry.tokenStaked))}"][data-block="${stakingEntry.blockHeight}"]`)
            entryRemainingBlocksUnstaking.forEach((field)=>{
                const remainingBlocks = staking.STAKING_MINIMUM_PERIOD - (this.height - parseInt(stakingEntry.blockHeight))
                if(remainingBlocks > 0){
                    (field as HTMLElement).innerText = remainingBlocks.toString() + ' blocks to enable unstaking'
                } else {
                    field.classList.add('d-none')
                }
                
            })

            const entryCollectedInterest = document.querySelectorAll(`span[data-function=staking_show_collected_interest][data-wallet="${this.uuid}"][data-amount="${toNormalUnits(parseInt(stakingEntry.tokenStaked))}"][data-block="${stakingEntry.blockHeight}"]`)
            entryCollectedInterest.forEach((field)=>{
                (field as HTMLElement).innerHTML = roundToTenDecimals(toNormalUnits(parseInt(stakingEntry.collectedInterest))).toString()
            })

            const entryUnstakeButton = document.querySelectorAll(`button[data-function=unstaking][data-wallet="${this.uuid}"][data-amount="${toNormalUnits(parseInt(stakingEntry.tokenStaked))}"][data-block="${stakingEntry.blockHeight}"]`)
            entryUnstakeButton.forEach((field)=>{
                const remainingBlocks = staking.STAKING_MINIMUM_PERIOD - (this.height - parseInt(stakingEntry.blockHeight))
                if(remainingBlocks <= 0){
                    field.classList.remove('d-none')
                }
            })

        })

    }


    private updateBcHeight(message: WorkerBcUpdatedMessage){
        this.height = message.data.bc_height
        const height = document.querySelectorAll(`span[data=height][data-wallet="${this.uuid}"]`)
        const timestamp = document.querySelectorAll(`span[data=timestamp][data-wallet="${this.uuid}"]`)
       
        height.forEach((field)=>{
            (field as HTMLElement).innerText = message.data.bc_height.toString()
        })

        timestamp.forEach((field)=>{
            (field as HTMLElement).innerText = convertTimestampToDate(Date.now())
        })
    }

    public getState(): WsConnectionState{
        return this.state;
    }

    public getTxProofResult(): any {
        const proofResult = this.txnProofResult
        this.txnProofResult = undefined
        return proofResult;
    }

    public getHeight(): number{
        return this.height;
    }

    public getBalance(): number{
        return this.balance;
    }

    public getUnlockedBalance(): number{
        return this.unlockedBalance;
    }

    public getTokenBalance(): number{
        return this.tokenBalance;
    }

    public getUnlockedTokenBalance(): number{
        return this.unlockedTokenBalance
    }

    public getAccounts(): WsSafexAccount[]{
        return this.accounts
    }

    public getInterestInfo(): WsInterestInfo[]{
        return this.interestInfo
    }

    public getAccountRecoverState(): WsAccountRecoverState {
        return this.accountRecoverState
    }

    public getPurchaseState(): WsPurchaseState {
        return this.purchaseState
    }

    public getHistoryLoadingState(): WsHistoryLoadingState {
        return this.historyLoadingState
    }

    public getPurchaseTxnData(): any {
        return this.purchaseTnxData
    }

    public getHistoryData(): any {
        return this.historyData
    }

    public getCheckTxnProofState(): WsCheckTxnProofState {
        return this.txnCheckProofState
    }

    public setAccountRecoverState(state: WsAccountRecoverState){
        this.accountRecoverState = state
    }

    public setHistoryLoadingState(state: WsHistoryLoadingState){
        this.historyLoadingState = state
    }

    public setPurchaseState(state: WsPurchaseState){
        this.purchaseState = state
    }

    public setCheckTxnProofState(state: WsCheckTxnProofState){
        this.txnCheckProofState = state
    }

    private setState(state: WsConnectionState): WsConnectionState {

        const syncButtons = document.querySelectorAll(`i[data-function=sync][data-wallet="${this.uuid}"]`)
        const stopButtons = document.querySelectorAll(`i[data-function=stop][data-wallet="${this.uuid}"]`)

        switch (state) {
            case WsConnectionState.INITIATED:   
                syncButtons.forEach((syncButton)=>{
                    syncButton.setAttribute("state", "initiated")
                })
            
                break;
            case WsConnectionState.CONNECTED:   
                syncButtons.forEach((syncButton)=>{
                    syncButton.setAttribute("state", "connected")
                })
            
                break;
            case WsConnectionState.WALLET_OPENED:   
                syncButtons.forEach((syncButton)=>{
                    syncButton.setAttribute("state", "open")
                })
                break;
            case WsConnectionState.CLOSABLE:   
                syncButtons.forEach((syncButton)=>{
                    syncButton.classList.add("d-none")
                })
                stopButtons.forEach((stopButton) => {
                    stopButton.setAttribute("state", "open")
                    stopButton.classList.remove("d-none")
                })
                break;
            case WsConnectionState.CLOSING:   
                stopButtons.forEach((stopButton) => {
                    stopButton.setAttribute("state", "closing")
                })
                break;
            case WsConnectionState.CLOSED:   
                stopButtons.forEach((stopButton) => {
                    stopButton.setAttribute("state", "closed")
                    stopButton.classList.add("d-none")
                })
                syncButtons.forEach((syncButton)=>{
                    syncButton.setAttribute("state", "closed")
                    syncButton.classList.remove("d-none")
                })
                break;
            default:
                break;
        }   

        return state
    }
    


}
