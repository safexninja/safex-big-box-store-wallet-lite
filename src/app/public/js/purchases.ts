

import { getOpenPurchases, getClosedPurchases, OpenPurchase, ClosedPurchase, purchaseRate, getDaemonHeight, getUserSettings } from './apicalls'
import { convertTimestampToDate } from '../../../common/utils/dates'
import { showMessageAndManageModal } from './managing'
import { newLineToBreak, removeHTML } from './utils'
import { TxnStatus } from '../../../common/enums/txns'
import * as bootstrap from 'bootstrap'
import { clearAllBackDrops, confirmationModal, ratePurchaseModal } from './modals'
import { PollUntil } from 'poll-until-promise'
import { WalletWsConnectionHandler, websocketConnectionManager, WsConnectionState } from './websocket'
import { explorerAddress } from './index'


const containerOpenPurchases = document.getElementById('container_open_purchases') as HTMLDivElement
const containerAwaitingPurchases = document.getElementById('container_awaiting_purchases') as HTMLDivElement
const containerDeliveredPurchases = document.getElementById('container_delivered_purchases') as HTMLDivElement
const containerClosedPurchases = document.getElementById('container_closed_purchases') as HTMLDivElement
const buttonLoadClosedPurchases = document.getElementById('btn_load_closed_purchases') as HTMLButtonElement
const navIconPurchases = document.getElementById('nav_icon_purchases') as HTMLElement
const purchaseRefresh = document.getElementById('purchase_refresh') as HTMLElement
const purchaseAutoRefresh = document.getElementById('purchase_auto_refresh') as HTMLInputElement

// rate / feedback form
const formRatePurchase = document.getElementById('form_rate_purchase') as HTMLFormElement
const formFieldsRatePurchase = document.getElementById('form_rate_purchase_fields') as HTMLFormElement
const inputRatePurchaseComments = document.getElementById('input_rate_purchase_feedback_comment') as HTMLInputElement
const inputRatePurchaseStars = document.getElementById('input_rate_purchase_feedback_stars') as HTMLInputElement
const inputRatePurchaseMixin = document.getElementById('input_rate_purchase_mixin') as HTMLInputElement
const confirmRatePurchaseButton = document.getElementById('confirmRatePurchase') as HTMLButtonElement
const buttonRatePurchase = document.getElementById('btn_rate_purchase') as HTMLButtonElement

// other elements, buttons, etc
const confirmationModalText = document.getElementById("confirmation_modal_text")
const confirmationModalButton = document.getElementById("confirmation_modal_button")

enum PurchaseCardStyle {
    OPEN = "warning",
    AWAITING = "info",
    DELIVERED = "success",
    CLOSED = "dark"
}

var currentBlockHeight: number;


if(buttonLoadClosedPurchases){
    buttonLoadClosedPurchases.addEventListener('click', async (e) => {
        e.preventDefault()
        await displayClosedPurchases()
        await bindFunctionsClosed() 
    })
}

async function displayOpenPurchases(): Promise <boolean> {

    currentBlockHeight = (await getDaemonHeight()).height || 0
    
    navIconPurchases.classList.remove('nav_icon_unread')

    const { open, awaiting, delivered } = await getOpenPurchases()

    for(const purchase of open){
        let card = document.createElement('div')
        containerOpenPurchases.appendChild(card)
        card.outerHTML = createCard(purchase, PurchaseCardStyle.OPEN)
    }

    for(const purchase of awaiting){
        let card = document.createElement('div')
        containerAwaitingPurchases.appendChild(card)
        card.outerHTML = createCard(purchase, PurchaseCardStyle.AWAITING)
    }

    for(const purchase of delivered){
        let card = document.createElement('div')
        containerDeliveredPurchases.appendChild(card)
        card.outerHTML = createCard(purchase, PurchaseCardStyle.DELIVERED)
    }

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
    
    return true
}

async function displayClosedPurchases(): Promise <boolean> {

    currentBlockHeight = (await getDaemonHeight()).height || 0

    containerClosedPurchases.innerHTML = ""
    const closedPurchases = await getClosedPurchases()

    for(const purchase of closedPurchases){
        let card = document.createElement('div')
        containerClosedPurchases.appendChild(card)
        card.outerHTML = createClosedCard(purchase, PurchaseCardStyle.CLOSED)
    }

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

    return true
}

function createCard (purchase: OpenPurchase, styles: PurchaseCardStyle){

    let card: string[] = []
    let newMessagesBadge = ""
    if(purchase.hasNewMessages){
        
        newMessagesBadge = '<span class="badge bg-danger mt-1 float-end">New</span>'
        navIconPurchases.classList.add('nav_icon_unread')

    }
    card.push(`<div class="card border-${styles} mb-3">`)
        card.push(`<div class="card-header pastel-bg-${styles} ">${removeHTML(purchase.title)}`)
        
        card.push(`<i class="bx bxs-detail fs-3 walleticons float-end" style="vertical-align:middle;" data-function="manage_purchase" data-type="purchase" data-id="${purchase.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Progress and Chat"></i>`)
        card.push(`${newMessagesBadge}`)
        if(purchase.txnStatus == TxnStatus.CONFIRMED){ 
            if(!purchase.rated && purchase.blockHeight && purchase.blockHeight < (currentBlockHeight - 1000)){
                card.push(`<i class="bx bxs-star fs-3 walleticons float-end unrated me-3" style="vertical-align:middle;" data-function="rate_purchase" data-id="${purchase.uuid}" data-wallet="${purchase.wallet}" data-offer-id="${purchase.offerId}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Give feedback"></i>`)
            } 
        }
        
        card.push(`</div>`)

            card.push(`<div class="card-body">`)
             card.push(`<div class="row text_small">`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span><b>Store: </b><span class="text-danger">${purchase.store}</span></span></div>`)
                    card.push(`<div class="row"><span><b>Seller: </b>${purchase.seller}</span></div>`)
                    card.push(`<div class="row"><span><b>Quantity: </b>${purchase.quantity || ""}</span></div>`)
                    card.push(`<div class="row"><span><b>Price: </b>${purchase.price || ""} SFX</span></div>`)
                    card.push(`<div class="row"><span><b>Communication: </b>${purchase.communicationStatus}</span></div>`)
                card.push(`</div>`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span class="text-nowrap"><b>Offer Id:</b> ${purchase.offerId}</span></div>`)
                    card.push(`<div class="row"><span class="text-nowrap"><b>Txn:</b> <a href="${explorerAddress}/tx/${purchase.txn}" target="_blank">${purchase.txn}</a></span></div>`)

                    let purchaseDateTime = ""
                    try {
                        if(purchase.timestamp){
                            purchaseDateTime = convertTimestampToDate(purchase.timestamp)
                        }
                    } catch (error){
                        // dont display timestamp
                    }
                   
                    card.push(`<div class="row"><span class="text-nowrap"><b>Purchased:</b> ${purchaseDateTime}</span></div>`)
                   
                    if(purchase.rated && purchase.feedbackStars){
                        card.push(`<div class="row"><span class="text-nowrap"><b>Your feedback:</b> `)
                        for(let i=1; i<= purchase.feedbackStars; i++){
                            card.push(`<i class="bx bxs-star rated fs-5" style="vertical-align:middle;" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="${purchase.feedbackComment}"></i>`)
                        }
                        card.push(`</span></div>`)
                    }
                    
        
                
                card.push(`</div>`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span><b>Txn Status:</b> ${purchase.txnStatus}</span></div>`)

                    let blockHeight = 0
                    if(purchase.txnStatus == TxnStatus.CONFIRMED && purchase.blockHeight){
                        blockHeight = purchase.blockHeight
                    } 
                    
                    card.push(`<div class="row"><span><b>Block height:</b> ${blockHeight}</span></div>`)
                    let blockDateTime = ""
                    try{
                        if(purchase.blockTimestamp  != undefined && purchase.blockTimestamp > 0){
                            blockDateTime = convertTimestampToDate( purchase.blockTimestamp)
                        }
                    } catch (error){
                        // dont display timestamp
                    }

                    let confirmations = 0
                    if(purchase.txnStatus == TxnStatus.CONFIRMED && purchase.blockConfirmations ){
                        confirmations = purchase.blockConfirmations
                    }
                    
                    card.push(`<div class="row"><span><b>Block timestamp:</b> ${blockDateTime}</span></div>`)
                    card.push(`<div class="row"><span><b>Block confirmations:</b> ${confirmations}/10</span></div>`)
                card.push(`</div>`)

             card.push(`</div>`)

        card.push(`</div>`)
    card.push(`</div>`)

    return card.join('')
}


function createClosedCard (purchase: ClosedPurchase, styles: PurchaseCardStyle){

    let card: string[] = []
    card.push(`<div class="card border-${styles} mb-3">`)
       card.push(`<div class="card-header pastel-bg-${styles} ">${removeHTML(purchase.title)}`)
        
        card.push(`<i class="bx bxs-detail fs-3 walleticons float-end" style="vertical-align:middle;" data-function="manage_closed_purchase" data-type="purchase" data-id="${purchase.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Progress and Chat"></i>`)

        if(!purchase.rated && purchase.wallet && purchase.wallet.length > 0){
            card.push(`<i class="bx bxs-star fs-3 walleticons float-end unrated" style="vertical-align:middle;" data-function="rate_purchase" data-id="${purchase.uuid}" data-wallet="${purchase.wallet}" data-offer-id="${purchase.offerId}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Give feedback"></i>`)
        } else{
            if(purchase.feedbackStars){
                for(let i=1; i<= purchase.feedbackStars; i++){
                    card.push(`<i class="bx bxs-star fs-3 walleticons float-end rated" style="vertical-align:middle;" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="${purchase.feedbackComment}"></i>`)
                }
            }
        } 
        card.push(`</div>`)

            card.push(`<div class="card-body">`)
             card.push(`<div class="row text_small">`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span><b>Store: </b><span class="text-danger">${purchase.store}</span></span></div>`)
                    card.push(`<div class="row"><span><b>Seller: </b>${purchase.seller}</span></div>`)
                    card.push(`<div class="row"><span><b>Quantity: </b>${purchase.quantity || ""}</span></div>`)
                    card.push(`<div class="row"><span><b>Price: </b>${purchase.price || ""} SFX</span></div>`)
                card.push(`</div>`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span class="text-nowrap"><b>Offer Id: </b>${purchase.offerId}</span></div>`)
                    card.push(`<div class="row"><span class="text-nowrap"><b>Txn: </b><a href="${explorerAddress}/tx/${purchase.txn}" target="_blank">${purchase.txn}</a></span></div>`)
                    card.push(`<div class="row"><span class="text-nowrap"><b>Purchased: </b>${convertTimestampToDate( purchase.timestamp)}</span></div>`)
                
                card.push(`</div>`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span><b>Block height: </b>${purchase.blockHeight || ""}</span></div>`)
                    card.push(`<div class="row"><span><b>Block timestamp: </b>${purchase.blockTimestamp ? convertTimestampToDate(purchase.blockTimestamp) : ""}</span></div>`)
                card.push(`</div>`)

             card.push(`</div>`)

        card.push(`</div>`)
    card.push(`</div>`)

    return card.join('')
}


if(confirmRatePurchaseButton){
    confirmRatePurchaseButton.addEventListener('click', async (e) => {
        e.preventDefault()
        
        formRatePurchase.classList.add('was-validated')
        if(confirmationModalText && confirmationModalButton){
            confirmationModalText.innerHTML = `Are you sure you want to give the following feedback: ?<br><br> <b>Stars:</b> ${inputRatePurchaseStars.value}<br><br> <b>Comment:</b><br>${newLineToBreak(removeHTML(inputRatePurchaseComments.value))} <br><br> <b>Mixin:</b>${inputRatePurchaseMixin.value}`
            confirmationModalButton?.setAttribute("data-return-modal", "ratePurchaseModal");
        }
        ratePurchaseModal.hide();
        confirmationModal.show();    
    })
}

if(formRatePurchase){
    formRatePurchase.addEventListener('submit', async (e) => {
        e.preventDefault()

            const purchaseUuid = formRatePurchase.getAttribute("data-id")
            const walletUuid = formRatePurchase.getAttribute("data-wallet")
            const offerUuid = formRatePurchase.getAttribute("data-offer-id")
                    
            if(inputRatePurchaseComments.value.length == 0){
                inputRatePurchaseComments.value = "none"
            }

            if(purchaseUuid && walletUuid && offerUuid){
                if(buttonRatePurchase){
                    buttonRatePurchase.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
                    buttonRatePurchase.setAttribute("disabled", '')
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
                .then(async () => { 

                    wsCon.giveFeedback(offerUuid, parseInt(inputRatePurchaseStars.value), removeHTML(inputRatePurchaseComments.value), parseInt(inputRatePurchaseMixin.value))
                    ratePurchaseModal.hide()
                    clearAllBackDrops()
                    await purchaseRate(purchaseUuid, parseInt(inputRatePurchaseStars.value),  inputRatePurchaseComments.value)
                    initPurchases()                    
                })
                .catch(err => console.error(err));
                
            }            
    })

}

export async function showRatePurchaseModal(wallet: string, id: string, offerId: string){

    confirmRatePurchaseButton.classList.remove('d-none')
    buttonRatePurchase.classList.add('d-none')
    buttonRatePurchase.innerHTML = 'Give Feedback'
    buttonRatePurchase.removeAttribute('disabled')

    formRatePurchase.classList.remove('was-validated')
    formRatePurchase.setAttribute("data-id", id)
    formRatePurchase.setAttribute("data-wallet", wallet)
    formRatePurchase.setAttribute("data-offer-id", offerId)
    formRatePurchase.reset()

    ratePurchaseModal.show()
     
 }


async function bindFunctions() {
    const manageIcons = document.querySelectorAll("i[data-function=manage_purchase]")
    if(manageIcons){
        manageIcons.forEach((manageIcon)=>{
            manageIcon.addEventListener('click', function(){ showMessageAndManageModal(manageIcon.getAttribute("data-type") || "", manageIcon.getAttribute("data-id") || "");}, false)
        })
    }


    const rateIcons = document.querySelectorAll("i[data-function=rate_purchase]")
    if(rateIcons){
        rateIcons.forEach((rateIcon)=>{
            rateIcon.addEventListener('click', function(){ showRatePurchaseModal(rateIcon.getAttribute("data-wallet") || "", rateIcon.getAttribute("data-id") || "", rateIcon.getAttribute("data-offer-id") || "");}, false)
        })
    }


}

async function bindFunctionsClosed() {
    const manageIcons = document.querySelectorAll("i[data-function=manage_closed_purchase]")
    if(manageIcons){
        manageIcons.forEach((manageIcon)=>{
            manageIcon.addEventListener('click', function(){ showMessageAndManageModal(manageIcon.getAttribute("data-type") || "", manageIcon.getAttribute("data-id") || "");}, false)
        })
    }


    const rateIcons = document.querySelectorAll("i[data-function=rate_purchase]")
    if(rateIcons){
        rateIcons.forEach((rateIcon)=>{
            rateIcon.addEventListener('click', function(){ showRatePurchaseModal(rateIcon.getAttribute("data-wallet") || "", rateIcon.getAttribute("data-id") || "", rateIcon.getAttribute("data-offer-id") || "");}, false)
        })
    }
}

export async function initPurchases(){
    containerOpenPurchases.innerHTML = ""
    containerAwaitingPurchases.innerHTML = ""
    containerDeliveredPurchases.innerHTML = ""
    await displayOpenPurchases()
    await bindFunctions()
}

initPurchases()

setTimeout(()=>{
    initPurchases()
}, 10000)


setInterval(async ()=>{
    if(purchaseAutoRefresh.checked == true){
        initPurchases()
    }    
}, 60000)

if(purchaseRefresh){
    purchaseRefresh.addEventListener('click', async (e) => { 
        e.preventDefault()
        initPurchases()
    })
}