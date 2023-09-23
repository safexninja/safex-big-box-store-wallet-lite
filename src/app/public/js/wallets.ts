
import { getAccountInfoFromDaemon, getAccounts, getWallets, getWalletSecretKeys, refreshAuthToken, setWalletLabel, getAccountSecretKey, getDaemonHeight, getWalletHistory, HistoricalTxn, getGeneratedPaymentId, storeFrontRevokeAllSellerRegistrations, fetchMessages, getPricePegsFromDaemon, getUserSettings } from './apicalls'
import { FormValidity, handleFormValidationAndSummarize, } from './formvalidation'
import * as bootstrap from 'bootstrap'
import { roundToTenDecimals, roundToTwoDecimals, toNormalUnits } from '../../../common/utils/units'
import { convertTimestampToDate } from '../../../common/utils/dates'
import { WalletWsConnectionHandler, websocketConnectionManager, WsAccountRecoverState, WsConnectionCreateWalletArgs, WsConnectionOpenWalletType, WsConnectionState, WsHistoryLoadingState} from './websocket'
import { PollUntil } from 'poll-until-promise'
import { AlertArea, AlertType, dismissAlert, initializeTooltips, newLineToBreak, removeHTML } from './utils'
import { sendModal, confirmationModal, confirmationModalButton, createWalletModal, createWalletFromKeysModal, confirmationModalText, clearAllBackDrops, editWalletLabelModal, restoreAccountModal, createAccountModal, hardRescanModal, historyModal, alertModal, editAccountModal, removeAccountModal, stakingModal} from './modals'
import { DaemonAccountInfo } from '../../../common/daemon/types/daemon'
import { IAccountStrict } from '../../../common/db/models/interfaces'
import { showToast } from './toast'
import { cropString } from '../../../common/utils/strings'
import { SensibleTxnType } from '../../../common/enums/txns'
import * as staking from '../../../common/constants/staking'
import { explorerAddress } from './index'

const containerWallets = document.querySelector('#container_wallets') as HTMLElement

// forms
const formSendCashToken = document.getElementById("form_send_cash_token") as HTMLFormElement
const formCreateWallet = document.getElementById("form_create_wallet") as HTMLFormElement
const formCreateWalletFromKeys = document.getElementById("form_create_wallet_from_keys") as HTMLFormElement
const formEditWalletLabel = document.getElementById("form_edit_wallet_label") as HTMLFormElement
const formCreateAccount = document.getElementById("form_create_account") as HTMLFormElement
const formRestoreAccount = document.getElementById("form_restore_account") as HTMLFormElement
const formHardRescanWallet = document.getElementById("form_hard_rescan_wallet") as HTMLFormElement
const formHistory = document.getElementById("form_filter_history") as HTMLFormElement
const formEditAccount = document.getElementById("form_edit_account") as HTMLFormElement
const formStakeTokens = document.getElementById("form_stake_tokens") as HTMLFormElement


// buttons
const confirmSendButton = document.getElementById("confirmSend")
const sendButton = document.getElementById("send")

const sendPaymentIdSwitch = document.getElementById("input_send_use_payment_id") as HTMLInputElement

const confirmCreateAccountButton = document.getElementById("confirmCreateAccount")
const createAccountButton = document.getElementById("btn_create_account")

const confirmRestoreAccountButton = document.getElementById("confirmRestoreAccount") as HTMLButtonElement
const restoreAccountButton = document.getElementById("btn_restore_account") as HTMLButtonElement

const startRescanWalletButton = document.getElementById("btn_start_rescan_wallet")

const confirmEditAccountButton = document.getElementById("confirmEditAccount") as HTMLButtonElement
const editAccountButton = document.getElementById("btn_edit_account") as HTMLButtonElement

const confirmRemoveAccountButton = document.getElementById("confirm_remove_account") as HTMLButtonElement

const confirmStakeTokensButton = document.getElementById("confirmStakeTokens") as HTMLButtonElement
const stakeTokensButton = document.getElementById("btn_stake_tokens") as HTMLButtonElement

// txn history
const buttonFilterHistoricalTxn = document.getElementById("btn_filter_history") as HTMLButtonElement
const inputFilterHistoricalTxn = document.getElementById("input_filter_history") as HTMLInputElement
const historicalTxnDiv = document.getElementById('historical_txns') as HTMLElement

if(formHistory){
    formHistory.addEventListener('submit', async (e) => {
        e.preventDefault()

        const syncStatusSpinner = document.getElementById("sync_status_spinner_history") as HTMLElement
        const wallet = formHistory.getAttribute("data-wallet")

        if(wallet){
            syncStatusSpinner.classList.remove("d-none")
            const filteredHistory = await getWalletHistory(wallet,inputFilterHistoricalTxn.value )
            renderTxnOverview(filteredHistory)
            syncStatusSpinner.classList.add("d-none")
        }       

    })

}

if(sendPaymentIdSwitch){
    sendPaymentIdSwitch.addEventListener('input', async (e) => {
        e.preventDefault()

        const paymentIdField = document.getElementById('input_send_payment_id')

        if(sendPaymentIdSwitch.checked == true){
            paymentIdField?.removeAttribute('disabled')
        } else {
            paymentIdField?.setAttribute('disabled', "")
        }

    })
}

if(formSendCashToken){
    formSendCashToken.addEventListener('submit', async (e) => {
        e.preventDefault()

        if(! new Array(...formSendCashToken.classList).includes('was-validated')){
            return
        }   

        const asset = formSendCashToken.getAttribute("data-asset")
        const wallet = formSendCashToken.getAttribute("data-wallet")

        const formFields = {
            recipientAddress : {
                element: document.querySelector('#input_send_recipient_address') as HTMLInputElement,
                validationMessage: [""]
            },
            sendAmount: {
                element: document.querySelector('#input_send_amount') as HTMLInputElement,
                validationMessage: [""]
            },
            paymentId: {
                element: document.querySelector('#input_send_payment_id') as HTMLInputElement,
                validationMessage: [""]
            },
            mixin: {
                element: document.querySelector('#input_send_mixin') as HTMLInputElement,
                validationMessage: [""]
            },
        }

        if(wallet){
            let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(wallet).wsConnection
            let paymentId = sendPaymentIdSwitch.checked == true ? formFields.paymentId.element.value : "0000000000000000"

            if(asset === "cash"){
                wsCon.sendCash(
                        formFields.recipientAddress.element.value,
                        parseFloat(formFields.sendAmount.element.value),
                        parseInt(formFields.mixin.element.value),
                        paymentId
                    )
            }

            if(asset === "token"){
                wsCon.sendToken(
                    formFields.recipientAddress.element.value,
                    parseFloat(formFields.sendAmount.element.value),
                    parseInt(formFields.mixin.element.value),
                    paymentId
                )
            }
           
        }

        dismissAlert(AlertArea.MODAL_ALERT_AREA_SEND)
        formSendCashToken.classList.remove('was-validated')
      
        sendModal.hide()
        clearAllBackDrops()

    })

}


if(formHardRescanWallet){
    formHardRescanWallet.addEventListener('submit', async (e) => {
        e.preventDefault()

        const wallet = formHardRescanWallet.getAttribute("data-wallet")
                    
        if(wallet ){

            if(startRescanWalletButton){
                startRescanWalletButton.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
                startRescanWalletButton.setAttribute("disabled", '')
            }

            const alert = document.getElementById('modal_alert_area_hard_rescan')
            alert?.classList.remove('d-none')
            

            const progressBar = document.getElementById('rescan_progress_bar')
            if(progressBar){
                progressBar.style.width = "0%"
                progressBar.innerHTML = "0%"
            }
            
            let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(wallet).wsConnection
            const targetHeight = (await getDaemonHeight()).height || 0
            

            let pollUntilPromise = new PollUntil();
            pollUntilPromise
                .stopAfter(3800000) 
                .tryEvery(200)
                .execute(() => {
                    return new Promise((resolve, reject) => {
                        if ([WsConnectionState.CLOSABLE].includes(wsCon.getState())) {
                            return resolve(true); 
                        }
                        reject(false);
                    })
                })
                .then(() => { 


                    wsCon.hardRescanBC()
                    let syncing = false
                    
                    let pollUntilPromiseRescanned = new PollUntil();
                    pollUntilPromiseRescanned
                        .stopAfter(58000000)
                        .tryEvery(1500)
                        .execute(() => {
                            return new Promise((resolve, reject) => {
                                
                                if ([WsConnectionState.WALLET_OPENED].includes(wsCon.getState()) || ([WsConnectionState.CLOSABLE].includes(wsCon.getState()) && syncing)) {
                                    syncing = true

                                    let progressPercentage = roundToTwoDecimals((wsCon.getHeight() / targetHeight) * 100).toString() + "%"
                                    if(progressBar){
                                        progressBar.style.width =  progressPercentage
                                        progressBar.innerHTML = progressPercentage
                                    }   

                                    if (wsCon.getHeight() >= targetHeight ) {
                                        return resolve(true);
                                    }
                                }                                   
                                reject(false);
                            })
                        })
                        .then(() => { 
                            hardRescanModal.hide()
                            if(progressBar){
                                progressBar.style.width =  "0%"
                                progressBar.innerHTML = "0%"
                            }                                 
                            
                            clearAllBackDrops()
                            
                        })
                        .catch(err => console.error(err));


                })
                .catch(err => console.error(err));
        }

    })

}

if(formCreateAccount){
    formCreateAccount.addEventListener('submit', async (e) => {
        e.preventDefault()  

        const wallet = formCreateAccount.getAttribute("data-wallet")

        const formFields = {
            accountName : {
                element: document.querySelector('#input_create_account_name') as HTMLInputElement,
                validationMessage: [""]
            },
            accountDescription : {
                element: document.querySelector('#input_create_account_description') as HTMLInputElement,
                validationMessage: [""]
            },
            mixin: {
                element: document.querySelector('#input_create_account_mixin') as HTMLInputElement,
                validationMessage: [""]
            }
        }
    
        dismissAlert(AlertArea.MODAL_ALERT_AREA_CREATE_ACCOUNT)
        formCreateAccount.classList.remove('was-validated')

        
        if(wallet){

            const buttonCreateAccount = document.getElementById('btn_create_account') as HTMLButtonElement
            if(buttonCreateAccount){
                buttonCreateAccount.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
                buttonCreateAccount.setAttribute("disabled", '')
            }

            let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(wallet).wsConnection
            const currentNumberOfAccounts = wsCon.getAccounts().length
           
            wsCon.createAccount(
                formFields.accountName.element.value,
                formFields.accountDescription.element.value,
                parseInt(formFields.mixin.element.value))

            let pollUntilPromise = new PollUntil();
            pollUntilPromise
                .stopAfter(40000)
                .tryEvery(200)
                .execute(() => {
                    return new Promise((resolve, reject) => {
                        if (wsCon.getAccounts().length > currentNumberOfAccounts) {
                            return resolve(true);
                        }
                        reject(false);
                    })
                })
                .then(async () => { 
                    await refreshAuthToken()      
                    createAccountModal.hide()
                    clearAllBackDrops()
                    initWallets()
                })
                .catch(err => console.error(err));

        }

    })

}

if(formRestoreAccount){
    formRestoreAccount.addEventListener('submit', async (e) => {
        e.preventDefault()


        const wallet = formRestoreAccount.getAttribute("data-wallet")

 
        const formFields = {
            accountName : {
                element: document.querySelector('#input_restore_account_name') as HTMLInputElement,
                validationMessage: [""]
            },
            secretKey : {
                element: document.querySelector('#input_restore_account_key') as HTMLInputElement,
                validationMessage: [""]
            }
        }

        dismissAlert(AlertArea.MODAL_ALERT_AREA_RESTORE_ACCOUNT)
        formRestoreAccount.classList.remove('was-validated')

        
        if(wallet){

            const buttonRestoreAccount = document.getElementById('btn_restore_account') as HTMLButtonElement
            if(buttonRestoreAccount){
                buttonRestoreAccount.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
                buttonRestoreAccount.setAttribute("disabled", '')
            }

            let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(wallet).wsConnection
            const currentNumberOfAccounts = wsCon.getAccounts().length

            wsCon.setAccountRecoverState(WsAccountRecoverState.RECOVERING)
            wsCon.recoverAccount(
                formFields.accountName.element.value,
                formFields.secretKey.element.value)

            let pollUntilPromise = new PollUntil();
            pollUntilPromise
                .stopAfter(10000)
                .tryEvery(200)
                .execute(() => {
                    return new Promise((resolve, reject) => {
                        if (wsCon.getAccountRecoverState()== WsAccountRecoverState.NONE) {
                            return resolve(true);
                        }
                        reject(false);
                    })
                })
                .then(async () => { 
                    await refreshAuthToken()      
                    restoreAccountModal.hide()
                    clearAllBackDrops()
                    initWallets()
                    wsCon.hardRescanBC()
                })
                .catch(err => console.error(err));

        }

    })

}


if(confirmStakeTokensButton){
    confirmStakeTokensButton.addEventListener('click', async (e) => {
        e.preventDefault()
        
        dismissAlert(AlertArea.MODAL_ALERT_AREA_STAKING)
        formStakeTokens.classList.remove('was-validated')

        const stakeCashAvailable = document.getElementById("stake_cash_available") as HTMLSpanElement
        const stakeTokenAvailable = document.getElementById("stake_token_available") as HTMLSpanElement

        const formFields = {
            stakeAmount : {
                element: document.querySelector('#input_stake_token_amount') as HTMLInputElement,
                validationMessage: [""]
            },
            mixin: {
                element: document.querySelector('#input_stake_mixin') as HTMLInputElement,
                validationMessage: [""]
            },
        }

        if(!/^[0-9]+$/.test(formFields.stakeAmount.element.value)) {
            formFields.stakeAmount.validationMessage.push("Enter a numeric value for amount (i.e. 25000, no decimals)")
        }

        if(parseInt(formFields.stakeAmount.element.value) < staking.STAKING_MINIMUM_TOKEN_AMOUNT) {
            formFields.stakeAmount.validationMessage.push("The minimum amount for staking is: " + staking.STAKING_MINIMUM_TOKEN_AMOUNT)
        }       
        
        if(parseInt(formFields.stakeAmount.element.value) > parseInt(stakeTokenAvailable.innerHTML)) {
            formFields.stakeAmount.validationMessage.push("Not enough tokens available to stake " + formFields.stakeAmount.element.value)
        }  
        
        if(parseInt(stakeCashAvailable.innerHTML) == 0) {
            formFields.stakeAmount.validationMessage.push("No Safex Cash available for transaction fees")
        }  

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_STAKING, AlertType.DANGER)
        formStakeTokens.classList.add('was-validated')

        if(formValidity === FormValidity.VALID && confirmationModalText){
            confirmationModalText.innerHTML = `Are you sure you want to stake ?<br><br> <b>${parseFloat(formFields.stakeAmount.element.value)}</b> Safex Tokens <br><br> Mixin:<br><br> ${formFields.mixin.element.value} <br><br>`
            confirmationModalButton?.setAttribute("data-return-modal", "stakingModal");
            (document.getElementById("form_stake_tokens_fields") as HTMLFormElement).setAttribute("disabled", '')

            dismissAlert(AlertArea.MODAL_ALERT_AREA_STAKING)
            stakingModal.hide();
            confirmationModal.show();
            
        }
        
    })

}


if(formStakeTokens){
    formStakeTokens.addEventListener('submit', async (e) => {
        e.preventDefault()

            const walletUuid = formStakeTokens.getAttribute("data-wallet")

            const formFields = {
                stakeAmount : {
                    element: document.querySelector('#input_stake_token_amount') as HTMLInputElement,
                    validationMessage: [""]
                },
                mixin: {
                    element: document.querySelector('#input_stake_mixin') as HTMLInputElement,
                    validationMessage: [""]
                },
            }
            

            if(walletUuid){

                stakeTokensButton.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
                stakeTokensButton.setAttribute("disabled", '')
                    
                let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(walletUuid).wsConnection

                let pollUntilPromise = new PollUntil();
                 pollUntilPromise
                .stopAfter(180000) 
                .tryEvery(200)
                .execute(() => {
                    return new Promise((resolve, reject) => {
                        if ([WsConnectionState.CLOSABLE].includes(wsCon.getState())) {
                            return resolve(true); 
                        }
                        reject(false);
                    })
                })
                .then(() => { 

                    wsCon.stakeTokens(parseInt(formFields.stakeAmount.element.value), parseInt(formFields.mixin.element.value))
                    stakingModal.hide()
                    clearAllBackDrops()
                })
                .catch(err => console.error(err));
                
            }            
    })

}




if(confirmSendButton){
    confirmSendButton.addEventListener('click', async (e) => {
        e.preventDefault()
        
        dismissAlert(AlertArea.MODAL_ALERT_AREA_SEND)
        formSendCashToken.classList.remove('was-validated')

        const sendAvailable = document.getElementById("send_available") as HTMLSpanElement
        const asset = formSendCashToken.getAttribute("data-asset")

        const formFields = {
            recipientAddress : {
                element: document.querySelector('#input_send_recipient_address') as HTMLInputElement,
                validationMessage: [""]
            },
            sendAmount: {
                element: document.querySelector('#input_send_amount') as HTMLInputElement,
                validationMessage: [""]
            },
            paymentId: {
                element: document.querySelector('#input_send_payment_id') as HTMLInputElement,
                validationMessage: [""]
            },
            mixin: {
                element: document.querySelector('#input_send_mixin') as HTMLInputElement,
                validationMessage: [""]
            },
        }

        if(!/^[0-9.]+$/.test(formFields.sendAmount.element.value)) {
            formFields.sendAmount.validationMessage.push("Enter a numeric value for amount (i.e. 100.50)")
        }

        if(parseFloat(formFields.sendAmount.element.value) > parseFloat(sendAvailable.innerText)) {
            formFields.sendAmount.validationMessage.push("Entered amount is larger available amount")
        }       
        
        if(sendPaymentIdSwitch.checked == true && formFields.paymentId.element.value.length == 0) {
            formFields.paymentId.validationMessage.push("Please enter a Payment ID or disabled it.")
        }          

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_SEND, AlertType.DANGER)
        formSendCashToken.classList.add('was-validated')

        if(formValidity === FormValidity.VALID && confirmationModalText){
            let paymentIdConfirm = "NONE"
            if(sendPaymentIdSwitch.checked == true)(
                paymentIdConfirm = formFields.paymentId.element.value
            )
            confirmationModalText.innerHTML = `Are you sure you want to send?<br><br> <b>${parseFloat(formFields.sendAmount.element.value)}</b> Safex ${asset?.toUpperCase()} <br><br> to:<br><br> ${formFields.recipientAddress.element.value} <br><br> with payment ID:<br><br>${paymentIdConfirm}`
            confirmationModalButton?.setAttribute("data-return-modal", "sendCashTokenModal");
            (document.getElementById("form_send_cash_token_fields") as HTMLFormElement).setAttribute("disabled", '')

            sendModal.hide();
            confirmationModal.show();
            
        }
        
    })

}

if(confirmCreateAccountButton){
    confirmCreateAccountButton.addEventListener('click', async (e) => {
        e.preventDefault()
        
        dismissAlert(AlertArea.MODAL_ALERT_AREA_CREATE_ACCOUNT)
        formCreateAccount.classList.remove('was-validated')

        const createAccountTokenAvailable = document.getElementById("create_account_token_available") as HTMLSpanElement
        const createAccountCashAvailable = document.getElementById("create_account_cash_available") as HTMLSpanElement

        const formFields = {
            accountName : {
                element: document.querySelector('#input_create_account_name') as HTMLInputElement,
                validationMessage: [""]
            },
            accountDescription : {
                element: document.querySelector('#input_create_account_description') as HTMLInputElement,
                validationMessage: [""]
            },
            mixin: {
                element: document.querySelector('#input_create_account_mixin') as HTMLInputElement,
                validationMessage: [""]
            },
        }

        formFields.accountName.element.value = formFields.accountName.element.value.toLowerCase().trim()

        const checkUserExists: DaemonAccountInfo = await getAccountInfoFromDaemon(formFields.accountName.element.value)

        if(checkUserExists.status == "OK"){
            formFields.accountName.validationMessage.push("Account already exists on the blockchain")
        }

        if(parseInt(createAccountTokenAvailable.innerText) < 1000) {
            formFields.accountName.validationMessage.push("Not enough Safex Tokens available to create a new account")
        }

        if(parseInt(createAccountCashAvailable.innerText) == 0) {
            formFields.accountName.validationMessage.push("You need to have some Safex Cash to pay for the transaction fees")
        }

        if(!/^[a-z0-9-_]+$/.test(formFields.accountName.element.value)) {
            formFields.accountName.validationMessage.push("Account name can only contain [a-z], [0-9], \"-\" or \"_\" and may not contain any spaces")
        }

        if(formFields.accountName.element.value.length == 0) {
            formFields.accountName.validationMessage.push("Account name must be at least 1 character")
        } 

        if(formFields.accountName.element.value.length > 32) {
            formFields.accountName.validationMessage.push("Account name must be less than 32 characters")
        }  

        if(formFields.accountDescription.element.value.length == 0) {
            formFields.accountDescription.validationMessage.push("Please enter a description for this account")
        }   

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_CREATE_ACCOUNT, AlertType.DANGER)
        formCreateAccount.classList.add('was-validated')

        if(formValidity === FormValidity.VALID && confirmationModalText){
            confirmationModalText.innerHTML = `Are you sure you want to create this account<br><br><b>${formFields.accountName.element.value}</b><br><br><b>description</b>:<br> ${ formFields.accountDescription.element.value.replace(/(?:\r\n|\r|\n)/g, '<br>') }<br><br>`
            confirmationModalButton?.setAttribute("data-return-modal", "createAccountModal");
            (document.getElementById("form_create_acount_fields") as HTMLFormElement).setAttribute("disabled", '')

            createAccountModal.hide();
            confirmationModal.show();
            
        }
        
    })

}


if(confirmRestoreAccountButton){
    confirmRestoreAccountButton.addEventListener('click', async (e) => {
        e.preventDefault()
        
        dismissAlert(AlertArea.MODAL_ALERT_AREA_RESTORE_ACCOUNT)
        formCreateAccount.classList.remove('was-validated')

        const wallet = formRestoreAccount.getAttribute("data-wallet")

        const formFields = {
            accountName : {
                element: document.querySelector('#input_restore_account_name') as HTMLInputElement,
                validationMessage: [""]
            },
            secretKey : {
                element: document.querySelector('#input_restore_account_key') as HTMLInputElement,
                validationMessage: [""]
            }
        }

        formFields.accountName.element.value = formFields.accountName.element.value.toLowerCase().trim()
        const currentWalletAccounts = (await getAccounts()).filter((account) => {
            return account.wallet == wallet
        })

        if(currentWalletAccounts.find((account) => account.account == formFields.accountName.element.value)){
            formFields.accountName.validationMessage.push("Account already exists in this wallet")
        }

        if(formFields.secretKey.element.value.length == 0) {
            formFields.secretKey.validationMessage.push("Please enter the secret key for this account")
        }

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_RESTORE_ACCOUNT, AlertType.DANGER)
        formCreateAccount.classList.add('was-validated')

        if(formValidity === FormValidity.VALID && confirmationModalText){
            confirmationModalText.innerHTML = `Are you sure you want to restore this account<br><br><b>${formFields.accountName.element.value}</b><br><br>`
            confirmationModalButton?.setAttribute("data-return-modal", "restoreAccountModal");
            (document.getElementById("form_restore_acount_fields") as HTMLFormElement).setAttribute("disabled", '')

            restoreAccountModal.hide();
            confirmationModal.show();
            
        }
        
    })

}


if(confirmEditAccountButton){
    confirmEditAccountButton.addEventListener('click', async (e) => {
        e.preventDefault()
        
        const accountDescription = document.getElementById('input_edit_account_description') as HTMLInputElement

        formEditAccount.classList.add('was-validated')
        if(confirmationModalText && confirmationModalButton){
            confirmationModalText.innerHTML = `Are you sure you want to set the account description to: ?<br><br> ${ newLineToBreak(accountDescription.value)}`
            confirmationModalButton?.setAttribute("data-return-modal", "editAccountModal");
        }
       
        editAccountModal.hide();
        confirmationModal.show();    
        
    })

}


if(formEditAccount){
    formEditAccount.addEventListener('submit', async (e) => {
        e.preventDefault()

            if(! new Array(...formEditAccount.classList).includes('was-validated')){
                return
            }   

            const walletUuid = formEditAccount.getAttribute("data-wallet")
            const accountUuid = formEditAccount.getAttribute("data-account")
            const accountName = formEditAccount.getAttribute("data-account-name")

            const editAccountDescription = document.getElementById('input_edit_account_description') as HTMLInputElement
            const editAccountMixnin = document.getElementById('input_edit_account_mixin') as HTMLInputElement
            
            if(editAccountDescription.value.length == 0){
                editAccountDescription.value = "none"
            }

            if(walletUuid && accountUuid && accountName){
                const buttonEditAccount = document.getElementById('btn_edit_account') as HTMLButtonElement
                if(buttonEditAccount){
                    buttonEditAccount.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
                    buttonEditAccount.setAttribute("disabled", '')
                }
    
                let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(walletUuid).wsConnection

                let pollUntilPromise = new PollUntil();
                 pollUntilPromise
                .stopAfter(180000) 
                .tryEvery(200)
                .execute(() => {
                    return new Promise((resolve, reject) => {
                        if ([WsConnectionState.CLOSABLE].includes(wsCon.getState())) {
                            return resolve(true); 
                        }
                        reject(false);
                    })
                })
                .then(() => { 

                    wsCon.editAccount(accountName, editAccountDescription.value, parseInt(editAccountMixnin.value))
                    editAccountModal.hide()
                    clearAllBackDrops()
                })
                .catch(err => console.error(err));
                
            }            
    })

}


if(formCreateWallet){
    formCreateWallet.addEventListener('submit', async (e) => {
        e.preventDefault()
 

        dismissAlert(AlertArea.MODAL_ALERT_AREA_SEND)
        formCreateWallet.classList.remove('was-validated')

        const formFields = {
            label : {
                element: document.querySelector('#input_create_wallet_label') as HTMLInputElement,
                validationMessage: [""]
            },
            
        }
      
        if(formFields.label.element.value.length < 1 ) {
            formFields.label.validationMessage.push("Please enter a label for this wallet")
        }

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_CREATE_WALLET, AlertType.DANGER)
        formCreateWallet.classList.add('was-validated')

        if(formValidity === FormValidity.VALID ){
            dismissAlert(AlertArea.MODAL_ALERT_AREA_CREATE_WALLET)       
            
            const buttonCreate = document.getElementById('btn_create_wallet') as HTMLButtonElement
            if(buttonCreate){
                buttonCreate.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
                buttonCreate.setAttribute("disabled", '')
            }
            

            const newConnection: WalletWsConnectionHandler = new WalletWsConnectionHandler('', WsConnectionOpenWalletType.CREATE_NEW)

            let pollUntilPromise = new PollUntil();
            pollUntilPromise
                .stopAfter(180000)
                .tryEvery(200)
                .execute(() => {
                    return new Promise((resolve, reject) => {
                        if (newConnection.getState() == WsConnectionState.WALLET_OPENED) {
                            return resolve(true);
                        }
                        reject(false);
                    })
                })
                .then(async () => { 
                    await refreshAuthToken()
                    await setWalletLabel(newConnection.getUuid(), formFields.label.element.value)
                    createWalletModal.hide()
                    initWallets()
                    showToast("Important!", "Back up the address and secret wallet keys!", 30000)
                })
                .catch(err => console.error(err));
            
        } 

    })

}


if(formCreateWalletFromKeys){
    formCreateWalletFromKeys.addEventListener('submit', async (e) => {
        e.preventDefault()

        dismissAlert(AlertArea.MODAL_ALERT_AREA_SEND)
        formCreateWalletFromKeys.classList.remove('was-validated')

        const formFields = {
            label : {
                element: document.querySelector('#input_create_wallet_from_keys_label') as HTMLInputElement,
                validationMessage: [""]
            },
            address : {
                element: document.querySelector('#input_create_wallet_from_keys_address') as HTMLInputElement,
                validationMessage: [""]
            },
            viewKey : {
                element: document.querySelector('#input_create_wallet_from_keys_view_key') as HTMLInputElement,
                validationMessage: [""]
            },
            spendKey : {
                element: document.querySelector('#input_create_wallet_from_keys_spend_key') as HTMLInputElement,
                validationMessage: [""]
            }
            
        }
      
        if(formFields.label.element.value.length < 1 ) {
            formFields.label.validationMessage.push("Please enter a label for this wallet")
        }

        if(formFields.address.element.value.length < 1 ) {
            formFields.address.validationMessage.push("Please enter an address for this wallet")
        }

        if(formFields.viewKey.element.value.length < 1 ) {
            formFields.viewKey.validationMessage.push("Please enter the private view key for this wallet")
        }

        if(formFields.spendKey.element.value.length < 1 ) {
            formFields.spendKey.validationMessage.push("Please enter the private spend key for this wallet")
        }

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_CREATE_WALLET_FROM_KEYS, AlertType.DANGER)
        formCreateWalletFromKeys.classList.add('was-validated')

        if(formValidity === FormValidity.VALID ){
            dismissAlert(AlertArea.MODAL_ALERT_AREA_CREATE_WALLET_FROM_KEYS)

            let createWalletArgs: WsConnectionCreateWalletArgs = {
                address: formFields.address.element.value,
                viewKey: formFields.viewKey.element.value,
                spendKey: formFields.spendKey.element.value
            }

            const buttonCreate = document.getElementById('btn_create_wallet_from_keys') as HTMLButtonElement
            if(buttonCreate){
                buttonCreate.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
                buttonCreate.setAttribute("disabled", '')
            }

            const newConnection: WalletWsConnectionHandler = new WalletWsConnectionHandler('', WsConnectionOpenWalletType.CREATE_FROM_KEYS, createWalletArgs)
           
            let pollUntilPromise = new PollUntil();
            pollUntilPromise
                .stopAfter(180000)
                .tryEvery(200)
                .execute(() => {
                    return new Promise((resolve, reject) => {
                        if (newConnection.getState() == WsConnectionState.WALLET_OPENED) {
                            return resolve(true);
                        }
                        reject(false);
                    })
                })
                .then(async () => { 
                    await refreshAuthToken()
                    await setWalletLabel(newConnection.getUuid(), formFields.label.element.value)
                    createWalletFromKeysModal.hide()
                    initWallets()
                    showToast("Important!", "Wait for the wallet to fully synchronize to the top block before doing anything with the wallet, to prevent unexpected behavior.", 30000)
                })
                .catch(err => console.error(err));
        } 

    })

}



if(formEditWalletLabel){
    formEditWalletLabel.addEventListener('submit', async (e) => {
        e.preventDefault()

        dismissAlert(AlertArea.MODAL_ALERT_AREA_EDIT_WALLET_LABEL)
        formEditWalletLabel.classList.remove('was-validated')

        const formFields = {
            label : {
                element: document.querySelector('#input_edit_wallet_label') as HTMLInputElement,
                validationMessage: [""]
            },
            
        }
      
        if(formFields.label.element.value.length < 1 ) {
            formFields.label.validationMessage.push("Please enter a label for this wallet")
        }

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_EDIT_WALLET_LABEL, AlertType.DANGER)
        formEditWalletLabel.classList.add('was-validated')

        if(formValidity === FormValidity.VALID ){
            dismissAlert(AlertArea.MODAL_ALERT_AREA_EDIT_WALLET_LABEL)      
            const walletUuid = formEditWalletLabel.getAttribute("data-wallet")
           
            if(walletUuid){
                await setWalletLabel(walletUuid, formFields.label.element.value)
                editWalletLabelModal.hide()
                initWallets()
                
            }            
        } 

    })

}



async function clearWallets(): Promise<boolean>{

    containerWallets.innerHTML = ""
    return true;    
}


async function displayWallets(): Promise<boolean>{


    const wallets = (await getWallets()).filter((wallet)=>{
        return !wallet.deleted
    })

    const safexAccounts = await getAccounts()  
   
    wallets.forEach((wallet)=>{

        const walletAccounts = safexAccounts.filter((account)=>{
            return account.wallet == wallet.uuid
        })

        
        let walletAccordion = document.createElement('div')
        containerWallets.appendChild(walletAccordion)

        let accordion: string[] = []
        accordion.push(`<div class="accordion py-3" id="accordion-${wallet.uuid}">`)
            accordion.push(`<div class="accordion-item">`)
                accordion.push(`<div class="accordion-header" id="accordion-heading-${wallet.uuid}">`)
                    accordion.push(`<button class="accordion-button collapsed" type="button" data-function="collapse" data-bs-target="#collapse-${wallet.uuid}" aria-expanded="false" aria-controls="collapse-${wallet.uuid}">`)
                    
                    accordion.push(`<div class="container" style="color: #39356A;">`)
                    accordion.push(`<div class="row align-items-end"><div class="col-md-8 col-sm-1 fs-3">${wallet.label} 
                        <i class='bx bxs-edit ms-3 fs-5 walleticons' data-function="edit_label" data-wallet="${wallet.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Edit wallet label"></i>  
                        <i class='bx bx-key ms-3 fs-4 walleticons' data-function="show_keys" data-wallet="${wallet.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Show private keys"></i> 
                        <i class='bx bx-reset ms-3 fs-5 walleticons' data-function="hard_rescan" data-wallet="${wallet.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Perform hard rescan"></i> 
                        <i class='bx bx-list-ul ms-3 fs-5 walleticons' data-function="show_history" data-wallet="${wallet.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Show transaction history"></i>
                        <i class='bx bx-credit-card-alt ms-3 fs-5 walleticons' data-function="gen_payment_id" data-wallet="${wallet.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Generate payment ID"></i>
                        </div><div class="col text_small text-nowrap"><b>Height</b>:<span class="ms-1" data="height" data-wallet="${wallet.uuid}">${ wallet.height}</span></div><div class="col text_small text-nowrap"><b>SFX</b>:<span class="ms-1" data="cash_balance" data-wallet="${wallet.uuid}">${toNormalUnits(wallet.unlockedCashBalance)}</span></div></div>`)
                    accordion.push(`<div class="row"><div class="col-md-8 col-sm-1 text_xsmall text-break user-select-all">${wallet.address}</div><div class="col text_small text-nowrap"><span data="timestamp" data-wallet="${wallet.uuid}">${convertTimestampToDate(wallet.timestamp)}</span></div><div class="col text_small text-nowrap"><b>SFT</b>:<span class="ms-1" data="token_balance" data-wallet="${wallet.uuid}">${ toNormalUnits(wallet.unlockedTokenBalance)}</span></div></div>`)
                    accordion.push(`</div>`)

                    accordion.push(`<div><i class='bx bx-sync icon_small me-2' data-function="sync" data-wallet="${wallet.uuid}" state="offline" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Sync / open wallet"></i></div>`)
                    accordion.push(`<div><i class='bx bx-stop-circle icon_small d-none me-2' data-function="stop" data-wallet="${wallet.uuid}" state="offline" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Close wallet"></i></div>`)
                   
                   
                    accordion.push(`</button>`)
                accordion.push(`</div>`)
                accordion.push(`<div id="collapse-${wallet.uuid}" class="accordion-collapse collapse" aria-labelledby="accordion-heading-${wallet.uuid}" data-bs-parent="#accordion-${wallet.uuid}">`)
                    accordion.push(`<div class="accordion-body">`)

                        // main wallet container
                        accordion.push(`<div class="container">`)
                            
                            accordion.push(`<div class="row align-items-end">`)
                                accordion.push(`<div class="col"><h5>Safex Cash <img src="/styles/images/sfx_logo_md.png" height="20px"></h5></div>`)
                                accordion.push(`<div class="col"><h5>Safex Token <img src="/styles/images/sft_logo_md.png" height="25px"></h5></div>`)
                                accordion.push(`<div class="col"><div style="display: inline-block;"><h5>Accounts</h5></div> <div style="display: inline-block;"><i class='bx bxs-info-circle' style='color:#424dce; margin-top: 10px; margin-left: 10px;'  data-bs-toggle="tooltip" data-bs-placement="right" data-bs-custom-class="custom-tooltip" data-bs-title="A Safex account on the blockchain is required to act as a seller. An account is not required to make purchases."></i></div> </div>`)
                            accordion.push(`</div>`)

                            accordion.push(`<div class="row align-items-end">`)
                                accordion.push(`<div class="col"><b>Balance:</b><span class="ms-1" data="cash_balance" data-wallet="${wallet.uuid}">${toNormalUnits(wallet.unlockedCashBalance)}</span></div>`)
                                accordion.push(`<div class="col"><b>Balance:</b><span class="ms-1" data="token_balance" data-wallet="${wallet.uuid}">${ toNormalUnits(wallet.unlockedTokenBalance)}</span></div>`)
                                accordion.push(`<div class="col"><button class="btn btn-primary" type="button" data-function="create_account" data-wallet="${wallet.uuid}">Create Account</button></div>`)
                            accordion.push(`</div>`)
                            

                            accordion.push(`<div class="row align-items-end">`)
                                accordion.push(`<div class="col"><b>Pending:</b><span class="ms-1" data="cash_balance_pending" data-wallet="${wallet.uuid}">${toNormalUnits(wallet.cashBalance - wallet.unlockedCashBalance)}</span></div>`)
                                accordion.push(`<div class="col"><b>Pending:</b><span class="ms-1" data="token_balance_pending" data-wallet="${wallet.uuid}">${ toNormalUnits(wallet.tokenBalance - wallet.unlockedTokenBalance)}</span></div>`)
                                accordion.push(`<div class="col"></div>`)
                            accordion.push(`</div>`)

                            accordion.push(`<div class="row align-items-end">`)
                                accordion.push(`<div class="col"><button class="btn btn-primary my-3" type="button" data-function="send" data-asset="cash"  data-wallet="${wallet.uuid}" data-address="${wallet.address}">Send Cash</button></div>`)
                                accordion.push(`<div class="col">
                                                        <button class="btn btn-primary my-3 me-4" type="button" data-function="send" data-asset="token" data-wallet="${wallet.uuid}" data-address="${wallet.address}">Send Token</button>
                                                        <button class="btn btn-primary my-3" type="button" data-function="staking" data-wallet="${wallet.uuid}" data-address="${wallet.address}">Token Staking</button>
                                                    </div>`)
                                accordion.push(`<div class="col"><button class="btn btn-primary my-3" type="button" data-function="restore_account" data-wallet="${wallet.uuid}">Restore Account</button></div>`)
                                
                            accordion.push(`</div>`)
                
                        accordion.push(`</div>`)

                        if(walletAccounts.length > 0){


                            accordion.push(`<div class="container mt-3 p-4 inline-bg">`)

                                
                            // Account Management
                            accordion.push(`<h5>Account Management</h5><hr>`)
                            
                            accordion.push(`<div class="row align-items-start mt-2">`)
                                accordion.push(`<div class="col-2">Account</div>`)
                                accordion.push(`<div class="col-1">Key</div>`)
                                accordion.push(`<div class="col-1">Status</div>`)
                                accordion.push(`<div class="col-5">Description</div>`)
                                accordion.push(`<div class="col-2">Added at Height</div>`)
                                accordion.push(`<div class="col-1">Manage</div>`)
                            accordion.push(`</div>`)

                            walletAccounts.forEach((account)=> {

                                accordion.push(`<div class="row align-items-start rowhighlight">`)
                                    accordion.push(`<div class="col-2 text_small">${account.account}</div>`)
                                    accordion.push(`<div class="col-1 text_small"><i class='bx bx-key fs-4 walleticons' style="cursor: pointer;" data-function="show_account_keys" data-account="${account.uuid}" data-wallet="${wallet.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Show account private keys"></i></div>`)
                                    const accountStatus = account.status == 2 ? "active" : "pending"
                                    accordion.push(`<div class="col-1 text_small">${accountStatus}</div>`)
                                    accordion.push(`<div class="col-5 text_small" data-account-desc-for="${account.account}">Description</div>`)
                                    accordion.push(`<div class="col-2 text_small">${account.creationHeight}</div>`)
                                    accordion.push(`<div class="col-1 text_small">
                                        <i class='bx bxs-edit fs-4 walleticons' style="cursor: pointer;" data-function="edit_account" data-account="${account.uuid}" data-wallet="${wallet.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Edit account description"></i>
                                        <i class='bx bx-message-square-minus fs-4 walleticons' style="cursor: pointer;" data-function="delete_account" data-account="${account.uuid}" data-wallet="${wallet.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Remove account"></i>                          
                                        </div>`)
                                    accordion.push(`</div>`)
                            })


                            accordion.push(`</div>`)

                        }


                    // accordion body

                    accordion.push(`</div>`)
                accordion.push(`</div>`)
            accordion.push(`</div>`)
        accordion.push(`</div>`)

        walletAccordion.outerHTML = accordion.join('') 
        const collapseList = [walletAccordion].map(colEl => new bootstrap.Collapse(colEl))

        initializeTooltips()

       
    })

    safexAccounts.forEach(async (account)=>{
        const accountInfo: DaemonAccountInfo = await getAccountInfoFromDaemon(account.account)
        const descElements = document.querySelectorAll(`[data-account-desc-for="${account.account}"]`) 
        descElements.forEach((descElement)=>{

            try {
                (descElement as HTMLDivElement).innerText =  cropString(removeHTML(JSON.parse(accountInfo.account_data || "")), 40)
            } catch (e) {
                (descElement as HTMLDivElement).innerText = cropString(removeHTML(accountInfo.account_data || ""), 40)
            }
            
        })
        
    })

    return true
}


function connect(uuid: string | null){
    if(uuid && uuid !== null){
        let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(uuid)?.wsConnection
    }
}

function disconnect(uuid: string | null){
    if(uuid && uuid !== null){
        websocketConnectionManager.removeConnection(uuid)
    }
}

async function showKeys(uuid: string){

    if(confirmationModalText && confirmationModalButton){
        confirmationModalText.innerHTML = `Are you sure you want to show the keys on the screen? <br><br>Make sure you are not sharing your screen and nody is watching!<br><br>`
        confirmationModalButton?.setAttribute("data-return-modal", "secretKeyModal")

        const secretKeyModalText = document.getElementById('secretkey_modal_text') as HTMLDivElement
        if(secretKeyModalText){
            const walletkeyInfo = await getWalletSecretKeys(uuid)
            secretKeyModalText.innerHTML = `<b>Address:</b><br> ${walletkeyInfo.address}<br><br> <b>Secret Spend Key:</b><br>${walletkeyInfo.spendKey}<br><br> <b>Secret View Key:</b><br>${walletkeyInfo.viewKey}<br><br> <b>Big Box Wallet ID:</b><br>${uuid}<br><br>`
        
        }
               
        confirmationModal.show();
    }
    
}

async function showAccountKeys(uuid: string){

    if(confirmationModalText && confirmationModalButton){
        confirmationModalText.innerHTML = `Are you sure you want to show the account keys on the screen? <br><br>Make sure you are not sharing your screen and nody is watching!<br><br>`
        confirmationModalButton?.setAttribute("data-return-modal", "secretKeyModal")

        const secretKeyModalText = document.getElementById('secretkey_modal_text') as HTMLDivElement
        if(secretKeyModalText){
            const accountKeyInfo = await getAccountSecretKey(uuid)
            secretKeyModalText.innerHTML = `<b>Account:</b><br> ${accountKeyInfo.account}<br><br> <b>Secret Key:</b><br>${accountKeyInfo.secretKey}<br><br>`
        }
        confirmationModal.show();
    }
    
}

function showCreateWalletModal(){
    formCreateWallet.classList.remove('was-validated')
    formCreateWallet.reset()
    const buttonCreate = document.getElementById('btn_create_wallet') as HTMLButtonElement
    if(buttonCreate){
        buttonCreate.innerHTML = 'Create!'
        buttonCreate.removeAttribute("disabled")
    }

    createWalletModal.show()    
}

function showCreateWalletFromKeysModal(){
    formCreateWalletFromKeys.classList.remove('was-validated')
    formCreateWalletFromKeys.reset()
    const buttonCreate = document.getElementById('btn_create_wallet_from_keys') as HTMLButtonElement
    if(buttonCreate){
        buttonCreate.innerHTML = 'Create!'
        buttonCreate.removeAttribute("disabled")
    }

    createWalletFromKeysModal.show()   
}


async function showEditLabelModal(uuid: string){
    formEditWalletLabel.classList.remove('was-validated')
    const inputEditWalletLabel = document.getElementById('input_edit_wallet_label') as HTMLInputElement

    formEditWalletLabel.reset()
    formEditWalletLabel.setAttribute("data-wallet", uuid)

    const wallets = await getWallets()
    wallets.forEach((wallet)=>{
        if(wallet.uuid == uuid){
            inputEditWalletLabel.value = wallet.label
        }
    })

    editWalletLabelModal.show()   
}


async function showEditAccountModal(accountUuid: string, walletUuid: string){

    confirmRestoreAccountButton.classList.remove("d-none")
    editAccountButton.classList.add("d-none")
    editAccountButton.innerHTML = 'Save!'
    editAccountButton.removeAttribute("disabled")

    formEditAccount.classList.remove('was-validated')
    formEditAccount.reset()
    formEditAccount.setAttribute("data-account", accountUuid)
    formEditAccount.setAttribute("data-wallet", walletUuid)

    const accountNameLabel = document.getElementById('edit_account_name') as HTMLDivElement
    const accountDescriptionField = document.getElementById('input_edit_account_description') as HTMLInputElement

    const accounts = await getAccounts()
    const accountToEdit = accounts.find(account=> account.uuid == accountUuid)
    if(accountToEdit){
        formEditAccount.setAttribute("data-account-name", accountToEdit.account)
        accountNameLabel.innerHTML = `<b>${accountToEdit.account}</b>` 
        const accountInfo = await getAccountInfoFromDaemon(accountToEdit.account)
        if(accountInfo.account_data){
            accountDescriptionField.value = accountInfo.account_data
        }
    }
    
    editAccountModal.show()

}

async function showRemoveAccountModal(accountUuid: string, walletUuid: string){

    await fetchMessages()

    const divAccountName = document.getElementById('account_to_remove_name') as HTMLElement
    const accounts = await getAccounts()
    const accountToDelete = accounts.find(account=> account.uuid == accountUuid)

    if(accountToDelete){
        divAccountName.innerHTML = accountToDelete.account
        confirmRemoveAccountButton.innerHTML = `Remove '${accountToDelete.account}'`
        confirmRemoveAccountButton.setAttribute('data-account-name', accountToDelete.account)
        confirmRemoveAccountButton.setAttribute('data-wallet', walletUuid)
        removeAccountModal.show()
    }
}

if(confirmRemoveAccountButton){
    confirmRemoveAccountButton.addEventListener('click', async (e) => {
        e.preventDefault()

        confirmRemoveAccountButton.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'

        const accountName = confirmRemoveAccountButton.getAttribute('data-account-name')
        const walletUuid  = confirmRemoveAccountButton.getAttribute('data-wallet')

        if(accountName && walletUuid){

            let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(walletUuid).wsConnection

            try{
                await storeFrontRevokeAllSellerRegistrations(accountName)
            } catch (error){

            }

            let pollUntilPromise = new PollUntil();
            pollUntilPromise
            .stopAfter(180000) 
            .tryEvery(200)
            .execute(() => {
                return new Promise((resolve, reject) => {
                    if ([WsConnectionState.CLOSABLE].includes(wsCon.getState())) {
                        return resolve(true); 
                    }
                    reject(false);
                })
            })
            .then(() => { 
                wsCon.removeAccount(accountName)
                confirmRemoveAccountButton.removeAttribute('data-account')
                confirmRemoveAccountButton.removeAttribute('data-wallet')
                setTimeout(()=>{
                    removeAccountModal.hide()
                    clearAllBackDrops()
                    initWallets()
                }, 4000)
               
            })
            .catch(err => console.error(err));
        }

    })
}


function showCreateAccountModal(uuid: string){

    formCreateAccount.classList.remove('was-validated')
    formCreateAccount.reset()
    confirmCreateAccountButton?.classList.remove("d-none")
    createAccountButton?.classList.add("d-none")

    const formFieldSet = document.getElementById("form_create_acount_fields") as HTMLFormElement
    const syncStatusSpinner = document.getElementById("create_account_sync_status_spinner") as HTMLElement
    const createAccountTokenAvailable = document.getElementById("create_account_token_available")
    const createAccountCashAvailable = document.getElementById("create_account_cash_available")

    formFieldSet.setAttribute("disabled", '')
    syncStatusSpinner.classList.remove("d-none")

    formCreateAccount.setAttribute("data-wallet", uuid )

    if(createAccountTokenAvailable && createAccountCashAvailable){
        createAccountTokenAvailable.innerText = (document.querySelector(`span[data=token_balance][data-wallet="${uuid}"]`) as HTMLElement).innerText
        createAccountTokenAvailable.setAttribute("data", "token_balance")
        createAccountTokenAvailable.setAttribute("data-wallet", uuid)

        createAccountCashAvailable.innerText = (document.querySelector(`span[data=cash_balance][data-wallet="${uuid}"]`) as HTMLElement).innerText
        createAccountCashAvailable.setAttribute("data", "cash_balance")
        createAccountCashAvailable.setAttribute("data-wallet", uuid)

    }

    const buttonCreateAccount = document.getElementById('btn_create_account') as HTMLButtonElement
    if(buttonCreateAccount){
        buttonCreateAccount.innerHTML = 'Create!'
        buttonCreateAccount.removeAttribute("disabled")
    }

    createAccountModal.show()

    let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(uuid).wsConnection

    let pollUntilPromise = new PollUntil();
    pollUntilPromise
        .stopAfter(180000) 
        .tryEvery(200)
        .execute(() => {
            return new Promise((resolve, reject) => {
                if ([WsConnectionState.WALLET_OPENED, WsConnectionState.CLOSABLE].includes(wsCon.getState())) {
                    return resolve(true); 
                }
                reject(false);
            })
        })
        .then(() => { 
            formFieldSet.removeAttribute('disabled')
            syncStatusSpinner.classList.add("d-none")
        })
        .catch(err => console.error(err));

}

function showRestoreAccountModal(uuid: string){
    formRestoreAccount.classList.remove('was-validated')
    formRestoreAccount.reset()
    confirmRestoreAccountButton?.classList.remove("d-none")
    restoreAccountButton?.classList.add("d-none")

    const formFieldSet = document.getElementById("form_restore_acount_fields") as HTMLFormElement
    const syncStatusSpinner = document.getElementById("restore_account_sync_status_spinner") as HTMLElement


    formFieldSet.setAttribute("disabled", '')
    syncStatusSpinner.classList.remove("d-none")

    formRestoreAccount.setAttribute("data-wallet", uuid )

    const buttonCreateAccount = document.getElementById('btn_restore_account') as HTMLButtonElement
    if(buttonCreateAccount){
        buttonCreateAccount.innerHTML = 'Restore!'
        buttonCreateAccount.removeAttribute("disabled")
    }

    restoreAccountModal.show()

    let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(uuid).wsConnection

    let pollUntilPromise = new PollUntil();
    pollUntilPromise
        .stopAfter(180000) 
        .tryEvery(200)
        .execute(() => {
            return new Promise((resolve, reject) => {
                if ([WsConnectionState.WALLET_OPENED, WsConnectionState.CLOSABLE].includes(wsCon.getState())) {
                    return resolve(true); 
                }
                reject(false);
            })
        })
        .then(() => { 
            formFieldSet.removeAttribute('disabled')
            syncStatusSpinner.classList.add("d-none")
        })
        .catch(err => console.error(err));
    
}


function showSendModal(uuid: string, address: string | null, asset: string){

    formSendCashToken.classList.remove('was-validated')
    formSendCashToken.reset()
    confirmSendButton?.classList.remove("d-none")
    sendButton?.classList.add("d-none")

    const sendFrom = document.getElementById("send_from_address")
    const sendModelTitle = document.getElementById("sendCashTokenModalLabel")
    const sendAvailable = document.getElementById("send_available")
    const formFieldSet = document.getElementById("form_send_cash_token_fields") as HTMLFormElement
    const syncStatusSpinner = document.getElementById("sync_status_spinner") as HTMLElement
   
    
    formFieldSet.setAttribute("disabled", '')
    syncStatusSpinner.classList.remove("d-none")

    if(sendFrom && sendModelTitle && sendAvailable){
        formSendCashToken.setAttribute("data-asset", asset )
        formSendCashToken.setAttribute("data-wallet", uuid )

        sendFrom.innerText = address || ""
        if( asset === "token"){
            sendModelTitle.innerText = "Send Token"
            sendAvailable.innerText = (document.querySelector(`span[data=token_balance][data-wallet="${uuid}"]`) as HTMLElement).innerText
            sendAvailable.setAttribute("data", "token_balance")
        } else {
            sendModelTitle.innerText = "Send Cash"
            sendAvailable.innerText = (document.querySelector(`span[data=cash_balance][data-wallet="${uuid}"]`) as HTMLElement).innerText
            sendAvailable.setAttribute("data", "cash_balance")
        }
        sendAvailable.setAttribute("data-wallet", uuid || "")

        sendModal.show()

        let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(uuid).wsConnection

        let pollUntilPromise = new PollUntil();
        pollUntilPromise
            .stopAfter(180000) 
            .tryEvery(200) 
            .execute(() => {
                return new Promise((resolve, reject) => {
                    if ([WsConnectionState.WALLET_OPENED, WsConnectionState.CLOSABLE].includes(wsCon.getState())) {
                        return resolve(true); 
                    }
                    reject(false);
                })
            })
            .then(() => { 
                formFieldSet.removeAttribute('disabled')
                document.getElementById('input_send_payment_id')?.setAttribute('disabled', '')
                syncStatusSpinner.classList.add("d-none")
            })
            .catch(err => console.error(err));

    }

}


async function unstakeTokens(uuid: string, amount: string, block: string){

        if(!uuid || !amount || !block){
            showToast("Error", "Could not process unstaking due to missing data", 15000)
            return
        }

        let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(uuid).wsConnection

        let pollUntilPromise = new PollUntil();
        pollUntilPromise
            .stopAfter(180000) 
            .tryEvery(200) 
            .execute(() => {
                return new Promise((resolve, reject) => {
                    if ([WsConnectionState.WALLET_OPENED, WsConnectionState.CLOSABLE].includes(wsCon.getState())) {
                        return resolve(true); 
                    }
                    reject(false);
                })
            })
            .then(() => { 
                // provide default mixin of 1, for unstake it is always 1 regardless of provided value
               wsCon.unstakeTokens(parseInt(amount), parseInt(block), 1)
               stakingModal.hide()             


            })
            .catch(err => console.error(err));

}



async function showStakingModal(uuid: string){


    formStakeTokens.classList.remove('was-validated')
    formStakeTokens.reset()
    confirmStakeTokensButton.classList.remove("d-none")
    stakeTokensButton.classList.add("d-none")
    stakeTokensButton.removeAttribute('disabled')
    stakeTokensButton.innerHTML = "Stake!"

    const formFieldSet = document.getElementById("form_stake_tokens_fields") as HTMLFormElement
    formFieldSet.setAttribute("disabled", '')

    const syncStatusSpinner = document.getElementById("sync_status_spinner_staking") as HTMLElement
    syncStatusSpinner.classList.remove("d-none")

    const stakeCashAvailable = document.getElementById("stake_cash_available") as HTMLSpanElement
    const stakeTokenAvailable = document.getElementById("stake_token_available") as HTMLSpanElement
    const walletTotalStaked = document.getElementById('wallet_staked_tokens') as HTMLElement
    walletTotalStaked.innerHTML = "0"

    if(stakeCashAvailable && stakeTokenAvailable){

        formStakeTokens.setAttribute("data-wallet", uuid )

        stakeTokenAvailable.innerText = (document.querySelector(`span[data=token_balance][data-wallet="${uuid}"]`) as HTMLElement).innerText
        stakeTokenAvailable.setAttribute("data", "token_balance")
        stakeTokenAvailable.setAttribute("data-wallet", uuid)

        stakeCashAvailable.innerText = (document.querySelector(`span[data=cash_balance][data-wallet="${uuid}"]`) as HTMLElement).innerText
        stakeCashAvailable.setAttribute("data", "cash_balance")
        stakeCashAvailable.setAttribute("data-wallet", uuid)

        const containerTokenStakeEntries = document.getElementById('token_stake_entries') as HTMLElement
        containerTokenStakeEntries.innerHTML = ""

        const currentBlockHeight = (await getDaemonHeight()).height || 0

        stakingModal.show()

        let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(uuid).wsConnection

        let pollUntilPromise = new PollUntil();
        pollUntilPromise
            .stopAfter(180000) 
            .tryEvery(200) 
            .execute(() => {
                return new Promise((resolve, reject) => {
                    if ([WsConnectionState.CLOSABLE].includes(wsCon.getState())) {
                        return resolve(true); 
                    }
                    reject(false);
                })
            })
            .then(() => { 
                formFieldSet.removeAttribute('disabled')
                
                const interestInfo = wsCon.getInterestInfo()

                interestInfo.sort(function (a, b) {
                    return parseInt(a.blockHeight) - parseInt(b.blockHeight);
                });

                let totalStaked = 0
                for(const stake of interestInfo){

                    totalStaked = totalStaked + parseInt(stake.tokenStaked)

                    let stakeRow = document.createElement('div')
                    let stakeRowData: string[] = []
            
                    stakeRowData.push(`<div class="card border mb-3" data-function="staking_row" data-wallet="${uuid}" data-amount="${toNormalUnits(parseInt(stake.tokenStaked))}" data-block="${stake.blockHeight}">`)
                
                        stakeRowData.push(`<div class="card-body">`)
                            stakeRowData.push(`<div class="row text_small">`)
                                stakeRowData.push(`<div class="col-2"><b>Tokens</b><br>${toNormalUnits(parseInt(stake.tokenStaked))}</div>`)
                                stakeRowData.push(`<div class="col-3"><b>Accrued SFX</b><br><span data-function="staking_show_collected_interest" data-wallet="${uuid}" data-amount="${toNormalUnits(parseInt(stake.tokenStaked))}" data-block="${stake.blockHeight}">${roundToTenDecimals(toNormalUnits(parseInt(stake.collectedInterest)))}</span> SFX</div>`)
                                stakeRowData.push(`<div class="col-2"><b>Stake Block</b><br>${stake.blockHeight}</div>`)

                                let remainingBlocks = 500000 - (currentBlockHeight - parseInt(stake.blockHeight))
                                let warningTooltip = ""
                                if(remainingBlocks <= 0){
                                    remainingBlocks = 0 
                                    warningTooltip = `<i class='bx bxs-info-circle' style='color:#f00; vertical-align: middle; margin-left: 10px;'  data-bs-toggle="tooltip" data-bs-placement="right" data-bs-custom-class="custom-tooltip" data-bs-title="This stake is not accruing SFX anymore after being staked 500.000 blocks. Please unstake and stake again."></i>`
                                }
                                
                                stakeRowData.push(`<div class="col-2"><b>Blocks left</b><br><span data-function="staking_show_remaining_blocks" data-wallet="${uuid}" data-amount="${toNormalUnits(parseInt(stake.tokenStaked))}" data-block="${stake.blockHeight}">${remainingBlocks}${warningTooltip}</span></div>`)
                                
                                stakeRowData.push(`<div class="col-3">`)

                                stakeRowData.push(`<div class="form-check form-switch">`) 

                                stakeRowData.push(`<input class="form-check-input me-3" style="margin-top: 10px;" type="checkbox" role="switch" data-function="enable_unstaking" data-wallet="${uuid}" data-amount="${toNormalUnits(parseInt(stake.tokenStaked))}" data-block="${stake.blockHeight}">`)                               


                                
                                    if((currentBlockHeight - parseInt(stake.blockHeight) > staking.STAKING_MINIMUM_PERIOD)){
                                        stakeRowData.push(`<button type="button" disabled="" class="btn btn-danger float-start" data-function="unstaking" data-wallet="${uuid}" data-amount="${toNormalUnits(parseInt(stake.tokenStaked))}" data-block="${stake.blockHeight}">Unstake</button>`)
                                    } else {
                                        stakeRowData.push(`<span class="text_xsmall" data-function="staking_show_remaining_blocks_unstaking" data-wallet="${uuid}" data-amount="${toNormalUnits(parseInt(stake.tokenStaked))}" data-block="${stake.blockHeight}">${staking.STAKING_MINIMUM_PERIOD - (currentBlockHeight - parseInt(stake.blockHeight)) } blocks to enable unstaking</span>`)
                                        stakeRowData.push(`<button type="button" disabled="" class="btn btn-danger float-start d-none" data-function="unstaking" data-wallet="${uuid}" data-amount="${toNormalUnits(parseInt(stake.tokenStaked))}" data-block="${stake.blockHeight}">Unstake</button>`)
                                    }
                                    
                                    stakeRowData.push(`</div>`) 
                                    
                                stakeRowData.push(`</div>`)                               
                            stakeRowData.push(`</div>`)
                        stakeRowData.push(`</div>`)
                    stakeRowData.push(`</div>`)
            
                    containerTokenStakeEntries.appendChild(stakeRow)
                    stakeRow.outerHTML = stakeRowData.join('')
                }

                initializeTooltips()

                //binding functions to unstake buttons
                const unStakingButtons = document.querySelectorAll("button[data-function=unstaking]")
                if(unStakingButtons){
                    unStakingButtons.forEach((unStakingButton)=>{
                        unStakingButton.addEventListener('click', function(){ unstakeTokens(unStakingButton.getAttribute("data-wallet") || "", unStakingButton.getAttribute("data-amount") || "", unStakingButton.getAttribute("data-block") || "");}, false)
                    })
                }

                  //binding functions to enable unstake switches
                  const enableUnstakeSwitches = document.querySelectorAll("input[data-function=enable_unstaking]")
                  if(enableUnstakeSwitches){
                    enableUnstakeSwitches.forEach((enableUnstakeSwitch)=>{
                        enableUnstakeSwitch.addEventListener('input', function(){ 
                            
                            const unstakeButton = document.querySelector(`button[data-function=unstaking][data-wallet="${enableUnstakeSwitch.getAttribute("data-wallet")}"][data-amount="${enableUnstakeSwitch.getAttribute("data-amount")}"][data-block="${enableUnstakeSwitch.getAttribute("data-block")}"]`) as HTMLButtonElement
                            const unstakeCard = document.querySelector(`div[data-function=staking_row][data-wallet="${enableUnstakeSwitch.getAttribute("data-wallet")}"][data-amount="${enableUnstakeSwitch.getAttribute("data-amount")}"][data-block="${enableUnstakeSwitch.getAttribute("data-block")}"]`) as HTMLDivElement

                            if((enableUnstakeSwitch as HTMLInputElement).checked){
                                unstakeButton.removeAttribute("disabled")
                                unstakeCard.classList.add("highlight")
                            } else {
                                unstakeButton.setAttribute("disabled", "")
                                unstakeCard.classList.remove("highlight")
                            }
                        }, false)
                      })
                  }

                walletTotalStaked.innerHTML = toNormalUnits(totalStaked).toString()
                syncStatusSpinner.classList.add("d-none")
            })
            .catch(err => console.error(err));
    }
}



function showHistoryModal(uuid: string){
    
    historicalTxnDiv.innerHTML = ""
    formHistory.reset()
    formHistory.setAttribute('data-wallet', uuid)
    
    historyModal.show()

    const syncStatusSpinner = document.getElementById("sync_status_spinner_history") as HTMLElement
    syncStatusSpinner.classList.remove("d-none")

    let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(uuid).wsConnection

    let pollUntilPromiseOpen = new PollUntil();
    pollUntilPromiseOpen
        .stopAfter(180000) 
        .tryEvery(200) 
        .execute(() => {
            return new Promise((resolve, reject) => {
                if ([WsConnectionState.WALLET_OPENED, WsConnectionState.CLOSABLE].includes(wsCon.getState())) {
                    return resolve(true); 
                }
                reject(false);
            })
        })
        .then(() => { 
            

            wsCon.setHistoryLoadingState(WsHistoryLoadingState.LOADING)
            wsCon.getHistory()
    
    
            let pollUntilPromise = new PollUntil();
            pollUntilPromise
                .stopAfter(180000) 
                .tryEvery(200) 
                .execute(() => {
                    return new Promise((resolve, reject) => {
                        if (wsCon.getHistoryLoadingState() == WsHistoryLoadingState.NONE) {
                            return resolve(true); 
                        }
                        reject(false);
                    })
                })
                .then(async() => { 
                
                    
                    const historicalTxns = await getWalletHistory(uuid, "")
                    renderTxnOverview(historicalTxns)                  
                    syncStatusSpinner.classList.add("d-none")

                })
                .catch(err => console.error(err));

            
        })
        .catch(err => console.error(err));

        
}

function renderTxnOverview(historicalTxns: HistoricalTxn[]){
    historicalTxnDiv.innerHTML = ""
    
    const checkFilterFilterSfx = document.getElementById('history_filter_sfx') as HTMLInputElement
    const checkFilterFilterStake = document.getElementById('history_filter_stake') as HTMLInputElement
    const checkFilterFilterAccount = document.getElementById('history_filter_accounts') as HTMLInputElement
    const checkFilterFilterOffers = document.getElementById('history_filter_offers') as HTMLInputElement
    const checkFilterFilterFeedback = document.getElementById('history_filter_feedback') as HTMLInputElement
    const checkFilterFilterOrders = document.getElementById('history_filter_orders') as HTMLInputElement
    const checkFilterFilterPurchases = document.getElementById('history_filter_purchases') as HTMLInputElement

    let filter:SensibleTxnType[] = []
    
    filter.push(SensibleTxnType.UNKNOWN)

    if(checkFilterFilterSfx.checked){
        filter.push(SensibleTxnType.SFX)
        filter.push(SensibleTxnType.SFT)
    }

    if(checkFilterFilterStake.checked){
        filter.push(SensibleTxnType.STAKE)
        filter.push(SensibleTxnType.UNSTAKE)
    }

    if(checkFilterFilterAccount.checked){
        filter.push(SensibleTxnType.NEW_ACCOUNT)
        filter.push(SensibleTxnType.EDIT_ACCOUNT)
    }

    if(checkFilterFilterOffers.checked){
        filter.push(SensibleTxnType.NEW_OFFER)
        filter.push(SensibleTxnType.EDIT_OFFER)
    }

    if(checkFilterFilterFeedback.checked){
        filter.push(SensibleTxnType.FEEDBACK)
    }

    if(checkFilterFilterOrders.checked){
        filter.push(SensibleTxnType.ORDER)
    }

    if(checkFilterFilterPurchases.checked){
        filter.push(SensibleTxnType.PURCHASE)
    }
        

    for (const txn of historicalTxns){
        let txnRow = document.createElement('div')
        let txnRowData: string[] = []

        if(!filter.includes(txn.type)){
            continue
        }


        txnRowData.push(`<div class="card border mb-3">`)
    
            txnRowData.push(`<div class="card-body">`)
                txnRowData.push(`<div class="row text_small">`)
                    txnRowData.push(`<div class="col-2"><b>Date/Time:</b><br>${convertTimestampToDate(txn.timestamp)}</div>`)
                    txnRowData.push(`<div class="col-5 text-break"><b>Txn Id:</b><br><span class="text_xsmall"><a href="${explorerAddress}/tx/${txn.txnId}" target="_blank">${txn.txnId}</a></span></div>`)
                    txnRowData.push(`<div class="col"><b>Direction:</b><br>${txn.direction}</div>`)
                    txnRowData.push(`<div class="col"><b>Type:</b><br>${txn.type}</div>`)
                    txnRowData.push(`<div class="col"><b>Block:</b><br><a href="${explorerAddress}/block/${txn.blockHeight}" target="_blank">${txn.blockHeight}</a></div>`)
                    

                txnRowData.push(`</div>`)
                txnRowData.push(`<div class="row text_small mt-2">`)
                    txnRowData.push(`<div class="col-2"><b>Pending:</b><br>${txn.pending}</div>`)
                    txnRowData.push(`<div class="col-5"><b>Payment Id:</b><br><span class="text_xsmall">${txn.paymentId == "0000000000000000" ? "none" : txn.paymentId  }<span></div>`)
                    txnRowData.push(`<div class="col"><b>SFT:</b><br>${roundToTenDecimals(toNormalUnits(txn.tokenAmount))} SFT</div>`)
                    txnRowData.push(`<div class="col"><b>SFX:</b><br>${roundToTenDecimals(toNormalUnits(txn.cashAmount))} SFX</div>`)
                    txnRowData.push(`<div class="col"><b>Confirmations:</b><br>${txn.confirmations}</div>`)
            
                txnRowData.push(`</div>`)

            txnRowData.push(`</div>`)
        txnRowData.push(`</div>`)

        historicalTxnDiv?.appendChild(txnRow)
        txnRow.outerHTML = txnRowData.join('')
    }

}

async function hardRescan(uuid: string){

    if(formHardRescanWallet){
        formHardRescanWallet.setAttribute('data-wallet', uuid)
    }

    if(startRescanWalletButton){
        startRescanWalletButton.innerHTML = 'Start Rescan!'
        startRescanWalletButton.removeAttribute("disabled")
    }

    if(confirmationModalText && confirmationModalButton){
        confirmationModalText.innerHTML = `Are you sure you want to perform a hard rescan on this wallet? <br><br>It might take a while!<br><br>`
        confirmationModalButton?.setAttribute("data-return-modal", "hardRescanModal")
        confirmationModal.show();
    }
    
}


async function generatePaymentId(){
    const paymentId = await getGeneratedPaymentId()
    if(!paymentId){
        showToast("Error", "Something went wrong while trying to generate a payment ID, try again later", 15000)
    } else {
        const alertModalText = document.getElementById('alert_modal_text')
        if(alertModalText){
            alertModalText.innerHTML = `Generated payment ID:<br><br>${paymentId.paymentId}`
            alertModal.show();
        }
    }
}


async function bindFunctions() {

    const collapseToggles = document.querySelectorAll("button[data-function=collapse]")
    if(collapseToggles){
        collapseToggles.forEach((collapseToggle)=>{
            collapseToggle.addEventListener('click', function(){ 
                const toggleTarget = document.querySelector(collapseToggle.getAttribute('data-bs-target') || "") 
                if(toggleTarget){
                    new bootstrap.Collapse(toggleTarget).toggle()
                    if( new Array(...collapseToggle.classList).includes('collapsed')){
                        collapseToggle.classList.remove("collapsed")
                    } else {
                        collapseToggle.classList.add("collapsed")
                    }
                }


            }, false)
        })
    }

    const syncIcons = document.querySelectorAll("i[data-function=sync]")
    if(syncIcons){
        syncIcons.forEach((syncIcon)=>{
            syncIcon.addEventListener('click', function(e){e.stopPropagation(); connect(syncIcon.getAttribute("data-wallet"));}, false)
        })
    }

    const stopIcons = document.querySelectorAll("i[data-function=stop]")
    if(stopIcons){
        stopIcons.forEach((stopIcon)=>{
            stopIcon.addEventListener('click', function(e){e.stopPropagation(); disconnect(stopIcon.getAttribute("data-wallet"));}, false)
        })
    }

    const sendButtons = document.querySelectorAll("button[data-function=send]")
    if(sendButtons){
        sendButtons.forEach((sendButton)=>{
            sendButton.addEventListener('click', function(){ showSendModal(sendButton.getAttribute("data-wallet") || "", sendButton.getAttribute("data-address"), sendButton.getAttribute("data-asset") || "");}, false)
        })
    }

    const stakingButtons = document.querySelectorAll("button[data-function=staking]")
    if(stakingButtons){
        stakingButtons.forEach((stakingButton)=>{
            stakingButton.addEventListener('click', function(){ showStakingModal(stakingButton.getAttribute("data-wallet") || "");}, false)
        })
    }

    const showKeyIcons = document.querySelectorAll("i[data-function=show_keys]")
    if(showKeyIcons){
        showKeyIcons.forEach((showKeyIcon)=>{
            showKeyIcon.addEventListener('click', function(e){e.stopPropagation(); showKeys(showKeyIcon.getAttribute("data-wallet") || "");}, false)
        })
    }

    const hardRescanIcons = document.querySelectorAll("i[data-function=hard_rescan]")
    if(hardRescanIcons){
        hardRescanIcons.forEach((hardRescanIcon)=>{
            hardRescanIcon.addEventListener('click', function(e){e.stopPropagation(); hardRescan(hardRescanIcon.getAttribute("data-wallet") || "");}, false)
        })
    }

    const showAccountKeyIcons = document.querySelectorAll("i[data-function=show_account_keys]")
    if(showAccountKeyIcons){
        showAccountKeyIcons.forEach((showAccountKeyIcon)=>{
            showAccountKeyIcon.addEventListener('click', function(){ showAccountKeys(showAccountKeyIcon.getAttribute("data-account") || "");}, false)
        })
    }

    const showHistoryIcons = document.querySelectorAll("i[data-function=show_history]")
    if(showHistoryIcons){
        showHistoryIcons.forEach((showHistoryIcon)=>{
            showHistoryIcon.addEventListener('click', function(e){e.stopPropagation(); showHistoryModal(showHistoryIcon.getAttribute("data-wallet") || "");}, false)
        })
    }

    const generatePaymentIcons = document.querySelectorAll("i[data-function=gen_payment_id]")
    if(generatePaymentIcons){
        generatePaymentIcons.forEach((generatePaymentIcon)=>{
            generatePaymentIcon.addEventListener('click', function(e){e.stopPropagation(); generatePaymentId();}, false)
        })
    }

    const editLabelIcons = document.querySelectorAll("i[data-function=edit_label]")
    if(editLabelIcons){
        editLabelIcons.forEach((editLabelIcon)=>{
            editLabelIcon.addEventListener('click', function(e){e.stopPropagation(); showEditLabelModal(editLabelIcon.getAttribute("data-wallet") || "");}, false)
        })
    }


    const editAccountIcons = document.querySelectorAll("i[data-function=edit_account]")
    if(editAccountIcons){
        editAccountIcons.forEach((editAccountIcon)=>{
            editAccountIcon.addEventListener('click', function(){ showEditAccountModal(editAccountIcon.getAttribute("data-account") || "", editAccountIcon.getAttribute("data-wallet") || "");}, false)
        })
    }

    const deleteAccountIcons = document.querySelectorAll("i[data-function=delete_account]")
    if(deleteAccountIcons){
        deleteAccountIcons.forEach((deleteAccountIcon)=>{
            deleteAccountIcon.addEventListener('click', function(){ showRemoveAccountModal(deleteAccountIcon.getAttribute("data-account") || "", deleteAccountIcon.getAttribute("data-wallet") || "");}, false)
        })
    }

    const createWalletButton = document.getElementById('button_create_wallet')
    if(createWalletButton){
        createWalletButton.addEventListener('click', function(){ showCreateWalletModal() ;}, false)
    }

    const createWalletFromKeysButton = document.getElementById('button_create_wallet_from_keys')
    if(createWalletFromKeysButton){
        createWalletFromKeysButton.addEventListener('click', function(){ showCreateWalletFromKeysModal() ;}, false)
    }

    const createAccountButtons = document.querySelectorAll("button[data-function=create_account]")
    if(createAccountButtons){
        createAccountButtons.forEach((createAccountButton)=>{
            createAccountButton.addEventListener('click', function(){ showCreateAccountModal(createAccountButton.getAttribute("data-wallet") || "");}, false)
        })
    }

    const restoreAccountButtons = document.querySelectorAll("button[data-function=restore_account]")
    if(restoreAccountButtons){
        restoreAccountButtons.forEach((restoreAccountButton)=>{
            restoreAccountButton.addEventListener('click', function(){ showRestoreAccountModal(restoreAccountButton.getAttribute("data-wallet") || "");}, false)
        })
    }

    return true

}

async function initWallets(){
    if(containerWallets === undefined || containerWallets === null){
        return 
    }

    await clearWallets()
    await displayWallets()
    await bindFunctions()    
}

initWallets()





