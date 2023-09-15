const safex = require('safex-nodejs-wallet-lib');
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs'
import * as util from 'util'

import { CONFIG } from '../../config'
import { ParentPort } from  '../Worker'
import { WsRequestMessage } from '../../websocket/WsRequestMessage'
import { WsRequestMessageData_CheckTxProof, WsRequestMessageData_CreateAccount, WsRequestMessageData_CreateOffer, WsRequestMessageData_CreateWalletFromKeys, WsRequestMessageData_EditAccount, WsRequestMessageData_EditOffer, WsRequestMessageData_GiveFeedback, WsRequestMessageData_OpenWallet, WsRequestMessageData_PurchaseOffer, WsRequestMessageData_RecoverAccount, WsRequestMessageData_RemoveAccount, WsRequestMessageData_SendCash, WsRequestMessageData_SendToken, WsRequestMessageData_StakeTokens, WsRequestMessageData_UnStakeTokens } from '../../websocket/WsRequestMessageData';
import { SafexAccount, Transaction, TransactionInfo } from 'safex-nodejs-wallet-lib'
import { DaemonRpc } from '../../../common/daemon/DaemonRpc';
import  * as walletDb from '../../../common/db/wallets';
import  * as accountDb from '../../../common/db/accounts';
import  * as historyDb from '../../../common/db/history';
import  * as errorLogDb from '../../../common/db/errorlogs';
import  * as userSettingsDb from '../../../common/db/userSettings';
// utils
import * as fileUtils from '../../../common/utils/file-utils'
import * as passwordGenerator from 'generate-password'

// enums, types, interfaces
import { WsRquestMessageType } from '../../enums/websocket'
import { WalletWorkerStatus, WsResponseType } from '../../enums/walletworker';
import { WorkerErrorMessage, WorkerReponseMessage, WorkerRefreshedMessage, WorkerCashSendMessage, WorkerTokenSendMessage, WorkerAccountCreated, WorkerAccountRemoved, WorkerAccountRecovered, WorkerOfferCreated, WorkerOfferEdited, WorkerOfferPurchased, WorkerFeedbackGiven, WorkerFeedbacks, WorkerData, WorkerAuthMessage, WorkerWalletCreatedMessage, WorkerWalletOpenedMessage, WorkerBcUpdatedMessage, WorkerTxnProofChecked, WorkerAccountEdited, WorkerTokensStaked, WorkerTokensUnStaked } from '../../interfaces/walletworker';
import { CreateAccountTransactionData, CreateOfferTransactionData, EditAccountTransactionData, EditOfferTransactionData, GiveFeedbackTransactionData, PurchaseOfferTransactionData, StakeTokenTransactionData, TransactionData, UnStakeTokenTransactionData } from '../../types/transactiondata';
import { toAtomicUnits, toNormalUnits } from '../../../common/utils/units';
import { IAccount, IWallet } from '../../../common/db/models/interfaces';
import { decodeJwt } from '../../../common/auth/authJwt';
import { SensibleTxnType } from '../../../common/enums/txns';
import { ErrorLogComponent, ErrorLogSeverity } from '../../../common/db/enums/errorlog';
import { connectDb, disconnectDb } from '../../../common/db/connection';

let daemon: DaemonRpc = new DaemonRpc(CONFIG.DaemonAddress, CONFIG.DaemonPort)

type ActiveWallet = {
    status: WalletWorkerStatus,
    path: string,
    uuid: string,
    password: string
    wallet: any,
    lastActivityTimeStamp: number
} 

type LastWalletError = {
    timestamp: number,
    error: any,
    message: string
} 

interface ExtendedTransactionInfo extends TransactionInfo{
    tokenAmount: string
}

var log_file = fs.createWriteStream(__dirname + '/walletworker.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

const parentPort = new ParentPort()
const workerData: WorkerData = JSON.parse(parentPort.getData())

let authenticatedUser = decodeJwt(workerData.token)
if(!authenticatedUser){
    let authMsg: WorkerAuthMessage = {type: WsResponseType.AUTH, data: { message: "Token expired / invalid"}}
    parentPort.postMessage(authMsg)
    parentPort.postMessage('terminate signal')
}

if(authenticatedUser && authenticatedUser.termsAccepted == false){
    let authMsg: WorkerAuthMessage = {type: WsResponseType.AUTH, data: { message: "User did accept terms & conditions"}}
    parentPort.postMessage(authMsg)
    parentPort.postMessage('terminate signal')
}

let activeWallet: ActiveWallet = {
    status: WalletWorkerStatus.NONE,
    path: "",
    uuid: "",
    password: "",
    wallet: undefined,
    lastActivityTimeStamp: Date.now()
}

function closeOnInactivity (){
    if ( (Date.now() - activeWallet.lastActivityTimeStamp) > CONFIG.WalletInactiveTimeout) {
        closeWallet()
    }
}


parentPort.on('message',  (receivedMessage: string )=> {

    const message: WsRequestMessage = JSON.parse(receivedMessage) as WsRequestMessage
    const messageType = WsRquestMessageType[message.type as keyof typeof WsRquestMessageType];
        
    switch ( messageType ) {
        case WsRquestMessageType.OPEN_WALLET:
            openWallet(message.data as WsRequestMessageData_OpenWallet)
            break;
        case WsRquestMessageType.CLOSE_WALLET:
            closeWallet()
            break;
        case WsRquestMessageType.RESCAN_BC:
            rescanBlockchain()
            break;
        case WsRquestMessageType.CREATE_WALLET:
            createWallet()
            break;
        case WsRquestMessageType.CREATE_WALLET_FROM_KEYS:
            createWalletFromKeys(message.data as WsRequestMessageData_CreateWalletFromKeys)
            break;
        case WsRquestMessageType.SEND_CASH:
            sendCash(message.data as WsRequestMessageData_SendCash)
            break;
        case WsRquestMessageType.SEND_TOKEN:
            sendToken(message.data as WsRequestMessageData_SendToken)
            break;
        case WsRquestMessageType.CREATE_ACCOUNT:
            createAccount(message.data as WsRequestMessageData_CreateAccount)
            break;
        case WsRquestMessageType.REMOVE_ACCOUNT:
            removeAccount(message.data as WsRequestMessageData_RemoveAccount)
            break;
        case WsRquestMessageType.EDIT_ACCOUNT:
            editAccount(message.data as WsRequestMessageData_EditAccount)
                break;
        case WsRquestMessageType.RECOVER_ACCOUNT:
            recoverAccount(message.data as WsRequestMessageData_RecoverAccount)
            break;
        case WsRquestMessageType.CREATE_OFFER:
            createOffer(message.data as WsRequestMessageData_CreateOffer)
            break;
        case WsRquestMessageType.EDIT_OFFER:
            editOffer(message.data as WsRequestMessageData_EditOffer)
            break;
        case WsRquestMessageType.PURCHASE_OFFER:
            purchaseOffer(message.data as WsRequestMessageData_PurchaseOffer)
            break;
        case WsRquestMessageType.GIVE_FEEDBACK:
            giveFeedBack(message.data as WsRequestMessageData_GiveFeedback)
            break;
        case WsRquestMessageType.GET_FEEDBACKS:
            getFeedBacks()
            break;
        case WsRquestMessageType.CHECK_TX_PROOF:
            checkTxProof(message.data as WsRequestMessageData_CheckTxProof)
            break;
        case WsRquestMessageType.HISTORY:
            getHistory()
            break;
        case WsRquestMessageType.STAKE_TOKENS:
            stakeTokens(message.data as WsRequestMessageData_StakeTokens)
            break;
        case WsRquestMessageType.UNSTAKE_TOKENS:
            unStakeTokens(message.data as WsRequestMessageData_UnStakeTokens)
            break;
        default: 
            break;
        }

})


async function createTransaction(txnData: TransactionData) {

    return new Promise<Transaction>((resolve, reject) => {
        try {
            activeWallet.wallet.createTransaction(txnData, (error: Error, tx : Transaction) => {
                if (error) {
                    handleWalletError(error.message, 'WWS01 - Error when creating transaction with data: ' + JSON.stringify(txnData))
                    reject(error);
                } else {
                    resolve(tx);
                }
            });
        } catch (err) {
            handleWalletError((err as Error).message, 'WWS01A - Error when trying creating transaction with data: ' + JSON.stringify(txnData))
            reject(err);
        }
    });
};

async function createAdvancedTransaction(txnData: CreateAccountTransactionData
    | EditAccountTransactionData
    | CreateOfferTransactionData
    | EditOfferTransactionData
    | PurchaseOfferTransactionData
    | GiveFeedbackTransactionData
    | StakeTokenTransactionData
    | UnStakeTokenTransactionData) {

    return new Promise<Transaction>((resolve, reject) => {
        try {
    
            activeWallet.wallet.createAdvancedTransaction(txnData, (error: Error, tx : Transaction) => {
                if (error) {
                   handleWalletError(error.message, 'WWS02 - Error when creating transaction with data: ' + JSON.stringify(txnData))
                    reject(error);
                } else {
                    resolve(tx);
                }
            });
        } catch (err) {
            handleWalletError((err as Error).message, 'WWS02A - Error when trying creating transaction with data: ' + JSON.stringify(txnData))
            reject(err);
        }
    });
};

async function commitTransaction(txn: any) {
    return new Promise<any>((resolve, reject) => {
        try {
            txn.commit( (error: Error, res: any) => {
                if (error) {
                    handleWalletError(error.message, 'WWS03 - Error when committing transaction to the blockchain: ' + JSON.stringify(txn))
                    reject(error);
                } else {
                    resolve(res);
                }
            });
        } catch (err) {
            handleWalletError((err as Error).message, 'WWS03A - Error when trying to commit ransaction with data: ' + JSON.stringify(txn))
            reject(err);
        }
    });
};

async function sendCash(data: WsRequestMessageData_SendCash) {

    try {
        let txnData: TransactionData = {
            address: data.address,
            amount: toAtomicUnits(data.amount).toString(),
            mixin: data.mixin,
            ...(data.paymentId != "0000000000000000" && {paymentId: data.paymentId})
        }

        let txn: Transaction = await createTransaction(txnData)
        let txn_ids: string[] = txn.transactionsIds()
        let txn_fee: string = txn.fee()
        await commitTransaction(txn)

        let msg: WorkerCashSendMessage = {
                type: WsResponseType.CASH_SEND, data: { 
                    address: data.address,
                    amount: data.amount,
                    mixin: data.mixin,
                    fee: txn_fee,
                    txn_id: txn_ids
            }
        }

        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS04 - Error when sending Cash')
    }
    
};

async function sendToken(data: WsRequestMessageData_SendToken) {

    try {

        let txnData: TransactionData = {
            address: data.address,
            amount: toAtomicUnits(data.amount).toString(),
            mixin: data.mixin,
            ...(data.paymentId != "0000000000000000" && {paymentId: data.paymentId}),
            tx_type: '1' 
        }
    
        let txn: Transaction = await createTransaction(txnData)
        let txn_ids: string[] = txn.transactionsIds()
        let txn_fee: string = txn.fee()
        await commitTransaction(txn)
    
        let msg: WorkerTokenSendMessage = {
                type: WsResponseType.TOKEN_SEND, data: { 
                    address: data.address,
                    amount: data.amount,
                    mixin: data.mixin,
                    fee: txn_fee,
                    txn_id: txn_ids
            }
        }

        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS05 - Error when sending Token')
    }   
};



async function stakeTokens(data: WsRequestMessageData_StakeTokens) {
    try {

        let txnData: StakeTokenTransactionData = {
            tx_type: '3',
            address: activeWallet.wallet.address(),
            amount:  toAtomicUnits(data.amount).toString(),
            mixin: data.mixin,
        }

        // commit staking to blockchain
        let txn: Transaction = await createAdvancedTransaction(txnData)
        let txn_ids: string[] = txn.transactionsIds()
        let txn_fee: string = txn.fee()
        await commitTransaction(txn)
    
        let msg: WorkerTokensStaked = {
                type: WsResponseType.TOKENS_STAKED, data: { 
                    amount: data.amount,
                    fee: txn_fee,
                    txn_id: txn_ids
            }
        }
    
        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS21 - Error when staking tokens, amount: ' + data.amount)
    }   
};



async function unStakeTokens(data: WsRequestMessageData_UnStakeTokens) {
    try {

        let txnData: UnStakeTokenTransactionData = {
            tx_type: '4',
            address: activeWallet.wallet.address(),
            amount: toAtomicUnits(data.amount).toString(),
            safex_staked_token_height: data.blockHeight.toString(),
            mixin: data.mixin,
        }
        
        // commit unstaking to blockchain
        let txn: Transaction = await createAdvancedTransaction(txnData)
        let txn_ids: string[] = txn.transactionsIds()
        let txn_fee: string = txn.fee()
        await commitTransaction(txn)
    
        let msg: WorkerTokensUnStaked = {
                type: WsResponseType.TOKENS_UNSTAKED, data: { 
                    amount: data.amount,
                    fee: txn_fee,
                    txn_id: txn_ids
            }
        }
    
        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS22 - Error when unstaking tokens, amount: ' + data.amount + ' on block: ' + data.blockHeight)
    }   
};

async function createAccount(data: WsRequestMessageData_CreateAccount) {

    // check again whether account already exists before creating transaction
    if((await daemon.getAccountInfo(data.account)).status === "OK"){
        handleWalletError("Account creation", 'WWS06 - Error when creating account, already exists: ' + data.account)
        return
    }

    try {

        let txnData: CreateAccountTransactionData = {
            tx_type: '6',
            safex_username: data.account,
            mixin: data.mixin,
        }
   
        // create local account in the wallet
         activeWallet.wallet.createSafexAccount(data.account, data.description)

        // commit account to blockchain
        let txn: Transaction = await createAdvancedTransaction(txnData)
        let txn_ids: string[] = txn.transactionsIds()
        let txn_fee: string = txn.fee()
        await commitTransaction(txn)
    
        let msg: WorkerAccountCreated = {
                type: WsResponseType.ACCOUNT_CREATED, data: { 
                    account: data.account,
                    fee: txn_fee,
                    txn_id: txn_ids
            }
        }
    
        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)

        const account: IAccount = {
            uuid: uuidv4(),
            user: authenticatedUser?.uuid || '0',
            account: data.account,
            status: 0,
            wallet: activeWallet.uuid,
            creationHeight: (await daemon.getHeight())?.height || 0,
            secretKey: activeWallet.wallet.getSafexAccount(data.account).privateKey,
            lastError: 'none',
            deleted: false
        }
        await accountDb.addAccount(account, CONFIG.HashedMasterPassword)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS06A - Error when creating account: ' + data.account)
    }   
};


async function removeAccount(data: WsRequestMessageData_RemoveAccount) {
    try {
        
        const account = await accountDb.findAccountByAccount(activeWallet.uuid, data.account, false)
        await accountDb.updateAccountDeleted(account.uuid, true)

        activeWallet.wallet.removeSafexAccount(data.account)
        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()

    
        let msg: WorkerAccountRemoved = {type: WsResponseType.ACCOUNT_REMOVED, data: { account: data.account }}
        parentPort.postMessage(msg);
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS06 - Error when removing account: ' + data.account)
    }   
};

async function recoverAccount(data: WsRequestMessageData_RecoverAccount) {
    try {
        activeWallet.wallet.recoverSafexAccount(data.account, data.secretKey)
        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        let msg: WorkerAccountRecovered = {type: WsResponseType.ACCOUNT_RECOVERED, data: { account: data.account }}
        parentPort.postMessage(msg);

         const account: IAccount = {
            uuid: uuidv4(),
            user: authenticatedUser?.uuid || '0',
            wallet: activeWallet.uuid,
            account: data.account,
            status: 2,
            creationHeight: (await daemon.getHeight())?.height || 0,
            secretKey: activeWallet.wallet.getSafexAccount(data.account).privateKey,
            lastError: 'none',
            deleted: false
        }
        await accountDb.addAccount(account, CONFIG.HashedMasterPassword)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS07 - Error when recovering account: ' + data.account)
    }   
};


async function editAccount(data: WsRequestMessageData_EditAccount) {


    try {

        let txnData: EditAccountTransactionData = {
            tx_type: '7',
            safex_username: data.account,
            safex_data: data.description,
            mixin: data.mixin,
        }
        // commit account to blockchain
        let txn: Transaction = await createAdvancedTransaction(txnData)
        let txn_ids: string[] = txn.transactionsIds()
        let txn_fee: string = txn.fee()
        await commitTransaction(txn)
    
        let msg: WorkerAccountEdited = {
                type: WsResponseType.ACCOUNT_EDITED, data: { 
                    account: data.account,
                    fee: txn_fee,
                    txn_id: txn_ids
            }
        }
    
        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS06B - Error when editing account: ' + data.account)
    }   
};



async function createOffer(data: WsRequestMessageData_CreateOffer) {

    try {
      
        let txnData: CreateOfferTransactionData = {
            tx_type: '8',
            safex_username: data.account,
            safex_offer_title: data.title,
            safex_offer_price: toAtomicUnits(data.price).toString(),
            safex_offer_quantity: data.quantity.toString(),
            safex_offer_description: data.description,
            safex_offer_price_peg_used: data.pricePegUsed,
            safex_offer_price_peg_id: data.pricePegId,
            safex_offer_min_sfx_price: toAtomicUnits(data.minSfxPrice).toString(),
            safex_offer_active: data.offerActive,
            mixin: data.mixin,
        }
   
        let txn: Transaction = await createAdvancedTransaction(txnData)
        let txn_ids: string[] = txn.transactionsIds()
        let txn_fee: string = txn.fee()
        await commitTransaction(txn)
    
        let msg: WorkerOfferCreated = {
                type: WsResponseType.OFFER_CREATED, data: { 
                    offer_title: data.title,
                    fee: txn_fee,
                    txn_id: txn_ids
            }
        }
    
        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS08 - Error when creating offer: ' + data.title)
    }   
};


async function editOffer(data: WsRequestMessageData_EditOffer) {

    try {
      
        let txnData: EditOfferTransactionData = {
            tx_type: '9',
            safex_username: data.account,
            safex_offer_id: data.offerId,
            safex_offer_title: data.title,
            safex_offer_price: toAtomicUnits(data.price).toString(),
            safex_offer_quantity: data.quantity.toString(),
            safex_offer_description: data.description,
            safex_offer_price_peg_used: data.pricePegUsed,
            safex_offer_price_peg_id: data.pricePegId,
            safex_offer_min_sfx_price: toAtomicUnits(data.minSfxPrice).toString(),
            safex_offer_active: data.offerActive,
            mixin: data.mixin,
        }
   
        let txn: Transaction = await createAdvancedTransaction(txnData)
        let txn_ids: string[] = txn.transactionsIds()
        let txn_fee: string = txn.fee()
        await commitTransaction(txn)
    
        let msg: WorkerOfferEdited = {
                type: WsResponseType.OFFER_EDITED, data: { 
                    offer_id: data.offerId,
                    offer_title: data.title,
                    fee: txn_fee,
                    txn_id: txn_ids
            }
        }
    
        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS09 - Error when editing offer: ' + data.title)
    }   
};


async function purchaseOffer(data: WsRequestMessageData_PurchaseOffer) {

    try {
      
        let txnData: PurchaseOfferTransactionData = {
            tx_type: '5',
            amount: '1',
            address: activeWallet.wallet.address(),
            safex_offer_id: data.offerId,
            safex_purchase_quantity: data.quantity,
            mixin: data.mixin,
        }
   
        let txn: Transaction = await createAdvancedTransaction(txnData)
        let txn_id: string = txn.transactionsIds()[0]
        let txn_fee: string = txn.fee()
        

        await commitTransaction(txn)

        const txProof = await activeWallet.wallet.getTxProof({txId: txn_id, address: data.sellerAddress, message: data.txnProofMessage})
        
        let msg: WorkerOfferPurchased = {
                type: WsResponseType.OFFER_PURCHASED, data: { 
                    offer_id: data.offerId,
                    quantity: data.quantity,
                    fee: txn_fee,
                    txn_id: txn_id,
                    txn_proof: txProof
            }
        }
    
        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS10 - Error when purchasing offer: ' + data.offerId)
    }   
};


async function giveFeedBack(data: WsRequestMessageData_GiveFeedback) {

    try {
      
        let txnData: GiveFeedbackTransactionData = {
            tx_type: '10',
            amount: '1',
            address: activeWallet.wallet.address(),
            safex_offer_id: data.offerId,
            safex_feedback_stars_given: data.stars,
            safex_feedback_comment: JSON.stringify(data.comment),
            mixin: data.mixin,
        }
   
        let txn: Transaction = await createAdvancedTransaction(txnData)
        let txn_ids: string[] = txn.transactionsIds()
        let txn_fee: string = txn.fee()
        await commitTransaction(txn)
    
        let msg: WorkerFeedbackGiven = {
                type: WsResponseType.FEEDBACK_GIVEN, data: { 
                    offer_id: data.offerId,
                    stars: data.stars,
                    comment: JSON.stringify(data.comment),
                    fee: txn_fee,
                    txn_id: txn_ids
            }
        }
    
        activeWallet.wallet.startRefresh()
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS11 - Error when giving feedback: ' + data.offerId)
    }   
};


async function getFeedBacks() {

    try {
    
        let msg: WorkerFeedbacks = {
                type: WsResponseType.FEEDBACKS, data: { 
                    feedbacks: activeWallet.wallet.getMyFeedbacks()
            }
        }
    
        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS12 - Error when getting feedbacks')
    }   
};


async function checkTxProof(data: WsRequestMessageData_CheckTxProof) {
    try {
      
        const txProofCheck = await activeWallet.wallet.checkTxProof({
            txId: data.txnId,
            address: activeWallet.wallet.address(),
            signature: data.signature,
            message: data.txnProofMessage
        })
    
        let msg: WorkerTxnProofChecked = {
                type: WsResponseType.TX_PROOF_CHECKED, data: { 
                    result: JSON.stringify(txProofCheck)
            }
        }

        activeWallet.lastActivityTimeStamp = Date.now()
        parentPort.postMessage(msg)
        
    } catch (error) {
        handleWalletError((error as Error).message, 'WWS20 - Error when checking tx proof: ' + data.txnId)
    }   
};

async function handleWalletError(err: any, msg: string) { 
    let errorMsg: WorkerErrorMessage = {type: WsResponseType.ERROR, data: { error: JSON.stringify(err), message: msg}}
    parentPort.postMessage(errorMsg)

    const lastWalletError: LastWalletError = {
        timestamp: Date.now(),
        error: JSON.stringify(err),
        message: msg
    }

    let errMessage =  `${err} (${msg})`

    if(err instanceof Error){
       errMessage = `${err.message} (${msg})`
    }

    if(authenticatedUser){
        errorLogDb.addErrorLogEntry({
            component: ErrorLogComponent.WALLET,
            severity: ErrorLogSeverity.ERROR,
            user: authenticatedUser.uuid,
            uuid: uuidv4(),
            timestamp: Date.now(),
            message: `Wallet with address ${activeWallet.wallet.address()} returned an error: ${ errMessage}`
        })
    }
   
    await walletDb.updateWalletError(activeWallet.uuid, JSON.stringify(lastWalletError))
}

async function storeWallet() {
    return new Promise((resolve, reject) => {
        try {
            activeWallet.wallet.store((err:any, res:any) => {
                if (err) {
                    handleWalletError(err,  'WWS13 - Error when storing wallet')
                    reject(err);
                } else {
                    resolve(res);
                }

            });
        } catch (err) {
            reject(err);
        }
    });
};


async function openWallet(data: WsRequestMessageData_OpenWallet) {

    if(authenticatedUser && authenticatedUser.wallets.find(wallet => wallet.uuid === data.uuid)){

        if(activeWallet.status === WalletWorkerStatus.NONE){

            activeWallet.path = path.join(CONFIG.FileStoreDir, data.uuid , "wallet")
            activeWallet.uuid = data.uuid
    
            const existingWallet =  await walletDb.findWalletFullDataByUUID(data.uuid, CONFIG.HashedMasterPassword)
            activeWallet.password = existingWallet.password
    
            var args = {
                'path': activeWallet.path,
                'password': activeWallet.password,
                'network': CONFIG.Network,
                'daemonAddress': daemon.getUrl()
            }
        
            try {
                if (!safex.walletExists(activeWallet.path)) {                  
                   
                    activeWallet.path = path.join(CONFIG.FileStoreDir, activeWallet.uuid, "wallet")
                    fileUtils.createDirectory(`${CONFIG.FileStoreDir}/${activeWallet.uuid}`)
            
                    var argsRecreate = {
                        'path': activeWallet.path,
                        'password': activeWallet.password,
                        'network': CONFIG.Network,
                        'daemonAddress': daemon.getUrl(),
                        'restoreHeight': 0,
                        'addressString': existingWallet.address,
                        'viewKeyString': existingWallet.viewKey,
                        'spendKeyString': existingWallet.spendKey
                    }
                    
                    try {
                        activeWallet.status = WalletWorkerStatus.OPEN
                        safex.createWalletFromKeys(argsRecreate, handleOpenWallet)
                    } catch (error) {
                        handleWalletError(error, 'WWS16 - Error when re-creating wallet existing wallet:' + data.uuid)
                    }

                } else {
                    activeWallet.status = WalletWorkerStatus.OPEN
                    safex.openWallet(args, handleOpenWallet);
                }
        
            } catch (error: any) {
                handleWalletError(error, 'WWS14A - Error when opening wallet')
            }
    
        } else {
            handleWalletError("Wallet error", 'WWS14B - Already created/opened a wallet')
        }
    } else {
        let authMsg: WorkerAuthMessage = {type: WsResponseType.AUTH, data: { message: "Unauthorized to open the provided wallet"}}
        parentPort.postMessage(authMsg)
        setTimeout(()=>{
            parentPort.postMessage('terminate signal')
        }, 1000)

    }   
}

async function closeWallet(){

    if(activeWallet.wallet && activeWallet.status !== WalletWorkerStatus.CLOSING){
        try {
            activeWallet.status = WalletWorkerStatus.CLOSING
            await storeWallet()
            disconnectDb()
            let msg: WorkerReponseMessage = {type: WsResponseType.WALLET_CLOSED, data: { uuid: activeWallet.uuid }}
            parentPort.postMessage(msg);
            parentPort.postMessage('terminate signal')
    
        } catch (error) {
            handleWalletError(error, 'WWS15 - Error when closing wallet ' + activeWallet.uuid)
        }
    }
    
}

async function createWallet(){

    if(activeWallet.status === WalletWorkerStatus.NONE){

        activeWallet.uuid = uuidv4();
        activeWallet.path = path.join(CONFIG.FileStoreDir, activeWallet.uuid, "wallet")
        activeWallet.password = passwordGenerator.generate({length: 20, numbers: true, excludeSimilarCharacters: true, strict: true})
        fileUtils.createDirectory(`${CONFIG.FileStoreDir}/${activeWallet.uuid}`)

        var args = {
            'path': activeWallet.path,
            'password': activeWallet.password,
            'network': CONFIG.Network,
            'daemonAddress': daemon.getUrl()   
        }
        
        try {
            activeWallet.status = WalletWorkerStatus.NEW
            safex.createWallet(args, handleOpenWallet)
        } catch (error) {
            handleWalletError(error, 'WWS16 - Error when creating wallet')
        }

    } else {
        handleWalletError("Wallet error", 'WWS16A - Already created/opened a wallet')
    }
    
}


async function createWalletFromKeys(data: WsRequestMessageData_CreateWalletFromKeys) {

    if(activeWallet.status === WalletWorkerStatus.NONE) {

        activeWallet.uuid = uuidv4();
        activeWallet.path = path.join(CONFIG.FileStoreDir, activeWallet.uuid, "wallet")
        activeWallet.password = passwordGenerator.generate({length: 20, numbers: true, excludeSimilarCharacters: true, strict: true})
        fileUtils.createDirectory(`${CONFIG.FileStoreDir}/${activeWallet.uuid}`)

        var args = {
            'path': activeWallet.path,
            'password': activeWallet.password,
            'network': CONFIG.Network,
            'daemonAddress': daemon.getUrl(),
            'restoreHeight': 0,
            'addressString': data.address,
            'viewKeyString': data.viewKey,
            'spendKeyString': data.spendKey
        }
        
        try {
            activeWallet.status = WalletWorkerStatus.NEW
            safex.createWalletFromKeys(args, handleOpenWallet)  
        } catch (error: any) {
            handleWalletError(error, 'WWS17 - Error when creating wallet')
        }

    } else {
        handleWalletError("Wallet error", 'WWS17A - Already created/opened a wallet')
    }
    
}

async function rescanBlockchain(){
    try {
        activeWallet.wallet.rescanBlockchainAsync()
        const timer = setInterval(() => {
            if (activeWallet.wallet.blockchainHeight() === activeWallet.wallet.daemonBlockchainHeight()) {
                clearInterval(timer);
            } else {
                let msg: WorkerReponseMessage = {type: WsResponseType.WALLET_BC_UPDATED, data: { bc_height: activeWallet.wallet.blockchainHeight()}}
                parentPort.postMessage(msg);
                activeWallet.lastActivityTimeStamp = Date.now()
            }
        }, 3000);
     }
     catch (error) {
        handleWalletError(error, 'WWS18 - Error when rescanning blockchain')
    }
}

async function getHistory(){
    try {

        await historyDb.deleteHistoryByWallet(activeWallet.uuid)
        
        const history: ExtendedTransactionInfo[] =  activeWallet.wallet.history()

        await parseHistoricalTxn(history)

        let msg: WorkerReponseMessage = {type: WsResponseType.HISTORY, data: {result: "OK"}}
        parentPort.postMessage(msg);
        activeWallet.lastActivityTimeStamp = Date.now()
     }
     catch (error) {
        handleWalletError(error, 'WWS19 - Error when getting transaction history')
    }
}

async function parseHistoricalTxn(txnInfo: ExtendedTransactionInfo[]): Promise<boolean>{

    for(const txn of txnInfo){

        let txnType: SensibleTxnType

        switch (txn.transactionType) {
            case 0: {
                txnType = SensibleTxnType.SFX
                break;
            }
            case 1: {
                txnType = SensibleTxnType.SFT
                break;
            }
            case 2: {
                txnType = SensibleTxnType.MIGRATION
                break;
            }
            case 3: {
                txnType = SensibleTxnType.STAKE
                break;
            }
            case 4: {
                txnType = SensibleTxnType.UNSTAKE
                break;
            }
            case 5: {
                if (txn.direction == 'in') {
                    txnType = SensibleTxnType.ORDER
                } else {
                    txnType = SensibleTxnType.PURCHASE
                }
                break;
            }
            case 6: {
                txnType = SensibleTxnType.NEW_ACCOUNT
                break;
            }
            case 7: {
                txnType = SensibleTxnType.EDIT_ACCOUNT
                break;
            }
            case 8: {
                txnType = SensibleTxnType.NEW_OFFER
                break;
            }
            case 9: {
                txnType = SensibleTxnType.EDIT_OFFER
                break;
            }
            case 10: {
                txnType = SensibleTxnType.FEEDBACK
                break;
            }
            case 11: {
                txnType = SensibleTxnType.PRICE_PEG
                break;
            }
            case 12: {
                txnType = SensibleTxnType.PRICE_PEG_UDPATE
                break;
            }
            default: {
                txnType = SensibleTxnType.UNKNOWN
                break;
            }
        }

        let cashAmount: number = 0
        let tokenAmount: number = 0
        let fee: number = parseInt(txn.fee)

        if(txnType == SensibleTxnType.PURCHASE){
            if(txn.transfers.length > 0){
                cashAmount = parseInt(txn.transfers[2].amount) + parseInt(txn.transfers[1].amount)
            } else {
                cashAmount = parseInt(txn.amount) / 0.95
            }

        } else if(txnType == SensibleTxnType.SFT || txnType == SensibleTxnType.UNSTAKE){

            try{

                const txnFromDaemon = await daemon.getTransaction(txn.id)
                const txnAsJson = JSON.parse(txnFromDaemon.txs[0].as_json)
    
                let vin: any = {}
                vin.token_amount = 0
                vin.amount = 0
                vin.script = false
                
                for (const the_ins of txnAsJson.vin) {
                    if (the_ins.script) {
                        vin = the_ins.script;
                        vin.script = true;
                    }
                }

                if (vin.script == true) {
                    let txnFee = toNormalUnits(parseInt(txn.fee));
                    if (txnFee > 100) {
                        fee = 0;
                    }
                    
                    txnType = SensibleTxnType.UNSTAKE

                    tokenAmount = vin.token_amount
                    cashAmount = vin.amount

                } else {

                    if(parseInt(txn.tokenAmount) > 0 ){
                        tokenAmount = parseInt(txn.tokenAmount)
                    } else {
                        cashAmount = parseInt(txn.amount)
                    }
                    
                }


            } catch (error){
                tokenAmount = parseInt(txn.transfers[0].token_amount)
            }
            


        } else if(txnType == SensibleTxnType.STAKE){

            try{
                const txnFromDaemon = await daemon.getTransaction(txn.id)
                const txnAsJson = JSON.parse(txnFromDaemon.txs[0].as_json)
                
                for (const theOuts of txnAsJson.vout) {
                    if (theOuts.target.script) {
                        tokenAmount = theOuts.token_amount;
                    }
                }

            } catch (error) {
                // do nothing
            }
            

        } else {

            if(parseInt(txn.tokenAmount) > 0) {
                tokenAmount = parseInt(txn.tokenAmount)
            } else {
                cashAmount = parseInt(txn.amount)
            }
        }

        if(txn.pending){
            txnType = SensibleTxnType.UNKNOWN
        }

        await historyDb.addTxn({
            wallet: activeWallet.uuid,
            timestamp: txn.timestamp * 1000,
            txnId: txn.id,
            paymentId: txn.paymentId.toString(),
            direction: txn.direction,
            pending: txn.pending,
            type: txnType,
            cashAmount: cashAmount,
            tokenAmount: tokenAmount,
            fee: fee,
            blockHeight: txn.blockHeight,
            confirmations: txn.confirmations
        })

    }

    return true

}

async function handleOpenWallet(err:any, openWallet: any) {

    if (err) {
        console.log(JSON.stringify(err as Error))
        handleWalletError(err, "WWS00 - Wallet returned and arror")
        setTimeout(()=>{
            disconnectDb()
            parentPort.postMessage('terminate signal')
        }, 2000)
        return
    } 

    activeWallet.wallet = openWallet 

    if(activeWallet.status == WalletWorkerStatus.NEW){
        
        const wallet: IWallet = {
            uuid: activeWallet.uuid,
            user: authenticatedUser?.uuid || '0',
            password: activeWallet.password,
            creationHeight:  (await daemon.getHeight())?.height || 0,
            label: 'none',
            address: activeWallet.wallet.address(),
            spendKey: activeWallet.wallet.secretSpendKey(),
            viewKey: activeWallet.wallet.secretViewKey(),
            height: 0,
            cashBalance: 0,
            unlockedCashBalance: 0,
            tokenBalance: 0,
            unlockedTokenBalance: 0,
            lastError: 'none',
            timestamp: Date.now(),
            deleted: false
        }

        await walletDb.addWallet(wallet, CONFIG.HashedMasterPassword)      

        let msg: WorkerWalletCreatedMessage = {type: WsResponseType.WALLET_CREATED, data: { uuid: activeWallet.uuid}};
        parentPort.postMessage(msg);
        activeWallet.status = WalletWorkerStatus.OPEN

    }


    if(activeWallet.status == WalletWorkerStatus.OPEN){
        let msg: WorkerWalletOpenedMessage = {type: WsResponseType.WALLET_OPENED, data: { uuid: activeWallet.uuid, address: activeWallet.wallet.address() }}
        parentPort.postMessage(msg);
    }


    var lastHeight = 0;
    activeWallet.wallet.on('newBlock', function (height: number) {
        if (height - lastHeight > 9999) {
            let msg: WorkerBcUpdatedMessage = {type: WsResponseType.WALLET_BC_UPDATED, data: { bc_height: height}}
            parentPort.postMessage(msg);
            lastHeight = height;
        }
    });

    activeWallet.wallet.on('refreshed', async function () {

        //update database
        await walletDb.updateWalletInfo(
                activeWallet.uuid,
                parseInt(activeWallet.wallet.blockchainHeight()),
                parseInt(activeWallet.wallet.balance()),
                parseInt(activeWallet.wallet.unlockedBalance()),
                parseInt(activeWallet.wallet.tokenBalance()),
                parseInt(activeWallet.wallet.unlockedTokenBalance()),
                Date.now()
            )

        let safexAccounts: object[] = []
        
        activeWallet.wallet.getSafexAccounts().forEach( async (account: SafexAccount) => {
            safexAccounts.push({
                account: account.username,
                status: account.status
            })
            const acc = await accountDb.findAccountByAccount(activeWallet.uuid, account.username, false)
            await accountDb.updateAccountStatus(acc.uuid, account.status)
        })

        let refreshMsg: WorkerRefreshedMessage = {
            type: WsResponseType.WALLET_REFRESHED, 
            data: { 
                    height: parseInt(activeWallet.wallet.blockchainHeight()), 
                    balance: parseInt(activeWallet.wallet.balance()),
                    unlockedBalance: parseInt(activeWallet.wallet.unlockedBalance()),
                    tokenBalance: parseInt(activeWallet.wallet.tokenBalance()),
                    unlockedTokenBalance: parseInt(activeWallet.wallet.unlockedTokenBalance()),
                    accounts: safexAccounts,
                    interestInfo: activeWallet.wallet.getMyStake()
                }
            }

        parentPort.postMessage(JSON.stringify(refreshMsg))
        await storeWallet()
        closeOnInactivity()

        authenticatedUser = decodeJwt(workerData.token)
        if(!authenticatedUser){
            let authMsg: WorkerAuthMessage = {type: WsResponseType.AUTH, data: { message: "Token expired / invalid"}}
            parentPort.postMessage(authMsg)
            closeWallet()
        }
       
    })
               
}

async function init() {
    try {
        connectDb(path.join(CONFIG.DbPath, CONFIG.DbName))
        let connectionMsg: WorkerReponseMessage = {type: WsResponseType.CONNECTED, data: { status: "ready"}}
        parentPort.postMessage(connectionMsg)
        
        if(authenticatedUser){
            const userSettings = await userSettingsDb.findSettingsByUserUUID(authenticatedUser.uuid, CONFIG.HashedMasterPassword)
            daemon.setAddress(userSettings.daemonAddress)
        }
    
    } catch (error) {
        let errorMsg: WorkerErrorMessage = {type: WsResponseType.ERROR, data: { error: "DATABASE ERROR", message: "WWS19 -Could not connect to database"}}
        parentPort.postMessage(errorMsg)
        parentPort.postMessage('terminate signal')
    }
    
}

init()
