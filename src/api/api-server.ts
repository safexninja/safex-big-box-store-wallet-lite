import express, { Request, Response } from 'express';
import * as http from 'http';
import cookieParser from 'cookie-parser'
import { v4 as uuidv4 } from 'uuid';
import path from "path";

import { CONFIG} from './config'
const safex = require('safex-nodejs-wallet-lib');

import  * as walletDb from '../common/db/wallets';
import  * as accountDb from '../common/db/accounts';
import  * as userDb from '../common/db/users';
import  * as userSettingsDb from '../common/db/userSettings';
import  * as connectedApiDb from '../common/db/connectedApis';
import  * as sellerRegistrationDb from '../common/db/sellerRegistration';
import  * as sellerRegistrationOffersDb from '../common/db/sellerRegistrationOffers';
import  * as purchaseDb from '../common/db/purchases';
import  * as orderDb from '../common/db/orders';
import  * as messageDb from '../common/db/messages';
import  * as historyDb from '../common/db/history';
import  * as errorLogDb from '../common/db/errorlogs';
import { connectDb, disconnectDb } from '../common/db/connection';
import { AuthLogin, OrderClose, OrderCloseCommunication, OrderGetMessages, OrderReply, OrderShipped, OrderValidation, PurchaseAdd, PurchaseClose, PurchaseCloseCommunication, PurchaseConfirmDelivery, PurchaseGetMessages, PurchaseRate, PurchaseReply, SetStore, StoreOfferAdd, StoreOfferRemove, StoreOfferReport, StoreOffersDetails, StoreSellerCheck, StoreSellerRegister, StoreSellerRevoke, UserCreate, UserSettings, UserUpdateInfo, UserUpdatePassword, WalletHistory, WalletUpdateDeleted, WalletUpdateInfo } from './requests/ApiRequestData';
import * as crypto from '../common/crypto/crypto'

// types, interfaces
import { ApiRequestValidation } from './interfaces/apiRequests';
import { ApiRequestValidationStatus } from './enums/apiRequests';

// helpers, utils, enums
import { log, LogLevel} from '../common/utils/logger';
import { validateMessage } from './helpers/validateMessage';
import { UserStatus } from '../common/db/enums/users';
import { authenticatedUser, authenticateJwt, decodeJwt, generateJwt, getTokenFromAuthHeader } from '../common/auth/authJwt';

import { storeFrontAddOffer, storeFrontGetApiStatus, storeFrontGetConfig, storeFrontGetOffers, storeFrontGetOffersDetails, storeFrontGetPricePegs, storeFrontGetSellerRegistrationStatus, storeFrontRevokeSellerRegistration, storeFrontSubmitSellerRegistration, storeFrontRemoveOffer, storeFrontGeSellerPubkey, storeFrontPostMessage, storeFrontFetchMessages, StoreFrontMessageFetched, StoreFrontMessageDeleteEntry, storeFrontDeleteMessages, storeFrontReportOffer } from '../common/helpers/stores';
import { DaemonRpc } from '../common/daemon/DaemonRpc';
import { filterAndOrderOffers, SearchType, SortOrder } from './helpers/offers';
import { DaemonAccountInfo, DaemonOffer, DaemonOffers, DaemonPricePeg, DaemonPricePegs } from '../common/daemon/types/daemon';
import { ISellerRegistration } from '../common/db/models/interfaces';
import { CommunicationStatus } from '../common/enums/communication';
import { TxnStatus } from '../common/enums/txns';
import { MessageDirection, MessageStatus, MessageType } from '../common/enums/messages';
import { Message_CloseCommunication, Message_ConfirmDelivery, Message_ConfirmShipment, Message_Contents, Message_Envelope, Message_OpenCommunication, Message_Reply } from '../common/interfaces/messageFormats';
import { PurchaseStatus } from '../common/enums/purchases';
import { OrderStatus } from '../common/enums/orders';
import { toNormalUnits } from '../common/utils/units';
import { convertTimestampToDate } from '../common/utils/dates';
import { ErrorLogComponent, ErrorLogSeverity } from '../common/db/enums/errorlog';
import { comparePassword, hashPassword } from '../common/auth/passwords';
import { generateLongId } from './utils/messaging';
import { processMessage } from '../common/interfaces/processMessage';


const { DM } = require("data-manipulator");
const dataManipulator = new DM({
    enableDeepCopy: false
});

// declare servers
const app: express.Application = express()
app.use(express.json());
app.use(cookieParser())

const server = http.createServer(app);

let daemon: DaemonRpc = new DaemonRpc(CONFIG.DaemonAddress, CONFIG.DaemonPort)

type storeFrontFetchMessageEntry = {
    url: string,
    messageAddress: string,
    privateKey: string,
}

app.post('/api/user/create', async (req:  Request, res: Response) => {
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new UserCreate())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 

    const requestData = req.body as UserCreate

    const uuid = uuidv4()

    const userExistsWithUUID = await userDb.findUserByUUID(uuid)
    if(userExistsWithUUID) {
        res.status(500).send({error: 'Error when assigning ID, please try again'})
        return
    }

    const userExistsWithName = await userDb.findUserByName(requestData.name.trim())
    if(userExistsWithName) {
        res.status(400).send({error: 'User name already in use'})
        return
    }

    if(!userExistsWithName){
        try {
            await userDb.addUser({
                uuid: uuid,
                name: requestData.name.trim(),
                password: await hashPassword(requestData.password.trim()),
                status: UserStatus.NEW,
                termsAccepted: false,
                logsLastSeen: Date.now(),
                passwordHashed: true
            })

            await userSettingsDb.addSettings({
                uuid: uuidv4(),
                user: uuid,
                defaultCountry: 'US',
                defaultAddress: 'none',
                daemonAddress: CONFIG.Network == 'mainnet' ? 'http://rpc.safex.org' : 'http://stagenet.safex.ninja',
                explorerAddress: 'https://explore.safex.org'
            }, CONFIG.HashedMasterPassword)

            res.status(201).send({name: requestData.name, uuid: uuid} );
        } catch (error) {
            log(LogLevel.ERROR, "Error when add using to database: " + error)
            res.sendStatus(500)
        }
    }
})

app.post('/api/auth/login', async (req: Request, res: Response) => {

        try {
            let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new AuthLogin())
            if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
                res.status(400).send({error: apiRequestValidation.message})
                return
            } 

            const requestData = req.body as AuthLogin
            const user = await userDb.findUserWithPasswordByName(req.body.name)

            if(user && user !== null){
            
                if(await comparePassword(requestData.password, user.password) == true ){
                    
                    if(process.send){
                        let processMsg: processMessage = {
                            type: "set password",
                            message: requestData.password
                        } 
                        process.send(processMsg);
                        CONFIG.HashedMasterPassword = crypto.createHash(requestData.password)
                    }                    
                    
                    const tokenData: authenticatedUser = {
                        uuid: user.uuid,
                        name: user.name,
                        termsAccepted: user.termsAccepted,
                        accounts: await accountDb.findAccountsIdByUserUUID(user.uuid),
                        wallets: await walletDb.findWalletsIdByUserUUID(user.uuid)
                    }

                    const userSettings = await userSettingsDb.findSettingsByUserUUID(tokenData.uuid, CONFIG.HashedMasterPassword)

                    daemon.setAddress(userSettings.daemonAddress)
                    log(LogLevel.MESSAGE, "Setting daemon URL to: " + userSettings.daemonAddress)

                    const jwtToken = generateJwt(tokenData)

                    res.cookie("access_token", jwtToken, {
                        httpOnly: false,
                        secure: false,
                      })
                    .status(200).send(
                            JSON.stringify({
                                accesToken: jwtToken
                            })
                        )

                } else {
                    res.sendStatus(401)
                }

            } else {
                res.sendStatus(401)
            }
    
        } catch (error) {
            log(LogLevel.WARN, "Request failed: " + error)
            res.sendStatus(500)
        }   

})

app.get("/api/auth/logout",  (req: Request, res: Response) => {
    return res
      .clearCookie("access_token")
      .status(200)
      .json({ message: "Logged out" });
  });


app.get('/api/auth/refresh', authenticateJwt, async (req: Request, res: Response) => {
        const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
        try{
            if(authenticatedUser){
                const user = await userDb.findUserByName(authenticatedUser.name)
                const tokenData: authenticatedUser = {
                    uuid: user.uuid,
                    name: user.name,
                    termsAccepted: user.termsAccepted,
                    accounts: await accountDb.findAccountsIdByUserUUID(user.uuid),
                    wallets: await walletDb.findWalletsIdByUserUUID(user.uuid)
                }

                const jwtToken = generateJwt(tokenData)

                res
                .cookie("access_token", jwtToken, {
                    httpOnly: false,
                    secure: false,
                  })
                .status(200).send(
                        JSON.stringify({
                            accesToken: jwtToken
                        })
                    )
            }

        } catch (error){
            log(LogLevel.ERROR, error)
            res.sendStatus(500)
        }

})


app.post('/api/user/update', authenticateJwt, async (req:  Request, res: Response) => {

    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new UserUpdateInfo())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    }
        
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as UserUpdateInfo
    try{
        if(authenticatedUser){
            await userDb.updateUserInfo(authenticatedUser.uuid, requestData.description)
        }
        res.sendStatus(200)  
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }

})


app.post('/api/user/settings', authenticateJwt, async (req:  Request, res: Response) => {

    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new UserSettings())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    }
        
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as UserSettings
    try{
        if(authenticatedUser){
            
            const existingSettings = await userSettingsDb.findSettingsByUserUUID(authenticatedUser.uuid, CONFIG.HashedMasterPassword)
            if(!existingSettings){
                await userSettingsDb.addSettings({
                    uuid: uuidv4(),
                    user: authenticatedUser.uuid,
                    defaultCountry: requestData.defaultCountry,
                    defaultAddress: requestData.defaultAddress,
                    daemonAddress: requestData.daemonAddress,
                    explorerAddress: requestData.explorerAddress
                }, CONFIG.HashedMasterPassword)
            } else {
                await userSettingsDb.updateUserSettings(authenticatedUser.uuid, {uuid: existingSettings.uuid, user: existingSettings.user, defaultCountry: requestData.defaultCountry, defaultAddress: requestData.defaultAddress, daemonAddress: requestData.daemonAddress, explorerAddress: requestData.explorerAddress}, CONFIG.HashedMasterPassword)
            }
        }
        res.status(200).send({status: "OK"})
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }

})

app.get('/api/user/registrations', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            
            const sellerRegistrations = (await sellerRegistrationDb.findRegistationsByUser(authenticatedUser.uuid)).map((item)=> { return {
                url: item.url,
                account: item.account,
                timestamp: item.timestamp
            }})

            sellerRegistrations.sort(function (a, b) {
                return b.timestamp - a.timestamp;
            });

            res.status(200).send(sellerRegistrations)
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.send
    }
})

app.get('/api/user/terms', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            if(authenticatedUser.termsAccepted == true){
                res.status(200).send({status: "OK"})  
            } else {
                res.status(200).send({status: "NOK"})
            }
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
})

app.get('/api/user/terms/accept', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            const termsAcceptedUpdated = await userDb.updateUserTermsAccepted(authenticatedUser.uuid, true)
            if(!termsAcceptedUpdated){
                res.sendStatus(418)
            } else{
                res.sendStatus(200)
            }         
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
})

app.get('/api/user/settings', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            const settings = await userSettingsDb.findSettingsByUserUUID(authenticatedUser.uuid, CONFIG.HashedMasterPassword)
            if(settings && settings.defaultCountry && settings.defaultAddress){
                res.status(200).send({defaultCountry: settings.defaultCountry, defaultAddress: settings.defaultAddress, daemonAddress: settings.daemonAddress, explorerAddress: settings.explorerAddress})  
            } else {
                res.status(200).send({defaultCountry: "none", defaultAddress: "none", daemonAddress: settings.daemonAddress, explorerAddress: settings.explorerAddress})  
            }
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
})

app.get('/api/user/name', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            res.status(200).send({username: authenticatedUser.name})  
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.send
    }
})

app.post('/api/user/password', authenticateJwt, async (req: Request, res: Response) => {
        
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new UserUpdatePassword())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
        
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as UserUpdatePassword
    try{
        if(authenticatedUser){
            await userDb.updateUserPassword(authenticatedUser.uuid, requestData.password)
        }
        res.sendStatus(200)  
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }

})

app.get('/api/user/accounts', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            const accounts = await accountDb.findAccountsByUserUUID(authenticatedUser.uuid)
            const activeAccounts = accounts.filter(account => account.deleted == false)
            res.status(200).send(activeAccounts)  
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
})

app.get('/api/user/wallets', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            res.status(200).send(await walletDb.findWalletsByUserUUID(authenticatedUser.uuid))  
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
  
})

app.post('/api/wallet/label', authenticateJwt, async (req:  Request, res: Response) => {
            
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new WalletUpdateInfo())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    }
        
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as WalletUpdateInfo

    try{
        if(authenticatedUser){
            if(authenticatedUser.wallets.find(wallet => wallet.uuid === requestData.uuid)){
                await walletDb.updateWalletLabel(requestData.uuid, requestData.label)
                res.sendStatus(200)  
            } else {
                res.sendStatus(403)
            }
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
   
  
})

app.post('/api/wallet/history', authenticateJwt, async (req:  Request, res: Response) => {
            
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new WalletHistory())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    }
        
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as WalletHistory


    try{
        if(authenticatedUser){
            if(authenticatedUser.wallets.find(wallet => wallet.uuid === requestData.uuid)){
                let history = await historyDb.findHistoryByWallet(requestData.uuid)

                if(req.query.filter != undefined){
                    let filter = req.query.filter.toString()
                    history = history.filter(txn =>{
                        return txn.txnId.includes(filter) || txn.paymentId.includes(filter) || txn.blockHeight.toString().includes(filter)
                    })
                }

                history.sort(function (a, b) {
                    return b.timestamp - a.timestamp;
                });

                res.status(200).send(history)
            } else {
                res.sendStatus(403)
            }
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
   
})

app.get('/api/wallet/keys', authenticateJwt, async (req:  Request, res: Response) => {

    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser && req.query.uuid){
            if(authenticatedUser.wallets.find(wallet => wallet.uuid === req.query.uuid)){
                const wallet = await walletDb.findWalletFullDataByUUID(req.query.uuid.toString(), CONFIG.HashedMasterPassword)
                res.status(200).send({address: wallet.address, spendKey: wallet.spendKey, viewKey: wallet.viewKey})
            } else {
                res.sendStatus(403)
            }           
        } else {
            res.sendStatus(403)
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }   
  
})

app.get('/api/account/keys', authenticateJwt, async (req:  Request, res: Response) => {

    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser && req.query.uuid){
            if(authenticatedUser.accounts.find(account => account.uuid === req.query.uuid)){
                const account = await accountDb.findAccountFullDataByUUID(req.query.uuid.toString(), CONFIG.HashedMasterPassword)
                res.status(200).send({account: account.account, secretKey: account.secretKey})
            } else {
                res.sendStatus(403)
            }           
        } else {
            res.sendStatus(403)
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }   
  
})

app.get('/api/system/logs', authenticateJwt, async (req:  Request, res: Response) => {

    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            const logs = await errorLogDb.findAllErrorLogItems(authenticatedUser.uuid)

            let logEntries = logs.map((item)=> { return {
                uuid: item.uuid,
                user: item.user,
                component: item.component,
                severity: item.severity,
                message: item.message,
                timestamp: item.timestamp
            }})

            let since = req.query.since?.toString() || "0"
            if(since){
                logEntries = logEntries.filter((entry)=>{
                    return entry.timestamp > parseInt(since)
                })
            }

            logEntries.sort(function (a, b) {
                return b.timestamp - a.timestamp;
            });

            res.status(200).send(logEntries)
        } else {
            res.sendStatus(403)
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }   
  
})

app.get('/api/user/logs/last', authenticateJwt, async (req:  Request, res: Response) => {

    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            const user = await userDb.findUserByUUID(authenticatedUser.uuid)
            if(!user){
                res.sendStatus(418)
                return
            }
            res.status(200).send({timestamp: user.logsLastSeen})
        } else {
            res.sendStatus(403)
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
        return
    }   
  
})

app.get('/api/user/logs/touch', authenticateJwt, async (req:  Request, res: Response) => {

    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            await userDb.updateUserLogsLastSeen(authenticatedUser.uuid, Date.now())
            res.sendStatus(200)
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
        return
    }   
  
})

app.post('/api/wallet/remove', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new WalletUpdateDeleted())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as WalletUpdateDeleted

    try{
        if(authenticatedUser){
            if(authenticatedUser.wallets.find(wallet => wallet.uuid === requestData.uuid)){
                await walletDb.updateWalletDeleted(requestData.uuid, true)
                res.sendStatus(200)  
            } else {
                res.sendStatus(403)
            }
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
  
})

app.get('/api/store/clear', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            await connectedApiDb.deActivateAllApis(authenticatedUser.uuid)
            res.sendStatus(200) 
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
  
})

app.get('/api/store/get', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            const activeApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeApi == null){
                res.status(200).send({}) 
                return    
            }
            res.status(200).send({url: activeApi.url}) 
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
  
})

app.post('/api/store/set', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new SetStore())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as SetStore

    try{
        if(authenticatedUser){

            await connectedApiDb.deActivateAllApis(authenticatedUser.uuid)

            const storeFrontApiStatus = await storeFrontGetApiStatus(requestData.url)
            if(storeFrontApiStatus?.status !== "OK"){
                res.status(418).send({error: "Store not available, please check url."})
                return
            }

            const storeFrontApiConfig = await storeFrontGetConfig(requestData.url)
            const storeFrontActiveStatus = storeFrontApiConfig?.find(item => item.item=="status")?.value
            const storeFrontMessage = storeFrontApiConfig?.find(item => item.item=="message")?.value

            if(storeFrontActiveStatus !== "OK"){
                res.status(418).send({error: "Store is inactive at the moment."})
                return
            }

            const storeApi = await connectedApiDb.findApiByURL(authenticatedUser.uuid, requestData.url)

            if(storeApi && storeApi !== null) {
                await connectedApiDb.updateApi(authenticatedUser.uuid, requestData.url, true, Date.now())
                
            } else {
                try{
                    // the key pair on store front level is used for seller activities
                    // on the buyer side a new pair and message addres is generated for every purchase
                    // so the seller has a set for every order
                    const rsaKeyPair: crypto.RsaKeyPair = crypto.generateRsaKeyPair()

                    await connectedApiDb.addApi({
                        uuid: uuidv4(),
                        user: authenticatedUser.uuid,
                        url: requestData.url,
                        isActiveApi: true,
                        messageAddress: generateLongId(),
                        privateKey: rsaKeyPair.privateKey,
                        publicKey: rsaKeyPair.publicKey,
                        timestamp: Date.now()
                    })


                    await errorLogDb.addErrorLogEntry({
                        component: ErrorLogComponent.API,
                        severity: ErrorLogSeverity.INFO,
                        timestamp: Date.now(),
                        user: authenticatedUser.uuid, 
                        uuid: uuidv4(),
                        message: `You connected to store front "${requestData.url}" for the first time`
                    })
                } catch (err) {
                    log(LogLevel.ERROR, err)
                    res.sendStatus(500)
                    return
                }
            }

            res.status(200).send({status: storeFrontActiveStatus, message: storeFrontMessage})
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
  
})

app.get('/api/store/seller/pubkey', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){

            if(!req.query.seller){
                res.status(400).send({status: "ERROR", error: "No value given for seller in query string"}) 
                return
            }

            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({status: "ERROR", error: "No store front api set"}) 
                return    
            }

            const activeStoreFrontApiStatus = await storeFrontGetApiStatus(activeStoreFrontApi.url)
            if(activeStoreFrontApiStatus?.status !== "OK"){
                res.status(418).send({status: "ERROR", error: "Store is unavailable at the moment."})
                return
            }

            const sellerPubkey = await storeFrontGeSellerPubkey(activeStoreFrontApi.url, req.query.seller.toString())
            if(!sellerPubkey || sellerPubkey.error){
                res.status(400).send({status: "ERROR", error: "Something went wrong while fetching sellers messaging pubKey: " + sellerPubkey?.error})
                return
            }

            try{
                // check whether the fetch pubkey is OK by encrypting a test-string with it.
                crypto.publicEncrypt("test", sellerPubkey.pubKey)
                res.status(200).send({status: "OK"})
                return
            } catch (error){
                res.status(400).send({status: "ERROR", error: "Seller does not have a valid messaging pubKey"})
                return
            }
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.send
    }
})

app.post('/api/store/seller/check', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new StoreSellerCheck())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as StoreSellerCheck

    try{
        if(authenticatedUser){

            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({error: "No store front api set"}) 
                return    
            }

            const activeStoreFrontApiStatus = await storeFrontGetApiStatus(activeStoreFrontApi.url)
            if(activeStoreFrontApiStatus?.status !== "OK"){
                res.status(418).send({error: "Store is unavailable at the moment."})
                return
            }

            const sellerRegistrationStatus = await storeFrontGetSellerRegistrationStatus(activeStoreFrontApi.url, requestData.account)
            
            if(sellerRegistrationStatus){
                const remotePubKey = await storeFrontGeSellerPubkey(activeStoreFrontApi.url, requestData.account)
                if(!remotePubKey){
                    res.status(200).send({account: requestData.account, status: "ERROR_NO_REMOTE_PUBKEY"})
                    return
                }

                if(remotePubKey.pubKey != activeStoreFrontApi.publicKey){
                    res.status(200).send({account: requestData.account, status: "ERROR_PUBKEY_DOES_NOT_MATCH"})
                    return
                }

                res.status(200).send(sellerRegistrationStatus)
            } else {
                res.status(200).send({account: requestData.account, status: "NOT_FOUND"})
            }
            
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
  
})

app.post('/api/store/seller/register', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new StoreSellerRegister())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as StoreSellerRegister

    try{
        if(authenticatedUser){

            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({error: "No store front api set"}) 
                return    
            }

            const activeStoreFrontApiStatus = await storeFrontGetApiStatus(activeStoreFrontApi.url)
            if(activeStoreFrontApiStatus?.status !== "OK"){
                res.status(418).send({error: "Store is unavailable at the moment."})
                return
            }

            const storeFrontApiConfig = await storeFrontGetConfig(activeStoreFrontApi.url)
            const storeFrontActiveStatus = storeFrontApiConfig?.find(item => item.item=="status")?.value
            const storeFrontAcceptRegistrations = storeFrontApiConfig?.find(item => item.item=="registrations")?.value

            if(storeFrontActiveStatus !== "OK"){
                res.status(418).send({error: "Store is inactive at the moment."})
                return
            }

            if(storeFrontAcceptRegistrations !== "true"){
                res.status(418).send({error: "Store does not accept new registrations at the moment."})
                return
            }

            const sellerRegistration = await storeFrontSubmitSellerRegistration(activeStoreFrontApi.url, requestData.account, activeStoreFrontApi.messageAddress, activeStoreFrontApi.publicKey)
            
            if(sellerRegistration){
                if(sellerRegistration.error){
                    res.status(200).send(sellerRegistration)
                    return
                } else {

                    const existingRegistration = await sellerRegistrationDb.findRegistationByURLAndAccount(activeStoreFrontApi.url, authenticatedUser.uuid, requestData.account)
                    if(existingRegistration){
                        await sellerRegistrationOffersDb.deleteOfferRegistrations(existingRegistration.uuid)
                        await sellerRegistrationDb.deleteRegistration(activeStoreFrontApi.url, authenticatedUser.uuid, requestData.account)
                    }

                    try{
                        await sellerRegistrationDb.addRegistration({
                            uuid: sellerRegistration.uuid,
                            user: authenticatedUser.uuid,
                            url: activeStoreFrontApi.url,
                            account: requestData.account,
                            token: sellerRegistration.token,
                            revokeToken: sellerRegistration.revokeToken,
                            timestamp: Date.now()
                        })

                        await errorLogDb.addErrorLogEntry({
                            component: ErrorLogComponent.API,
                            severity: ErrorLogSeverity.INFO,
                            timestamp: Date.now(),
                            user: authenticatedUser.uuid,
                            uuid: uuidv4(),
                            message: `You submitted your seller registration for account "${requestData.account}" on store front ${activeStoreFrontApi.url}`
                        })


                        res.status(200).send({status: "OK"})
                        return

                    } catch (error) {
                        log(LogLevel.ERROR, "Error when add seller registration to database: " + error)
                        res.status(500).send({error: "Error when add seller registration to database"})
                        return
                    }
        
                }
                
            } else {
                await errorLogDb.addErrorLogEntry({
                    component: ErrorLogComponent.API,
                    severity: ErrorLogSeverity.ERROR,
                    timestamp: Date.now(),
                    user: authenticatedUser.uuid,
                    uuid: uuidv4(),
                    message: `Your submitted registration for account "${requestData.account}" was not correctly processed by store front ${activeStoreFrontApi.url}`
                })
                res.status(500).send({error: "Registration not correctly processed by store"})
                return
            }
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
  
})

app.post('/api/store/seller/revoke', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new StoreSellerRevoke())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as StoreSellerRevoke

    try{
        if(authenticatedUser){

            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({error: "No store front api set"}) 
                return    
            }

            const sellerRegistration = await sellerRegistrationDb.findRegistationByURLAndAccount(activeStoreFrontApi.url, authenticatedUser.uuid, requestData.account)
            const sellerRevoke = await storeFrontRevokeSellerRegistration(sellerRegistration.url, sellerRegistration.account, sellerRegistration.revokeToken)
            
            if(sellerRevoke){
                if(sellerRevoke.error){
                    res.status(200).send(sellerRevoke)
                    return
                } else {

                    try{
                        await sellerRegistrationOffersDb.deleteOfferRegistrations(sellerRegistration.uuid)
                        await sellerRegistrationDb.deleteRegistration(activeStoreFrontApi.url, authenticatedUser.uuid, requestData.account)
                        await errorLogDb.addErrorLogEntry({
                            component: ErrorLogComponent.API,
                            severity: ErrorLogSeverity.INFO,
                            timestamp: Date.now(),
                            user: authenticatedUser.uuid,
                            uuid: uuidv4(),
                            message: `Your revoked your registration for account "${requestData.account}" on store front ${activeStoreFrontApi.url}`
                        })
                        res.status(200).send({status: "OK"})
                        return
                    } catch (error) {
                        log(LogLevel.ERROR, "Error when deleting seller registration from database: " + error)
                        res.status(500).send({error: "Error when deleting seller registration from database"})
                        return
                    }
                }
            } else {
                await errorLogDb.addErrorLogEntry({
                    component: ErrorLogComponent.API,
                    severity: ErrorLogSeverity.ERROR,
                    timestamp: Date.now(),
                    user: authenticatedUser.uuid,
                    uuid: uuidv4(),
                    message: `Your revokation for account "${requestData.account}" was not correctly processed by store front ${activeStoreFrontApi.url}`
                })
                res.status(500).send({error: "Revoke of registration not correctly processed by store"})
                return
            }
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
  
})

app.post('/api/store/seller/revoke/all', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new StoreSellerRevoke())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as StoreSellerRevoke

    try{
        if(authenticatedUser){

            const sellerRegistrations = await sellerRegistrationDb.findRegistationsByUserAndAccount(authenticatedUser.uuid, requestData.account)

            for(const registration of sellerRegistrations){

                try{
                    
                    const accounts = await accountDb.findAccountsByUserUUID(authenticatedUser.uuid)
                    const accountToRemove = accounts.filter(acc => acc.account == requestData.account && acc.deleted == false)
                    
                    //only revoke all registrations when there is only 1 wallet left for this user with this account
                    if(accountToRemove.length == 1){
                        const sellerRevoke = await storeFrontRevokeSellerRegistration(registration.url, requestData.account, registration.revokeToken)
                        if(sellerRevoke && !sellerRevoke.error){
                                await sellerRegistrationOffersDb.deleteOfferRegistrations(registration.uuid)
                                await sellerRegistrationDb.deleteRegistration(registration.url, authenticatedUser.uuid, requestData.account)
                            
                                await errorLogDb.addErrorLogEntry({
                                component: ErrorLogComponent.API,
                                severity: ErrorLogSeverity.INFO,
                                timestamp: Date.now(),
                                user: authenticatedUser.uuid,
                                uuid: uuidv4(),
                                message: `Automatically revoked seller registration for account "${requestData.account}" on store front ${registration.url} due to account removal from wallet`
                             })
                        }

                    } else {
                        await errorLogDb.addErrorLogEntry({
                            component: ErrorLogComponent.API,
                            severity: ErrorLogSeverity.INFO,
                            timestamp: Date.now(),
                            user: authenticatedUser.uuid,
                            uuid: uuidv4(),
                            message: `You deleted account "${requestData.account}" from a wallet, but this account is still used in ${accountToRemove.length -1} other wallet(s). The seller registration to this store was NOT revoked: ${registration.url}`
                        })
                    }                    

                } catch (error){
                    
                    await errorLogDb.addErrorLogEntry({
                        component: ErrorLogComponent.API,
                        severity: ErrorLogSeverity.ERROR,
                        timestamp: Date.now(),
                        user: authenticatedUser.uuid,
                        uuid: uuidv4(),
                        message: `Something went wrong while revoking all seller registrations for removed account "${requestData.account}" with error ${error}`
                    })

                    log(LogLevel.ERROR, "Error when revoking all seller registrations for account: " + requestData.account)
                    res.status(500).send({error: "Error when revoking all seller registrations for account: " + requestData.account})
                }
            }

            res.sendStatus(200)
        }
    
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
  
})

app.get('/api/store/config', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
          
            const activeStoreFrontApiUrl = (await connectedApiDb.findActiveApi(authenticatedUser.uuid)).url
            const activeStoreFrontApiUrlConfig = await storeFrontGetConfig(activeStoreFrontApiUrl)
            res.status(200).send(activeStoreFrontApiUrlConfig)
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
  
})

app.get('/api/store/status', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){
            const activeStoreFrontApiUrl = (await connectedApiDb.findActiveApi(authenticatedUser.uuid)).url
            const activeStoreFrontApiUrlStatus = await storeFrontGetApiStatus(activeStoreFrontApiUrl)
            res.status(200).send(activeStoreFrontApiUrlStatus)
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
  
})

app.get('/api/store/offers', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))

    try{
        if(authenticatedUser){
            //see what is the current active store front
            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({error: "No store front api set"}) 
                return    
            }

            //get allowed offers in store front
            const allowedOffersInStore = await storeFrontGetOffers(activeStoreFrontApi.url, req.query.country?.toString() || undefined)
            let allowedOfferDetails: DaemonOffer[] = []

            //get detailed data from daemon
            if(allowedOffersInStore){

                for(const seller of allowedOffersInStore){

                    const offersFromSellerOnBlockChain = await daemon.getOffersFromSeller(seller.seller)
                    
                    if(offersFromSellerOnBlockChain.error){
                        log(LogLevel.ERROR, "Error fetching offers from daemon: " + offersFromSellerOnBlockChain.error)
                        res.status(500).send({error: "Error when fetching offers from daemon"}) 
                        return   
                    }

                    const allowedOffersFromDaemon = offersFromSellerOnBlockChain.offers?.filter((offer)=>{      
                        return seller.offers.includes(offer.offer_id)
                    })

                    allowedOffersFromDaemon?.forEach(offer=> allowedOfferDetails.push(offer))
                                    
                }
            }

            let minPrice: number | undefined = req.query.minPrice ? parseInt(req.query.minPrice.toString()) : undefined
            let maxPrice: number | undefined = req.query.maxPrice ? parseInt(req.query.maxPrice.toString()) : undefined
            let minQy: number | undefined = req.query.minQy ? parseInt(req.query.minQy.toString()) : undefined

            let filteredAndOrderedOffers = await filterAndOrderOffers(
                allowedOfferDetails, 
                req.query.search?.toString(), 
                SearchType[req.query.type as keyof typeof SearchType] || SearchType.PRODUCT,
                minPrice,
                maxPrice,
                minQy,
                SortOrder[req.query.order as keyof typeof SortOrder] || SortOrder.NEWEST,
                daemon
            )

            res.status(200).send(filteredAndOrderedOffers) 
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
  
})

app.post('/api/store/offers/details', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new StoreOffersDetails())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as StoreOffersDetails

    try{
        if(authenticatedUser){

            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({error: "No store front api set"}) 
                return    
            }

            const sellerRegistration = await sellerRegistrationDb.findRegistationByURLAndAccount(activeStoreFrontApi.url, authenticatedUser.uuid, requestData.account)
            if(!sellerRegistration){
                res.status(200).send([])
                return
            }

            const sellerOfferDetails = await storeFrontGetOffersDetails(sellerRegistration.url, sellerRegistration.uuid, requestData.account, sellerRegistration.token)
            
            if(!sellerOfferDetails){
                res.status(500).send({error: "Error while fetching offer details from store front API"})
                return
            }

            res.status(200).send(sellerOfferDetails)
        }

    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
  
})

app.post('/api/store/offers/add', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new StoreOfferAdd())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as StoreOfferAdd

    try{
        if(authenticatedUser){

            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({error: "No store front api set"}) 
                return    
            }

            const storeFrontApiConfig = await storeFrontGetConfig(activeStoreFrontApi.url)
            const storeFrontActiveStatus = storeFrontApiConfig?.find(item => item.item=="status")?.value

            if(storeFrontActiveStatus !== "OK"){
                res.status(418).send({error: "Store is inactive at the moment, and does not accept new offers"})
                return
            }

            const sellerRegistration = await sellerRegistrationDb.findRegistationByURLAndAccount(activeStoreFrontApi.url, authenticatedUser.uuid, requestData.account)
            const offerAdded = await storeFrontAddOffer(sellerRegistration.url, sellerRegistration.uuid, requestData.account, requestData.offerId, requestData.countries, sellerRegistration.token)
            
            if(!offerAdded){
                res.status(500).send({error: "Error while adding offer to store front"})
                return
            } else{

                const existingOfferRegstration = (await sellerRegistrationOffersDb.findOfferRegistationsBySellerRegistration(sellerRegistration.uuid)).find(offer => offer.offerId == requestData.offerId)

                if(existingOfferRegstration){
                    await sellerRegistrationOffersDb.deleteOfferRegistration(sellerRegistration.uuid, requestData.offerId)
                }

                await sellerRegistrationOffersDb.addOfferRegistration({
                    uuid: uuidv4(),
                    sellerRegistrationUuid: sellerRegistration.uuid,
                    offerUuid: offerAdded.uuid,
                    offerId: offerAdded.offerId,
                    removeToken: offerAdded.removeToken
                })

            }
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
  
})

app.post('/api/store/offers/remove', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new StoreOfferRemove())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as StoreOfferRemove

    try{
        if(authenticatedUser){

            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({error: "No store front api set"}) 
                return    
            }

            const sellerRegistration = await sellerRegistrationDb.findRegistationByURLAndAccount(activeStoreFrontApi.url, authenticatedUser.uuid, requestData.account)
            const sellerRegistrationOffer = (await sellerRegistrationOffersDb.findOfferRegistationsBySellerRegistration(sellerRegistration.uuid)).find(offerReg => offerReg.offerId  == requestData.offerId)

            if(!sellerRegistrationOffer){
                res.status(400).send({error: "Invalid offer registration data"}) 
                return 
            }

            const offerRemoved = await storeFrontRemoveOffer(sellerRegistration.url, sellerRegistrationOffer.offerUuid, sellerRegistrationOffer.removeToken)
            
            if(!offerRemoved){
                res.status(500).send({error: "Error while removing offer from store front"})
                return
            } else {
                await sellerRegistrationOffersDb.deleteOfferRegistration(sellerRegistration.uuid, requestData.offerId)
            }
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
  
})

app.post('/api/store/offers/report', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new StoreOfferReport())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as StoreOfferReport

    try{
        if(authenticatedUser){

            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({error: "No store front api set"}) 
                return    
            }

            const offerReported = await storeFrontReportOffer(activeStoreFrontApi.url, requestData.offerId, requestData.country, requestData.reason, requestData.remark)
            
            if(offerReported?.error){
                res.status(500).send({error: offerReported.error})
                return
            } 

            if(!offerReported){
                res.status(500).send({error: "Error while reporting offer to store front"})
                return
            } 

            if(offerReported?.status){
                res.status(200).send({status: offerReported.status})
                return
            } 

            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }
  
})


app.get('/api/store/pricepegs', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))

    try{
        if(authenticatedUser){
            //see what is the current active store front
            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({error: "No store front api set"}) 
                return    
            }

            //get allowed offers in store front
            const allowedPricePegsByStore = await storeFrontGetPricePegs(activeStoreFrontApi.url)
            let allowedPricePegs: DaemonPricePeg[] = []
    
            //get detailed data from daemon
            if(allowedPricePegsByStore){

                const pricePegsFromDaemon = await daemon.getPricePegs()
                
                if(pricePegsFromDaemon.error){
                    log(LogLevel.ERROR, "Error fetching price pegs from daemon: " + pricePegsFromDaemon.error)
                    res.status(500).send({error: "Error when fetching price pegs from daemon"}) 
                    return   
                }

                if(pricePegsFromDaemon.price_pegs){
                    const allowedPricePegsFromDaemon = pricePegsFromDaemon.price_pegs?.filter((peg)=>{      
                        return allowedPricePegsByStore.includes(peg.price_peg_id)
                    })
                    allowedPricePegsFromDaemon?.forEach(peg=> allowedPricePegs.push(peg))
                }                   
               
            }

            res.status(200).send(allowedPricePegs) 
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
  
})

app.get('/api/gen/paymentid', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))

    try{
        if(authenticatedUser){
            const paymentId = safex.genPaymentId()
            res.status(200).send({paymentId})
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
  
})

app.post('/api/purchases/process', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new PurchaseAdd())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as PurchaseAdd

    try{
        if(authenticatedUser){

            // check if store front api is still correctly set
            const activeStoreFrontApi = await connectedApiDb.findActiveApi(authenticatedUser.uuid)
            if(activeStoreFrontApi == null){
                res.status(400).send({error: "No store front api set"}) 
                return    
            }

            const storeFrontApiConfig = await storeFrontGetConfig(activeStoreFrontApi.url)
            const storeFrontActiveStatus = storeFrontApiConfig?.find(item => item.item=="status")?.value

            if(storeFrontActiveStatus !== "OK"){
                res.status(418).send({error: "Store is inactive at the moment, and does not accept new purchases"})
                return
            }

            // get offer from daemon
            const offers: DaemonOffers = await daemon.getOffersFromSeller(requestData.seller)
            const purchasedOffer = offers.offers?.find(offer=>offer.offer_id == requestData.offerId) 
            if(!purchasedOffer){
                res.status(500).send({error: "Offer did not match seller or is (temporarily) not available anymore."}) 
                return
            }

            if(purchasedOffer.active == false || purchasedOffer.quantity < requestData.quantity){
                res.status(500).send({error: "Requested quantity is not available anymore or offer is inactive"}) 
                return
            }

            // get sellers messaging pubKey
            const sellerPubkey = await storeFrontGeSellerPubkey(activeStoreFrontApi.url, requestData.seller)
            if(!sellerPubkey || sellerPubkey.error){
                res.status(400).send({error: "Something went wrong while fetching sellers messaging pubKey: " + sellerPubkey?.error})
                return
            }
            
            const purchaseUuid = uuidv4()
            const purchaseRsaKeyPair: crypto.RsaKeyPair = crypto.generateRsaKeyPair()
            const purchaseMessageAddress = generateLongId()

            // add purchase to local database
            await purchaseDb.addPurchase({
                uuid: purchaseUuid,
                user: authenticatedUser.uuid,
                connectedApi: activeStoreFrontApi.uuid,
                title: purchasedOffer?.title || "",
                seller: requestData.seller,
                sellerPubkey: sellerPubkey.pubKey,
                buyerMessageAddress: purchaseMessageAddress,
                buyerPubkey: purchaseRsaKeyPair.publicKey,
                buyerPrivKey: purchaseRsaKeyPair.privateKey,
                timestamp: Date.now(),
                offerId: requestData.offerId,
                txn: requestData.txn,
                txnProofSignature: requestData.txnProofSignature,
                txnStatus: TxnStatus.UNKNOWN,
                communicationStatus: CommunicationStatus.OPEN,
                hasNewMessages: false,
                purchaseStatus: PurchaseStatus.OPEN,
                wallet: requestData.wallet,
                rated: false
            })

        
            // compose encrypted message to seller
            const messageDeleteToken =  generateLongId()

            const unEncyptedMessageContent: Message_Contents = {
                type: MessageType.OPEN_COMMUNICATION,
                data: {
                    quantity: requestData.quantity,
                    deliveryAddress: requestData.develiveryAddress,
                    additionalMessage: requestData.additionalMessage,
                    emailAddress: requestData.emailAddress,
                    deleteToken: messageDeleteToken
                } as Message_OpenCommunication
            }

            const encryptedMessageData = crypto.publicEncrypt(JSON.stringify(unEncyptedMessageContent), sellerPubkey.pubKey)
            const encryptedTxnProofSignature = crypto.publicEncrypt(JSON.stringify(requestData.txnProofSignature), sellerPubkey.pubKey)

            // encrypt message
            // the users RSA pubkey is to large to send over RSA directly.
            // so we encrypt the pubkey with a cipher and send the cipher secret, encrypted with RSA
            const secretToEncryptPubkey = crypto.createRandomSecret()
            const encryptedPubKey = crypto.encrypt(purchaseRsaKeyPair.publicKey, secretToEncryptPubkey)

            const message: Message_Envelope = {
                encryptedMessage: encryptedMessageData,
                encryptedTxnProofSignature: encryptedTxnProofSignature,
                encryptedPubkeyCipher: crypto.publicEncrypt(secretToEncryptPubkey, sellerPubkey.pubKey),
                encryptedPubKey: JSON.stringify(encryptedPubKey),
            }
    
            // create signature for RSA encrypted data
            const encryptedMessageSignature = crypto.sign(encryptedMessageData, purchaseRsaKeyPair.privateKey)

            const messageToSeller = await storeFrontPostMessage(
                    activeStoreFrontApi.url,
                    purchaseMessageAddress,
                    sellerPubkey.seller,
                    requestData.offerId,
                    requestData.txn,
                    JSON.stringify(message),
                    encryptedMessageSignature,
                    MessageDirection.BUYER_TO_SELLER,
                    messageDeleteToken
                )
                       
            if(messageToSeller){
                // save message locally to be able to read it back
                await messageDb.addMessage({
                    uuid: messageToSeller.messageId,
                    messageType: MessageType.OPEN_COMMUNICATION,
                    purchaseUuid: purchaseUuid,
                    message: JSON.stringify({
                        quantity: requestData.quantity,
                        deliveryAddress: requestData.develiveryAddress,
                        additionalMessage: requestData.additionalMessage,
                        emailAddress: requestData.emailAddress,
                    }),
                    signatureValid: true,
                    timestamp: Date.now(),
                    status: MessageStatus.SEND,
                    direction: MessageDirection.BUYER_TO_SELLER,
                    deleteToken: messageDeleteToken
                }, CONFIG.HashedMasterPassword)
            }
            
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        if(authenticatedUser){
            await errorLogDb.addErrorLogEntry({
                component: ErrorLogComponent.API,
                severity: ErrorLogSeverity.FATAL,
                timestamp: Date.now(),
                user: authenticatedUser.uuid,
                uuid: uuidv4(),
                message: `Something went wrong while processing your purchase of offer "${requestData.offerId}" on txn "${requestData.txn}" from seller "${requestData.seller}": ${error}`
            })
        }
        res.status(500).send({error: "Something went wrong while processing purchase or messaging the seller: " + error})
    }
  
})

app.post('/api/message/purchase/reply', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new PurchaseReply())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as PurchaseReply

    try{
        if(authenticatedUser){

            const purchase = await purchaseDb.findPurchaseByUUID(authenticatedUser.uuid, requestData.purchaseUuid)
            if(!purchase){
                res.status(418).send({error: "Given purchase uuid does not exist in local database"})
                return
            }
            
            const purchaseStoreFrontApi = await connectedApiDb.findApiByUUID(authenticatedUser.uuid, purchase.connectedApi)

            // check if store front api is still available
             const storeFrontApiStatus = await storeFrontGetApiStatus(purchaseStoreFrontApi.url)
            if(storeFrontApiStatus?.status !== "OK"){
                res.status(418).send({error: "Store is unavailable at the moment."})
                return
            }

            // compose encrypted message to seller
            const messageDeleteToken =  generateLongId()

            const unEncyptedMessageContent: Message_Contents = {
                type: MessageType.REPLY,
                data: {
                    message: requestData.message,
                    deleteToken: messageDeleteToken
                } as Message_Reply
            }

            const encryptedMessageData = crypto.publicEncrypt(JSON.stringify(unEncyptedMessageContent), purchase.sellerPubkey)

            const message: Message_Envelope = {
                encryptedMessage: encryptedMessageData
            }
    
            // create signature for RSA encrypted data
            const encryptedMessageSignature = crypto.sign(encryptedMessageData, purchase.buyerPrivKey)

            const messageToSeller = await storeFrontPostMessage(
                    purchaseStoreFrontApi.url,
                    purchase.buyerMessageAddress,
                    purchase.seller,
                    purchase.offerId,
                    purchase.txn,
                    JSON.stringify(message),
                    encryptedMessageSignature,
                    MessageDirection.BUYER_TO_SELLER,
                    messageDeleteToken
                )
                       
            if(messageToSeller){
                // save message locally to be able to read it back
                await messageDb.addMessage({
                    uuid: messageToSeller.messageId,
                    messageType: MessageType.REPLY,
                    purchaseUuid: purchase.uuid,
                    message: JSON.stringify({
                        message: requestData.message
                    }),
                    signatureValid: true,
                    timestamp: Date.now(),
                    status: MessageStatus.SEND,
                    direction: MessageDirection.BUYER_TO_SELLER,
                    deleteToken: messageDeleteToken
                }, CONFIG.HashedMasterPassword)
            } else {
                res.status(418).send({status: "ERROR"})
                return    
            }
            
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while sending reply message the seller: " + error})
    }
  
})

app.post('/api/message/purchase/get', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new PurchaseGetMessages())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as PurchaseGetMessages

    try{
        if(authenticatedUser){

            const messages = await messageDb.findMessagesByPurchase(requestData.purchaseUuid, CONFIG.HashedMasterPassword)
            if(!messages){
                res.status(418).send({error: "No messages could be found for this purchase"})
            }

            const messagesData = messages.map((item)=> { return {
                uuid: item.uuid,
                messageType: item.messageType,
                message: item.message,
                timestamp: item.timestamp,
                status: item.status,
                direction: item.direction
            }})

            const orderedMessages = dataManipulator
            .Set(messagesData)
            .DeepSort({
                sortByReverse: false,
                sortByField: 'timestamp'
            })
            .Get();
       
            res.status(200).send(orderedMessages)
            await purchaseDb.updateHasNewMessages(requestData.purchaseUuid, false)

            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while fetching messages from database: " + error})
    }
  
})

app.post('/api/message/purchase/delivered', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new PurchaseConfirmDelivery())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as PurchaseConfirmDelivery

    try{
        if(authenticatedUser){

            const purchase = await purchaseDb.findPurchaseByUUID(authenticatedUser.uuid, requestData.purchaseUuid)
            if(!purchase){
                res.status(418).send({error: "Given purchase uuid does not exist in local database"})
                return
            }
            
            const purchaseStoreFrontApi = await connectedApiDb.findApiByUUID(authenticatedUser.uuid, purchase.connectedApi)

            // check if store front api is still available
             const storeFrontApiStatus = await storeFrontGetApiStatus(purchaseStoreFrontApi.url)
            if(storeFrontApiStatus?.status !== "OK"){
                res.status(418).send({error: "Store is unavailable at the moment."})
                return
            }

            // compose encrypted message to seller
            const messageDeleteToken = generateLongId()

            const unEncyptedMessageContent: Message_Contents = {
                type: MessageType.CONFIRM_DELIVERY,
                data: {
                    deleteToken: messageDeleteToken
                } as Message_ConfirmDelivery
            }

            const encryptedMessageData = crypto.publicEncrypt(JSON.stringify(unEncyptedMessageContent), purchase.sellerPubkey)

            const message: Message_Envelope = {
                encryptedMessage: encryptedMessageData
            }
    
            // create signature for RSA encrypted data
            const encryptedMessageSignature = crypto.sign(encryptedMessageData, purchase.buyerPrivKey)

            const messageToSeller = await storeFrontPostMessage(
                    purchaseStoreFrontApi.url,
                    purchase.buyerMessageAddress,
                    purchase.seller,
                    purchase.offerId,
                    purchase.txn,
                    JSON.stringify(message),
                    encryptedMessageSignature,
                    MessageDirection.BUYER_TO_SELLER,
                    messageDeleteToken
                )
                       
            if(messageToSeller){
                // save message locally to be able to read it back
                await messageDb.addMessage({
                    uuid: messageToSeller.messageId,
                    messageType: MessageType.CONFIRM_DELIVERY,
                    purchaseUuid: purchase.uuid,
                    message: JSON.stringify({
                        message: "You confirmed package delivered."
                    }),
                    signatureValid: true,
                    timestamp: Date.now(),
                    status: MessageStatus.SEND,
                    direction: MessageDirection.BUYER_TO_SELLER,
                    deleteToken: messageDeleteToken
                }, CONFIG.HashedMasterPassword)
            }

            await purchaseDb.updatePurchaseStatus(purchase.uuid, PurchaseStatus.DELIVERED)
            
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while sending package delivered message the seller: " + error})
    }
  
})

app.post('/api/message/purchase/close', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new PurchaseCloseCommunication())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as PurchaseCloseCommunication

    try{
        if(authenticatedUser){

            const purchase = await purchaseDb.findPurchaseByUUID(authenticatedUser.uuid, requestData.purchaseUuid)

            if(!purchase){
                res.status(418).send({error: "Given purchase uuid does not exist in local database"})
                return
            }

            if(purchase.communicationStatus == CommunicationStatus.CLOSED){
                res.sendStatus(200)
                return
            }
            
            const purchaseStoreFrontApi = await connectedApiDb.findApiByUUID(authenticatedUser.uuid, purchase.connectedApi)

            // check if store front api is still available
             const storeFrontApiStatus = await storeFrontGetApiStatus(purchaseStoreFrontApi.url)
            if(storeFrontApiStatus?.status !== "OK"){
                res.status(418).send({error: "Store is unavailable at the moment."})
                return
            }

            // compose encrypted message to seller
            const messageDeleteToken = generateLongId()

            const unEncyptedMessageContent: Message_Contents = {
                type: MessageType.CLOSE_COMMUNICATION,
                data: {
                    deleteToken: messageDeleteToken
                } as Message_CloseCommunication
            }

            const encryptedMessageData = crypto.publicEncrypt(JSON.stringify(unEncyptedMessageContent), purchase.sellerPubkey)

            const message: Message_Envelope = {
                encryptedMessage: encryptedMessageData
            }
    
            // create signature for RSA encrypted data
            const encryptedMessageSignature = crypto.sign(encryptedMessageData, purchase.buyerPrivKey)

            const messageToSeller = await storeFrontPostMessage(
                    purchaseStoreFrontApi.url,
                    purchase.buyerMessageAddress,
                    purchase.seller,
                    purchase.offerId,
                    purchase.txn,
                    JSON.stringify(message),
                    encryptedMessageSignature,
                    MessageDirection.BUYER_TO_SELLER,
                    messageDeleteToken
                )
                       
            if(messageToSeller){
                // save message locally to be able to read it back
                await messageDb.addMessage({
                    uuid: messageToSeller.messageId,
                    messageType: MessageType.CLOSE_COMMUNICATION,
                    purchaseUuid: purchase.uuid,
                    message: JSON.stringify({
                        message: "You closed communication with the seller."
                    }),
                    signatureValid: true,
                    timestamp: Date.now(),
                    status: MessageStatus.SEND,
                    direction: MessageDirection.BUYER_TO_SELLER,
                    deleteToken: messageDeleteToken
                }, CONFIG.HashedMasterPassword)
            }

            await purchaseDb.updatePurchaseCommunicationStatus(purchase.uuid, CommunicationStatus.CLOSED)
            
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while sending close communication message the seller: " + error})
    }
  
})

app.post('/api/message/order/get', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new OrderGetMessages())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as OrderGetMessages

    try{
        if(authenticatedUser){

            const messages = await messageDb.findMessagesByOrder(requestData.orderUuid, CONFIG.HashedMasterPassword)
            if(!messages){
                res.status(418).send({error: "No messages could be found for this order"})
            }
           
            const messagesData = messages.map((item)=> { return {
                uuid: item.uuid,
                messageType: item.messageType,
                message: item.message,
                timestamp: item.timestamp,
                status: item.status,
                direction: item.direction
            }})
            
            const orderedMessages = dataManipulator
                .Set(messagesData)
                .DeepSort({
                    sortByReverse: false,
                    sortByField: 'timestamp'
                })
                .Get();
           
            res.status(200).send(orderedMessages)
            await orderDb.updateHasNewMessages(requestData.orderUuid, false)
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while fetching messages from database: " + error})
    }
  
})

app.post('/api/message/order/reply', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new OrderReply())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as OrderReply

    try{
        if(authenticatedUser){

            const order = await orderDb.findOrderByUUID(authenticatedUser.uuid, requestData.orderUuid)
            if(!order){
                res.status(418).send({error: "Given order uuid does not exist in local database"})
                return
            }

            const sellerRegistration = (await sellerRegistrationDb.findRegistationsByUser(authenticatedUser.uuid)).find(regis=> regis.uuid == order.sellerRegistration)
            if(!sellerRegistration){
                res.status(418).send({error: "Seller registration not found"})
                return
            }

            const orderStoreFrontApi = await connectedApiDb.findApiByURL(authenticatedUser.uuid, sellerRegistration.url)
            if(!orderStoreFrontApi){
                res.status(418).send({error: "Connected API not found"})
                return
            }

            // check if store front api is still available
             const storeFrontApiStatus = await storeFrontGetApiStatus(orderStoreFrontApi.url)
            if(storeFrontApiStatus?.status !== "OK"){
                res.status(418).send({error: "Store is unvailable at the moment."})
                return
            }

            // compose encrypted message to buyer
            const messageDeleteToken = generateLongId()

            const unEncyptedMessageContent: Message_Contents = {
                type: MessageType.REPLY,
                data: {
                    message: requestData.message,
                    deleteToken: messageDeleteToken
                } as Message_Reply
            }

            const encryptedMessageData = crypto.publicEncrypt(JSON.stringify(unEncyptedMessageContent), order.messagePubkey)

            const message: Message_Envelope = {
                encryptedMessage: encryptedMessageData
            }
    
            // create signature for RSA encrypted data
            const encryptedMessageSignature = crypto.sign(encryptedMessageData, orderStoreFrontApi.privateKey)

            const messageToBuyer = await storeFrontPostMessage(
                    orderStoreFrontApi.url,
                    order.account,
                    order.messageAddress,
                    order.offerId,
                    order.txn,
                    JSON.stringify(message),
                    encryptedMessageSignature,
                    MessageDirection.SELLER_TO_BUYER,
                    messageDeleteToken
                )
                       
            if(messageToBuyer){
                // save message locally to be able to read it back
                await messageDb.addMessage({
                    uuid: messageToBuyer.messageId,
                    messageType: MessageType.REPLY,
                    orderUuid: order.uuid,
                    message: JSON.stringify({
                        message: requestData.message
                    }),
                    signatureValid: true,
                    timestamp: Date.now(),
                    status: MessageStatus.SEND,
                    direction: MessageDirection.SELLER_TO_BUYER,
                    deleteToken: messageDeleteToken
                }, CONFIG.HashedMasterPassword)
            } else {
                res.status(418).send({status: "ERROR"})
                return    
            }
            
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while sending reply message the buyer: " + error})
    }
  
})

app.post('/api/message/order/ship', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new OrderShipped())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as OrderShipped

    try{
        if(authenticatedUser){

            const order = await orderDb.findOrderByUUID(authenticatedUser.uuid, requestData.orderUuid)
            if(!order){
                res.status(418).send({error: "Given order uuid does not exist in local database"})
                return
            }

            const sellerRegistration = (await sellerRegistrationDb.findRegistationsByUser(authenticatedUser.uuid)).find(regis=> regis.uuid == order.sellerRegistration)
            if(!sellerRegistration){
                res.status(418).send({error: "Seller registration not found"})
                return
            }

            const orderStoreFrontApi = await connectedApiDb.findApiByURL(authenticatedUser.uuid, sellerRegistration.url)
            if(!orderStoreFrontApi){
                res.status(418).send({error: "Connected API not found"})
                return
            }

            // check if store front api is still available
             const storeFrontApiStatus = await storeFrontGetApiStatus(orderStoreFrontApi.url)
            if(storeFrontApiStatus?.status !== "OK"){
                res.status(418).send({error: "Store is unavailable at the moment."})
                return
            }

            // compose encrypted message to buyer
            const messageDeleteToken = generateLongId()

            const unEncyptedMessageContent: Message_Contents = {
                type: MessageType.SHIPPED,
                data: {
                    deleteToken: messageDeleteToken
                } as Message_ConfirmShipment
            }

            const encryptedMessageData = crypto.publicEncrypt(JSON.stringify(unEncyptedMessageContent), order.messagePubkey)

            const message: Message_Envelope = {
                encryptedMessage: encryptedMessageData
            }
    
            // create signature for RSA encrypted data
            const encryptedMessageSignature = crypto.sign(encryptedMessageData, orderStoreFrontApi.privateKey)

            const messageToBuyer = await storeFrontPostMessage(
                    orderStoreFrontApi.url,
                    order.account,
                    order.messageAddress,
                    order.offerId,
                    order.txn,
                    JSON.stringify(message),
                    encryptedMessageSignature,
                    MessageDirection.SELLER_TO_BUYER,
                    messageDeleteToken
                )
                       
            if(messageToBuyer){
                // save message locally to be able to read it back
                await messageDb.addMessage({
                    uuid: messageToBuyer.messageId,
                    messageType: MessageType.SHIPPED,
                    orderUuid: order.uuid,
                    message: JSON.stringify({
                        message: "You marked the order as shipped."
                    }),
                    signatureValid: true,
                    timestamp: Date.now(),
                    status: MessageStatus.SEND,
                    direction: MessageDirection.SELLER_TO_BUYER,
                    deleteToken: messageDeleteToken
                }, CONFIG.HashedMasterPassword)
            }
            
            await orderDb.updateOrderStatus(order.uuid, OrderStatus.SHIPPED)
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while sending shipped message the buyer: " + error})
    }
  
})

app.post('/api/message/order/close', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new OrderCloseCommunication())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as OrderCloseCommunication

    try{
        if(authenticatedUser){

            const order = await orderDb.findOrderByUUID(authenticatedUser.uuid, requestData.orderUuid)

            if(!order){
                res.status(418).send({error: "Given order uuid does not exist in local database"})
                return
            }

            if(order.communicationStatus == CommunicationStatus.CLOSED){
                res.sendStatus(200)
                return
            }

            const sellerRegistration = (await sellerRegistrationDb.findRegistationsByUser(authenticatedUser.uuid)).find(regis=> regis.uuid == order.sellerRegistration)
            if(!sellerRegistration){
                res.status(418).send({error: "Seller registration not found"})
                return
            }

            const orderStoreFrontApi = await connectedApiDb.findApiByURL(authenticatedUser.uuid, sellerRegistration.url)
            if(!orderStoreFrontApi){
                res.status(418).send({error: "Connected API not found"})
                return
            }

            // check if store front api is still available
             const storeFrontApiStatus = await storeFrontGetApiStatus(orderStoreFrontApi.url)
            if(storeFrontApiStatus?.status !== "OK"){
                res.status(418).send({error: "Store is unavailable at the moment."})
                return
            }

            // compose encrypted message to buyer
            const messageDeleteToken = generateLongId()

            const unEncyptedMessageContent: Message_Contents = {
                type: MessageType.CLOSE_COMMUNICATION,
                data: {
                    deleteToken: messageDeleteToken
                } as Message_CloseCommunication
            }

            const encryptedMessageData = crypto.publicEncrypt(JSON.stringify(unEncyptedMessageContent), order.messagePubkey)

            const message: Message_Envelope = {
                encryptedMessage: encryptedMessageData
            }
    
            // create signature for RSA encrypted data
            const encryptedMessageSignature = crypto.sign(encryptedMessageData, orderStoreFrontApi.privateKey)

            const messageToBuyer = await storeFrontPostMessage(
                    orderStoreFrontApi.url,
                    order.account,
                    order.messageAddress,
                    order.offerId,
                    order.txn,
                    JSON.stringify(message),
                    encryptedMessageSignature,
                    MessageDirection.SELLER_TO_BUYER,
                    messageDeleteToken
                )
                       
            if(messageToBuyer){
                // save message locally to be able to read it back
                await messageDb.addMessage({
                    uuid: messageToBuyer.messageId,
                    messageType: MessageType.CLOSE_COMMUNICATION,
                    orderUuid: order.uuid,
                    message: JSON.stringify({
                        message: "You closed communication with the customer."
                    }),
                    signatureValid: true,
                    timestamp: Date.now(),
                    status: MessageStatus.SEND,
                    direction: MessageDirection.SELLER_TO_BUYER,
                    deleteToken: messageDeleteToken
                }, CONFIG.HashedMasterPassword)
            }
            
            await orderDb.updateOrderCommunicationStatus(order.uuid, CommunicationStatus.CLOSED)
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while sending close communication message the buyer: " + error})
    }
  
})

app.post('/api/order/close', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new OrderClose())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as OrderClose

    try{
        if(authenticatedUser){

            const order = await orderDb.findOrderByUUID(authenticatedUser.uuid, requestData.orderUuid)
            if(!order){
                res.status(418).send({error: "Given order uuid does not exist in local database"})
                return
            }

            await orderDb.updateOrderStatus(order.uuid, OrderStatus.CLOSED)
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while closing order in database: " + error})
    }
  
})

app.post('/api/order/validation', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new OrderValidation())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as OrderValidation

    try{
        if(authenticatedUser){

            const order = await orderDb.findOrderByUUID(authenticatedUser.uuid, requestData.orderUuid)
            if(!order){
                res.status(418).send({error: "Given order uuid does not exist in local database"})
                return
            }
            
            await orderDb.updateOrderTxnProofSignatureValid(order.uuid, requestData.receivedCash, requestData.valid)

            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while setting txn proof in database: " + error})
    }
  
})

app.post('/api/purchase/close', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new PurchaseClose())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as PurchaseClose

    try{
        if(authenticatedUser){

            const purchase = await purchaseDb.findPurchaseByUUID(authenticatedUser.uuid, requestData.purchaseUuid)
            if(!purchase){
                res.status(418).send({error: "Given purchase uuid does not exist in local database"})
                return
            }

            await purchaseDb.updatePurchaseStatus(purchase.uuid, PurchaseStatus.CLOSED)
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while closing purchase in database: " + error})
    }
  
})

app.post('/api/purchase/rate', authenticateJwt, async (req:  Request, res: Response) => {
             
    let apiRequestValidation: ApiRequestValidation = validateMessage(req.body, new PurchaseRate())
    if( apiRequestValidation.status === ApiRequestValidationStatus.ERROR ){
        res.status(400).send({error: apiRequestValidation.message})
        return
    } 
    
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    const requestData = req.body as PurchaseRate

    try{
        if(authenticatedUser){

            const purchase = await purchaseDb.findPurchaseByUUID(authenticatedUser.uuid, requestData.purchaseUuid)
            if(!purchase){
                res.status(418).send({error: "Given purchase uuid does not exist in local database"})
                return
            }

            await purchaseDb.updatePurchaseRated(purchase.uuid, true, requestData.stars, requestData.feedback)
            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while adding purchase feedback in database: " + error})
    }
})


app.get('/api/message/fetch', authenticateJwt, async (req:  Request, res: Response) => {

    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))

    try{
        if(authenticatedUser){

            // build a list of store front api's to go over and fetch messages
            let storeFrontsToFetchMessagesFrom: storeFrontFetchMessageEntry[] = []

            const connectedAPIs = await connectedApiDb.findAllApisByUser(authenticatedUser.uuid)
            if(!connectedAPIs){
                res.status(500).send({error: "Error when fetching store front apis"}) 
                return  
            }

            const sellerRegistrations = await sellerRegistrationDb.findRegistationsByUser(authenticatedUser.uuid)
            if(!sellerRegistrations){
                res.status(500).send({error: "Error when fetching seller registrations"}) 
                return  
            }

            // all store front api's used as a seller should be searched for new messages
            // regardless of the state of current purchases or orders
            sellerRegistrations.forEach((sellerRegistration)=>{
                if(!storeFrontsToFetchMessagesFrom.find(entry => entry.url == sellerRegistration.url)) {
                    const storeFrontApi = connectedAPIs.find(api => api.url == sellerRegistration.url)
                    if(storeFrontApi){
                        storeFrontsToFetchMessagesFrom.push( {url:storeFrontApi.url, messageAddress: storeFrontApi.messageAddress, privateKey: storeFrontApi.privateKey})
                    }
                    log(LogLevel.INFO, `User: ${authenticatedUser.name} : Adding store front url to fetch seller messages: ${sellerRegistration.url}` )
                }
            })

            // get open purchases => api's for open purchases should be search for new messages
            // closed purchases dont need to be fetched
            const purchases = await purchaseDb.findPurchasesByUserAndCommunicationStatus(authenticatedUser.uuid, CommunicationStatus.OPEN)
            purchases.forEach((purchase)=>{
                const usedApi = connectedAPIs.find(api => api.uuid == purchase.connectedApi)
                if(usedApi){
                    storeFrontsToFetchMessagesFrom.push({url: usedApi.url, messageAddress: purchase.buyerMessageAddress, privateKey: purchase.buyerPrivKey})
                    log(LogLevel.INFO, `User: ${authenticatedUser.name} : Adding offer api to fetch buyer messages url "${usedApi.url}" for message address "${ purchase.buyerMessageAddress}"` )
                }
            })
    

            for(const storeFrontApi of storeFrontsToFetchMessagesFrom){
               
                   
                const fetchedMessages = await storeFrontFetchMessages(storeFrontApi.url, storeFrontApi.messageAddress)
                const messagesToDelete: StoreFrontMessageDeleteEntry[] = []

                if(fetchedMessages){

                    fetchedMessages.sort(function (a, b) {
                        return a.timestamp - b.timestamp;
                    })

                    for(const message of fetchedMessages){
                        try{

                            const receivedMessage = JSON.parse(message.encryptedMessage) as Message_Envelope

                            const decryptedMessage = JSON.parse(
                                            crypto.privateDecrypt(receivedMessage.encryptedMessage, 
                                            storeFrontApi.privateKey)
                                            ) as Message_Contents


                            if(decryptedMessage.type == MessageType.OPEN_COMMUNICATION){
                                
                                let decryptedTxnProofSignature = ""
                                let decryptedPubkeyCipherKey = ""
                                let decryptedPubkey = ""

                                if(receivedMessage.encryptedTxnProofSignature && receivedMessage.encryptedPubkeyCipher && receivedMessage.encryptedPubKey){
                                    decryptedTxnProofSignature = crypto.privateDecrypt(receivedMessage.encryptedTxnProofSignature, storeFrontApi.privateKey)
                                    decryptedPubkeyCipherKey = crypto.privateDecrypt(receivedMessage.encryptedPubkeyCipher, storeFrontApi.privateKey)
                                    decryptedPubkey = crypto.decrypt(JSON.parse(receivedMessage.encryptedPubKey) as crypto.Hash, decryptedPubkeyCipherKey)
                                }

                                let decryptedMessageData = decryptedMessage.data as Message_OpenCommunication
                                
                                const existingOrder = await orderDb.findOrderByOfferAndTxn(authenticatedUser.uuid, message.offerId, message.txnId)
                                
                                if(existingOrder){
                                    await errorLogDb.addErrorLogEntry({
                                        component: ErrorLogComponent.API,
                                        severity: ErrorLogSeverity.WARNING,
                                        user: authenticatedUser.uuid,
                                        uuid: uuidv4(),
                                        timestamp: Date.now(),
                                        message: `You recieved a order message for an order that is already in the database with offer id "${message.offerId}" and txnId "${message.txnId}". This might indicate someone tried to fake a purchase based on an existing transaction. This message was ignored and did result in a new order`
                                    })
                                } else {

                                    const orderUuid = uuidv4() 

                                    //find used seller registration based on store front api URL and offer id
                                    const allOfferRegistrations = await sellerRegistrationOffersDb.findAllOfferRegistrations()
                                    let usedSellerRegistration: ISellerRegistration | undefined
                                    

                                    sellerRegistrations.forEach(sellerRegistration => {
                                        const sellersOfferRegistrations = allOfferRegistrations.filter(offerRegistration => offerRegistration.sellerRegistrationUuid == sellerRegistration.uuid)
                                        sellersOfferRegistrations.forEach(offerRegistration => {
                                            if(sellerRegistration.url == storeFrontApi.url && offerRegistration.offerId == message.offerId){
                                                usedSellerRegistration = sellerRegistration
                                            }
                                        })
                                    })

                                    const offers: DaemonOffers = await daemon.getOffersFromSeller(usedSellerRegistration?.account || "")
                                    const purchasedOffer = offers.offers?.find(offer=>offer.offer_id == message.offerId) 
                                    const signatureIsValid = crypto.verifySignature(receivedMessage.encryptedMessage, message.signature, decryptedPubkey)
                                    
                                    if(purchasedOffer && usedSellerRegistration){
                                        
                                        await orderDb.addOrder({
                                            uuid: orderUuid,
                                            user: authenticatedUser.uuid,
                                            sellerRegistration: usedSellerRegistration.uuid || "",
                                            title: purchasedOffer.title,
                                            account: purchasedOffer.seller,
                                            timestamp: message.timestamp,
                                            offerId: message.offerId,
                                            address: purchasedOffer.seller_address,
                                            txn: message.txnId,
                                            txnProofSignature: decryptedTxnProofSignature,
                                            txnStatus: TxnStatus.UNKNOWN,
                                            messageAddress: message.from,
                                            messagePubkey: decryptedPubkey,
                                            communicationStatus: CommunicationStatus.OPEN,
                                            hasNewMessages: true,
                                            orderStatus: OrderStatus.NEW
                                        })

                                        
                                        await messageDb.addMessage({
                                            uuid: message.uuid,
                                            messageType: MessageType.OPEN_COMMUNICATION,
                                            orderUuid: orderUuid,
                                            message: JSON.stringify({
                                                quantity: decryptedMessageData.quantity,
                                                deliveryAddress: decryptedMessageData.deliveryAddress,
                                                additionalMessage: decryptedMessageData.additionalMessage,
                                                emailAddress: decryptedMessageData.emailAddress,
                                            }),
                                            signatureValid: signatureIsValid,
                                            timestamp: message.timestamp,
                                            status: MessageStatus.NEW,
                                            direction: MessageDirection.BUYER_TO_SELLER,
                                            deleteToken: decryptedMessageData.deleteToken
                                        }, CONFIG.HashedMasterPassword)

                                        log(LogLevel.ERROR, "after add message of order")

                                    } else {

                                        try{
                                            await errorLogDb.addErrorLogEntry({
                                                component: ErrorLogComponent.API,
                                                severity: ErrorLogSeverity.FATAL,
                                                timestamp: Date.now(),
                                                user: authenticatedUser.uuid,
                                                uuid: uuidv4(),
                                                message: `You have received an order from store "${storeFrontApi.url}" for a seller registration that does not match. Could not create order. Please reach out to the customer. OfferID: ${message.offerId}, Txn: ${message.txnId}, 
                                                        [delivery address:] ${decryptedMessageData.deliveryAddress},
                                                        [additional message:] ${decryptedMessageData.additionalMessage}.
                                                        [email:] ${decryptedMessageData.emailAddress},
                                                        [quantity:] ${decryptedMessageData.quantity} - !IMPORTANT!: please revoke your seller registration and request a new registration to fix this.`
                                            })
                                        } catch (error) {
                                            log(LogLevel.ERROR, 'Something went wrong while writing error log to database')
                                        }
                                        
                                    }

                                }                                   

                            }  

                            if(decryptedMessage.type == MessageType.REPLY){

                                let decryptedMessageData = decryptedMessage.data as Message_Reply

                                if(message.direction == MessageDirection.SELLER_TO_BUYER){

                                    const purchase = await purchaseDb.findPurchaseByOfferAndTxn(authenticatedUser.uuid, message.offerId, message.txnId)
                                    if(!purchase){
                                        log(LogLevel.INFO, `Purchase of offer ${message.offerId} not found yet, trying to add message later.`)
                                        continue
                                    }

                                    if(purchase.communicationStatus == CommunicationStatus.CLOSED){
                                        continue
                                    }

                                    const signatureIsValid = crypto.verifySignature(receivedMessage.encryptedMessage, message.signature, purchase.sellerPubkey)
                                    
                                    await messageDb.addMessage({
                                        uuid: message.uuid,
                                        messageType: MessageType.REPLY,
                                        purchaseUuid: purchase.uuid,
                                        message: JSON.stringify({message: decryptedMessageData.message}),
                                        signatureValid: signatureIsValid,
                                        timestamp: message.timestamp,
                                        status: MessageStatus.NEW,
                                        direction: MessageDirection.SELLER_TO_BUYER,
                                        deleteToken: decryptedMessageData.deleteToken
                                    }, CONFIG.HashedMasterPassword)

                                    await purchaseDb.updateHasNewMessages(purchase.uuid, true)

                                }

                                if(message.direction == MessageDirection.BUYER_TO_SELLER){

                                    const order = await orderDb.findOrderByOfferAndTxn(authenticatedUser.uuid, message.offerId, message.txnId)
                                    if(!order){
                                        log(LogLevel.INFO, `Order for offer ${message.offerId} not found yet, trying to add message later.`)
                                        continue
                                    }

                                    if(order.communicationStatus == CommunicationStatus.CLOSED){
                                        continue
                                    }

                                    const signatureIsValid = crypto.verifySignature(receivedMessage.encryptedMessage, message.signature, order.messagePubkey)
                                    
                                    await messageDb.addMessage({
                                        uuid: message.uuid,
                                        messageType: MessageType.REPLY,
                                        orderUuid: order.uuid,
                                        message: JSON.stringify({message: decryptedMessageData.message}),
                                        signatureValid: signatureIsValid,
                                        timestamp: message.timestamp,
                                        status: MessageStatus.NEW,
                                        direction: MessageDirection.BUYER_TO_SELLER,
                                        deleteToken: decryptedMessageData.deleteToken
                                    }, CONFIG.HashedMasterPassword)

                                    await orderDb.updateHasNewMessages(order.uuid, true)

                                }
                            }
                            
                            if(decryptedMessage.type == MessageType.CLOSE_COMMUNICATION){

                                let decryptedMessageData = decryptedMessage.data as Message_CloseCommunication

                                if(message.direction == MessageDirection.SELLER_TO_BUYER){

                                    const purchase = await purchaseDb.findPurchaseByOfferAndTxn(authenticatedUser.uuid, message.offerId, message.txnId)
                                    if(!purchase){
                                        log(LogLevel.INFO, `Purchase of offer ${message.offerId} not found yet, trying to add message later.`)
                                        continue
                                    }

                                    const signatureIsValid = crypto.verifySignature(receivedMessage.encryptedMessage, message.signature, purchase.sellerPubkey)
                                    
                                    await messageDb.addMessage({
                                        uuid: message.uuid,
                                        messageType: MessageType.CLOSE_COMMUNICATION,
                                        purchaseUuid: purchase.uuid,
                                        message: JSON.stringify({message: "Seller closed communication"}) ,
                                        signatureValid: signatureIsValid,
                                        timestamp: message.timestamp,
                                        status: MessageStatus.NEW,
                                        direction: MessageDirection.SELLER_TO_BUYER,
                                        deleteToken: decryptedMessageData.deleteToken
                                    }, CONFIG.HashedMasterPassword)

                                    await purchaseDb.updateHasNewMessages(purchase.uuid, true)
                                    await purchaseDb.updatePurchaseCommunicationStatus(purchase.uuid, CommunicationStatus.CLOSED)

                                }

                                if(message.direction == MessageDirection.BUYER_TO_SELLER){

                                    const order = await orderDb.findOrderByOfferAndTxn(authenticatedUser.uuid, message.offerId, message.txnId)
                                    if(!order){
                                        log(LogLevel.INFO, `Order for offer ${message.offerId} not found yet, trying to add message later.`)
                                        continue
                                    }

                                    const signatureIsValid = crypto.verifySignature(receivedMessage.encryptedMessage, message.signature, order.messagePubkey)
                                    
                                    await messageDb.addMessage({
                                        uuid: message.uuid,
                                        messageType: MessageType.CLOSE_COMMUNICATION,
                                        orderUuid: order.uuid,
                                        message: JSON.stringify({message: "Customer closed communication."}),
                                        signatureValid: signatureIsValid,
                                        timestamp: message.timestamp,
                                        status: MessageStatus.NEW,
                                        direction: MessageDirection.BUYER_TO_SELLER,
                                        deleteToken: decryptedMessageData.deleteToken
                                    }, CONFIG.HashedMasterPassword)

                                    await orderDb.updateHasNewMessages(order.uuid, true)
                                    await orderDb.updateOrderCommunicationStatus(order.uuid, CommunicationStatus.CLOSED)

                                }

                            }

                            if(decryptedMessage.type == MessageType.SHIPPED){

                                let decryptedMessageData = decryptedMessage.data as Message_ConfirmShipment
                                
                                if(message.direction == MessageDirection.SELLER_TO_BUYER){

                                    const purchase = await purchaseDb.findPurchaseByOfferAndTxn(authenticatedUser.uuid, message.offerId, message.txnId)
                                    if(!purchase){
                                        log(LogLevel.INFO, `Purchase of offer ${message.offerId} not found yet, trying to add message later.`)
                                        continue
                                    }

                                    const signatureIsValid = crypto.verifySignature(receivedMessage.encryptedMessage, message.signature, purchase.sellerPubkey)
                                    
                                    await messageDb.addMessage({
                                        uuid: message.uuid,
                                        messageType: MessageType.SHIPPED,
                                        purchaseUuid: purchase.uuid,
                                        message: JSON.stringify({message: "The seller has shipped your order, awaiting you to confirm delivery."}),
                                        signatureValid: signatureIsValid,
                                        timestamp: message.timestamp,
                                        status: MessageStatus.NEW,
                                        direction: MessageDirection.SELLER_TO_BUYER,
                                        deleteToken: decryptedMessageData.deleteToken
                                    }, CONFIG.HashedMasterPassword)

                                    await purchaseDb.updateHasNewMessages(purchase.uuid, true)
                                    await purchaseDb.updatePurchaseStatus(purchase.uuid, PurchaseStatus.AWAITING_DELIVERY)

                                }


                            }

                            if(decryptedMessage.type == MessageType.CONFIRM_DELIVERY){

                                let decryptedMessageData = decryptedMessage.data as Message_ConfirmDelivery
                                
                                if(message.direction == MessageDirection.BUYER_TO_SELLER){

                                    const order = await orderDb.findOrderByOfferAndTxn(authenticatedUser.uuid, message.offerId, message.txnId)
                                    if(!order){
                                        log(LogLevel.INFO, `Order for offer ${message.offerId} not found yet, trying to add message later.`)
                                        continue
                                    }

                                    const signatureIsValid = crypto.verifySignature(receivedMessage.encryptedMessage, message.signature, order.messagePubkey)
                                    
                                    await messageDb.addMessage({
                                        uuid: message.uuid,
                                        messageType: MessageType.CONFIRM_DELIVERY,
                                        orderUuid: order.uuid,
                                        message: JSON.stringify({message: "Customer confirmed delivery."}),
                                        signatureValid: signatureIsValid,
                                        timestamp: message.timestamp,
                                        status: MessageStatus.NEW,
                                        direction: MessageDirection.BUYER_TO_SELLER,
                                        deleteToken: decryptedMessageData.deleteToken
                                    }, CONFIG.HashedMasterPassword)

                                    await orderDb.updateHasNewMessages(order.uuid, true)
                                    await orderDb.updateOrderStatus(order.uuid, OrderStatus.CONFIRMED_DELIVERED)

                                }
                                
                            }


                            messagesToDelete.push({uuid: message.uuid, deleteToken: decryptedMessage.data.deleteToken})
                        } catch (error){

                            await errorLogDb.addErrorLogEntry({
                                component: ErrorLogComponent.API,
                                severity: ErrorLogSeverity.ERROR,
                                timestamp: Date.now(),
                                user: authenticatedUser.uuid,
                                uuid: uuidv4(),
                                message: `Something went wrong while parsing message from store "${storeFrontApi.url}": ${error}`
                            })

                        }
                    }
                    
                }
                
                if(messagesToDelete.length > 0){
                    log(LogLevel.INFO, "Messages to delete: " + JSON.stringify(messagesToDelete))
                    await storeFrontDeleteMessages(storeFrontApi.url,  messagesToDelete)
                }
                

            }   

            res.status(200).send({status: "OK"})
            return
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.status(500).send({error: "Something went wrong while trying to fetch messages: " + error})
    }
  
})

app.get('/api/purchases/get/open', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))

    try{
        if(authenticatedUser){

            const connectedApis = await connectedApiDb.findAllApisByUser(authenticatedUser.uuid)

            const openPurchases = (await purchaseDb.findPurchasesByUserAndStatus(authenticatedUser.uuid, PurchaseStatus.OPEN)).map((item)=> { return {
                uuid: item.uuid,
                store: connectedApis.find(api => api.uuid == item.connectedApi)?.url,
                title: item.title,
                seller: item.seller,
                timestamp: item.timestamp,
                offerId: item.offerId,
                txn: item.txn,
                txnStatus: item.txnStatus,
                blockHeight: item.blockHeight,
                blockTimestamp: item.blockTimestamp,
                blockConfirmations: item.blockConfirmations,
                quantity: item.quantity,
                price: item.price,
                communicationStatus: item.communicationStatus,
                hasNewMessages: item.hasNewMessages,
                wallet: item.wallet,
                rated: item.rated,
                feedbackStars: item.feedbackStars,
                feedbackComment: item.feedbackComment
                
            }})
            const awaitingPurchases = (await purchaseDb.findPurchasesByUserAndStatus(authenticatedUser.uuid, PurchaseStatus.AWAITING_DELIVERY)).map((item)=> { return {
                uuid: item.uuid,
                store: connectedApis.find(api => api.uuid == item.connectedApi)?.url,
                title: item.title,
                seller: item.seller,
                timestamp: item.timestamp,
                offerId: item.offerId,
                txn: item.txn,
                txnStatus: item.txnStatus,
                blockHeight: item.blockHeight,
                blockTimestamp: item.blockTimestamp,
                blockConfirmations: item.blockConfirmations,
                quantity: item.quantity,
                price: item.price,
                communicationStatus: item.communicationStatus,
                hasNewMessages: item.hasNewMessages,
                wallet: item.wallet,
                rated: item.rated,
                feedbackStars: item.feedbackStars,
                feedbackComment: item.feedbackComment
                
            }})
            const deliveredPurchases = (await purchaseDb.findPurchasesByUserAndStatus(authenticatedUser.uuid, PurchaseStatus.DELIVERED)).map((item)=> { return {
                uuid: item.uuid,
                store: connectedApis.find(api => api.uuid == item.connectedApi)?.url,
                title: item.title,
                seller: item.seller,
                timestamp: item.timestamp,
                offerId: item.offerId,
                txn: item.txn,
                txnStatus: item.txnStatus,
                blockHeight: item.blockHeight,
                blockTimestamp: item.blockTimestamp,
                blockConfirmations: item.blockConfirmations,
                quantity: item.quantity,
                price: item.price,
                communicationStatus: item.communicationStatus,
                hasNewMessages: item.hasNewMessages,
                wallet: item.wallet,
                rated: item.rated,
                feedbackStars: item.feedbackStars,
                feedbackComment: item.feedbackComment
                
            }})
            res.status(200).send({open: openPurchases, awaiting: awaitingPurchases, delivered: deliveredPurchases}) 
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
})

app.get('/api/purchases/get/closed', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){

            const connectedApis = await connectedApiDb.findAllApisByUser(authenticatedUser.uuid)

            const closedPurchases = (await purchaseDb.findPurchasesByUserAndStatus(authenticatedUser.uuid, PurchaseStatus.CLOSED)).map((item)=> { return {
                uuid: item.uuid,
                store: connectedApis.find(api => api.uuid == item.connectedApi)?.url,
                title: item.title,
                seller: item.seller,
                timestamp: item.timestamp,
                offerId: item.offerId,
                txn: item.txn,    
                blockHeight: item.blockHeight,
                blockTimestamp: item.blockTimestamp,
                quantity: item.quantity,
                price: item.price,
                wallet: item.wallet,    
                rated: item.rated,
                feedbackStars: item.feedbackStars,
                feedbackComment: item.feedbackComment       
            }})

            closedPurchases.sort(function (a, b) {
                return b.timestamp - a.timestamp;
            });

            res.status(200).send(closedPurchases) 
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
})

app.get('/api/purchases/get', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))

    try{
        if(authenticatedUser){

            if(!req.query.id){
                res.sendStatus(418)
                return

            }

            const connectedApis = await connectedApiDb.findAllApisByUser(authenticatedUser.uuid)

            const purchase = await purchaseDb.findPurchaseByUUID(authenticatedUser.uuid, req.query.id.toString())
            res.status(200).send({
                uuid: purchase.uuid,
                store: connectedApis.find(api => api.uuid == purchase.connectedApi)?.url,
                title: purchase.title,
                timestamp: purchase.timestamp,
                offerId: purchase.offerId,
                quantity: purchase.quantity,
                price: purchase.price,
                status: purchase.purchaseStatus,
                communicationStatus: purchase.communicationStatus,
                hasNewMessages: purchase.hasNewMessages,
                rated: purchase.rated
            })

        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
})

app.get('/api/orders/get', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))

    try{
        if(authenticatedUser){

            if(!req.query.id){
                res.sendStatus(418)
                return

            }

            const sellerRegistrations = await sellerRegistrationDb.findRegistationsByUser(authenticatedUser.uuid)

            const order = await orderDb.findOrderByUUID(authenticatedUser.uuid, req.query.id.toString())
            res.status(200).send({
                uuid: order.uuid,
                store: sellerRegistrations.find(api => api.uuid == order.sellerRegistration)?.url,
                title: order.title,
                timestamp: order.timestamp,
                offerId: order.offerId,
                quantity: order.quantity,
                price: order.price,
                status: order.orderStatus,
                communicationStatus: order.communicationStatus,
                hasNewMessages: order.hasNewMessages
            })

        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
})

app.get('/api/orders/get/open', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){

            const sellerRegistrations = await sellerRegistrationDb.findRegistationsByUser(authenticatedUser.uuid)

            const newOrders = (await orderDb.findOrdersByUserAndStatus(authenticatedUser.uuid, OrderStatus.NEW)).map((item)=> { return {
                uuid: item.uuid,
                store: sellerRegistrations.find(api => api.uuid == item.sellerRegistration)?.url,
                title: item.title,
                account: item.account,
                timestamp: item.timestamp,
                offerId: item.offerId,
                address: item.address,
                status: item.orderStatus,
                txn: item.txn,
                txnStatus: item.txnStatus,
                txnProofSignature: item.txnProofSignature,
                txnProofSignatureValid: item.txnProofSignatureValid,
                blockHeight: item.blockHeight,
                blockTimestamp: item.blockTimestamp,
                blockConfirmations: item.blockConfirmations,
                quantity: item.quantity,
                price: item.price,
                receivedCash: item.receivedCash,
                messageAddress: item.messageAddress,
                communicationStatus: item.communicationStatus,
                hasNewMessages: item.hasNewMessages
                
            }})
            const shippedOrders = (await orderDb.findOrdersByUserAndStatus(authenticatedUser.uuid, OrderStatus.SHIPPED)).map((item)=> { return {
                uuid: item.uuid,
                store: sellerRegistrations.find(api => api.uuid == item.sellerRegistration)?.url,
                title: item.title,
                account: item.account,
                timestamp: item.timestamp,
                offerId: item.offerId,
                address: item.address,
                status: item.orderStatus,
                txn: item.txn,
                txnStatus: item.txnStatus,
                blockHeight: item.blockHeight,
                blockTimestamp: item.blockTimestamp,
                blockConfirmations: item.blockConfirmations,
                quantity: item.quantity,
                price: item.price,
                receivedCash: item.receivedCash,
                communicationStatus: item.communicationStatus,
                hasNewMessages: item.hasNewMessages
                
            }})
            const deliveredOrders = (await orderDb.findOrdersByUserAndStatus(authenticatedUser.uuid, OrderStatus.CONFIRMED_DELIVERED)).map((item)=> { return {
                uuid: item.uuid,
                store: sellerRegistrations.find(api => api.uuid == item.sellerRegistration)?.url,
                title: item.title,
                account: item.account,
                timestamp: item.timestamp,
                offerId: item.offerId,
                address: item.address,
                status: item.orderStatus,
                txn: item.txn,
                txnStatus: item.txnStatus,
                blockHeight: item.blockHeight,
                blockTimestamp: item.blockTimestamp,
                blockConfirmations: item.blockConfirmations,
                quantity: item.quantity,
                price: item.price,
                receivedCash: item.receivedCash,
                communicationStatus: item.communicationStatus,
                hasNewMessages: item.hasNewMessages
                
            }})
            res.status(200).send({new: newOrders, shipped: shippedOrders, delivered: deliveredOrders}) 
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
})

app.get('/api/orders/get/closed', authenticateJwt, async (req:  Request, res: Response) => {
    const authenticatedUser = decodeJwt(getTokenFromAuthHeader(req))
    try{
        if(authenticatedUser){

            const sellerREgistrations = await sellerRegistrationDb.findRegistationsByUser(authenticatedUser.uuid)

            const closedOrders = (await orderDb.findOrdersByUserAndStatus(authenticatedUser.uuid, OrderStatus.CLOSED)).map((item)=> { return {
                uuid: item.uuid,
                store: sellerREgistrations.find(api => api.uuid == item.sellerRegistration)?.url,
                title: item.title,
                account: item.account,
                timestamp: item.timestamp,
                offerId: item.offerId,
                address: item.address,
                txn: item.txn,
                blockHeight: item.blockHeight,
                blockTimestamp: item.blockTimestamp,
                quantity: item.quantity,
                price: item.price,
                receivedCash: item.receivedCash
                
            }})

            closedOrders.sort(function (a, b) {
                return b.timestamp - a.timestamp;
            });

            res.status(200).send(closedOrders) 
        }
    } catch (error){
        log(LogLevel.ERROR, error)
        res.sendStatus(500)
    }  
})




// ############################################
// UN AUTHENTICATED ENDPOINTS BELOW
//############################################
app.get('/api/online', async (req:  Request, res: Response) => {
    res.sendStatus(200)
})

app.get('/api/shutdown', async (req, res) => {
    shutdown()
    process.exit()
})


app.get('/api/user/count', async (req:  Request, res: Response) => {
    try {
        const userCount =  await userDb.getUserCount()
        res.send({users: userCount})
    } catch (error) {
        log(LogLevel.ERROR, "Error getting user count from database: " + error)
        res.sendStatus(500)
    }
})

app.get('/api/user/list', async (req:  Request, res: Response) => {
    try {

        let userList: any = [];
        (await userDb.findAllUsers()).forEach((user)=>{
            userList.push({name: user.name})
        })
        
        res.send(userList)
    } catch (error) {
        log(LogLevel.ERROR, "Error getting users from database: " + error)
        res.sendStatus(500)
    }
})

app.get('/api/account/count', async (req:  Request, res: Response) => {
    try {
        const accountCount =  await accountDb.getAccountCount()
        res.send({accounts: accountCount})
    } catch (error) {
        log(LogLevel.ERROR, "Error getting account count from database: " + error)
        res.sendStatus(500)
    }
})

app.get('/api/account/info', async (req:  Request, res: Response) => {
    try {
        if(req.query.account){
            const accountData: DaemonAccountInfo = await daemon.getAccountInfo(req.query.account.toString())
            res.status(200).send(accountData)
        } else {
            res.sendStatus(400)
        }
        
    } catch (error) {
        log(LogLevel.ERROR, "Error checking account in daemon: " + error)
        res.sendStatus(500)
    }
})

app.get('/api/daemon/offers', async (req:  Request, res: Response) => {
    try {
        if(req.query.seller){
            const offers: DaemonOffers = await daemon.getOffersFromSeller(req.query.seller.toString())
            res.status(200).send(offers)
        } else {
            res.sendStatus(400)
        }
        
    } catch (error) {
        log(LogLevel.ERROR, "Error getting offers from daemon: " + error)
        res.sendStatus(500)
    }
})

app.get('/api/daemon/pricepegs', async (req:  Request, res: Response) => {
    try {
            const pricepegs: DaemonPricePegs = await daemon.getPricePegs()
            res.status(200).send(pricepegs)
    } catch (error) {
        log(LogLevel.ERROR, "Error getting price pegs from daemon: " + error)
        res.sendStatus(500)
    }
})

app.get('/api/daemon/height', async (req:  Request, res: Response) => {
    try {
            const height = await daemon.getHeight()
            res.status(200).send(height)        
    } catch (error) {
        log(LogLevel.ERROR, "Error getting height from daemon: " + error)
        res.sendStatus(500)
    }
})

app.get('/api/daemon/staked', async (req:  Request, res: Response) => {
    try {
            const staked = await daemon.getStakedTokens()
            res.status(200).send({staked: staked.pairs[0].amount})        
    } catch (error) {
        log(LogLevel.ERROR, "Error getting height from daemon: " + error)
        res.sendStatus(500)
    }
})

app.get('/api/daemon/info', async (req:  Request, res: Response) => {
    try {
            const info = await daemon.getInfo()

            if(info.error){
                res.status(418).send(info)
                return
            }

            res.status(200).send(info)        
    } catch (error) {
        log(LogLevel.ERROR, "Error getting height from daemon: " + error)
        res.sendStatus(500)
    }
})


app.get('*', (req: Request, res:any) => {
    res.sendStatus(404)
})



// ############################################

server.listen(CONFIG.Port, () => {
    log(LogLevel.MESSAGE, `API server running on ${CONFIG.Network} is up on port ${CONFIG.Port}`)
})

async function connectToDatabase() {
    try {
        connectDb(path.join(CONFIG.DbPath, CONFIG.DbName))

    } catch (error) {
        log(LogLevel.ERROR, `Can not connect to database on path ${CONFIG.DbPath}, database ${CONFIG.DbName}`)

        var figlet = require('figlet');
        figlet('NO DATABASE CONNECTION ...', function(err: any, data:any) {
            if (err) {
                console.dir(err);
                return;
            }
            // do not delete, this is useful output to the console
            console.log(data)
        });

        setTimeout(()=>{
            process.exit(1);
        }, 3000)
    }
}

async function enrichOpenPurchasesAndOrders(){
    log(LogLevel.INFO, "Enriching purchases and order now: " + convertTimestampToDate(Date.now()))

    const daemonInfo = await daemon.getInfo()

    if(!daemonInfo.target_height){
        daemonInfo.target_height = 1
    }

    if(!daemonInfo.height){
        log(LogLevel.INFO, "Not enriching because daemon info is unknown ...")
        console.log("Not enriching because daemon info is unknown ...")
        return
    }

    if(daemonInfo.height < daemonInfo.target_height){
        log(LogLevel.INFO, "Not enriching because daemon is syncing ...")
        console.log("Not enriching because daemon is syncing ...")
        return
    }

    const purchases = await purchaseDb.findAllPurchases()
    const orders = await orderDb.findAllOrders()

    const openPurchases = purchases.filter(purchase =>{
        
        if(purchase.purchaseStatus != PurchaseStatus.OPEN){
            return false
        }

        if(!purchase.blockConfirmations) {
            return true
        }

        //only keep updating until 10 confirmations, after that it is good
        if(purchase.blockConfirmations && purchase.blockConfirmations < 10) {
            return true
        }

        return false
    })

    const openOrders = orders.filter(order =>{

        if(order.orderStatus != OrderStatus.NEW){
            return false
        }

        if(!order.blockConfirmations) {
            return true
        }

        //only keep updating until 10 confirmations, after that it is good
        if(order.blockConfirmations && order.blockConfirmations < 10) {
            return true
        }

        return false
    })


    openPurchases.forEach( async (purchase) =>{
        log(LogLevel.INFO, "Enriching purchase txn: " + purchase.txn)
              
        const txn = await daemon.getTransaction(purchase.txn)

        if(txn.missed_tx){
            return
        }

        const inPool = txn.txs[0].in_pool
        const blockHeight = txn.txs[0].block_height
        const blockTimestamp = txn.txs[0].block_timestamp * 1000

        let blockConfirmations = 0
        if( daemonInfo.height ){
            blockConfirmations =  daemonInfo.height - blockHeight
            if(blockConfirmations >= 10) blockConfirmations = 10
        }

        const parsedTxnData = await daemon.getDataFromTransaction(txn, 30)
        let price = 0
        let quantity = 0
        if(parsedTxnData){
            const priceField = parsedTxnData.find(item=> item.field == "price")?.value || "0"
            const quantityField = parsedTxnData.find(item=> item.field == "quantity")?.value || "0"

            price = toNormalUnits(parseInt(priceField))
            quantity = parseInt(quantityField)
        }

        await purchaseDb.updatePurchaseConfirmation(
                purchase.uuid,
                blockHeight,
                blockTimestamp,
                blockConfirmations,
                quantity,
                price,
                inPool ? TxnStatus.POOL : TxnStatus.CONFIRMED
            )
   

    })

    openOrders.forEach( async (order) =>{
        log(LogLevel.INFO, "Enriching order txn: " + order.txn)
          
        const txn = await daemon.getTransaction(order.txn)

        if(txn.missed_tx){
            return
        }

        const inPool = txn.txs[0].in_pool
        const blockHeight = txn.txs[0].block_height
        const blockTimestamp = txn.txs[0].block_timestamp * 1000

        let blockConfirmations = 0
        if( daemonInfo.height ){
            blockConfirmations =  daemonInfo.height  - blockHeight
            if(blockConfirmations>=10) blockConfirmations = 10
        }

        const parsedTxnData = await daemon.getDataFromTransaction(txn, 30)
        let price = 0
        let quantity = 0
        if(parsedTxnData){
            const priceField = parsedTxnData.find(item=> item.field == "price")?.value || "0"
            const quantityField = parsedTxnData.find(item=> item.field == "quantity")?.value || "0"

            price = toNormalUnits(parseInt(priceField))
            quantity = parseInt(quantityField)
        }

        await orderDb.updateOrderConfirmation(
                order.uuid,
                blockHeight,
                blockTimestamp,
                blockConfirmations,
                quantity,
                price,
                inPool ? TxnStatus.POOL : TxnStatus.CONFIRMED
            )
    })

}

setInterval(enrichOpenPurchasesAndOrders, 60000)

connectToDatabase()



function shutdown() {
    disconnectDb()
    log(LogLevel.MESSAGE, "Shutting down API server...")
    server.close();
  }
  
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);