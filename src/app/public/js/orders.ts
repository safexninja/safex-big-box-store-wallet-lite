

import { getOpenOrders, OpenOrder, getClosedOrders, ClosedOrder, getWallets, setOrderValidation } from './apicalls'
import { convertTimestampToDate } from '../../../common/utils/dates'
import { PollUntil } from 'poll-until-promise'
import { WalletWsConnectionHandler, websocketConnectionManager, WsCheckTxnProofState, WsConnectionState } from './websocket'
import { toNormalUnits } from '../../../common/utils/units'
import { showMessageAndManageModal } from './managing'
import { TxnStatus } from '../../../common/enums/txns'
import { OrderStatus } from '../../../common/enums/orders'
import * as bootstrap from 'bootstrap'


const containerNewOrders = document.getElementById('container_new_orders') as HTMLDivElement
const containerShippedOrders = document.getElementById('container_shipped_orders') as HTMLDivElement
const containerDeliveredOrders = document.getElementById('container_delivered_orders') as HTMLDivElement
const containerClosedOrders = document.getElementById('container_closed_orders') as HTMLDivElement
const buttonLoadClosedOrders = document.getElementById('btn_load_closed_orders') as HTMLButtonElement
const navIconOrders = document.getElementById('nav_icon_orders') as HTMLElement
const orderRefresh = document.getElementById('order_refresh') as HTMLElement
const orderAutoRefresh = document.getElementById('order_auto_refresh') as HTMLInputElement


enum OrderCardStyle {
    NEW = "warning",
    SHIPPED = "info",
    DELIVERED = "success",
    CLOSED = "dark"
}

interface TxnProofValidation {
    receivedCash: number,
    valid: boolean
}

if(buttonLoadClosedOrders){
    buttonLoadClosedOrders.addEventListener('click', async (e) => {
        e.preventDefault()
        await displayClosedOrders()
        await bindFunctionsClosed() 
    })
}

async function displayOpenOrders(): Promise <boolean>  {
    navIconOrders.classList.remove('nav_icon_unread')

    const orders = await getOpenOrders()

    for(const order of orders.new){
        let card = document.createElement('div')
        containerNewOrders.appendChild(card)
        card.outerHTML = createCard(order, OrderCardStyle.NEW)
        if(order.blockConfirmations == 10 && order.txnProofSignatureValid == undefined){
            await checkTxProof(order)
        }
    }

    for(const order of orders.shipped){
        let card = document.createElement('div')
        containerShippedOrders.appendChild(card)
        card.outerHTML = createCard(order, OrderCardStyle.SHIPPED)
    }

    for(const order of orders.delivered){
        let card = document.createElement('div')
        containerDeliveredOrders.appendChild(card)
        card.outerHTML = createCard(order, OrderCardStyle.DELIVERED)
    }

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

    return true
}

async function checkTxProof(order: OpenOrder): Promise<boolean>{

    const txProofStrippedQuotes = order.txnProofSignature.replace(/\"/g, '')
    const wallets = await getWallets()
    const walletCheck = wallets.find(wallet=> wallet.address == order.address)

    if(walletCheck){

        let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(walletCheck?.uuid).wsConnection

        let pollUntilPromise = new PollUntil();
        pollUntilPromise
            .stopAfter(180000)
            .tryEvery(500)
            .execute(() => {
                return new Promise((resolve, reject) => {
                    if ([WsConnectionState.CLOSABLE].includes(wsCon.getState()) 
                            && wsCon.getCheckTxnProofState() == WsCheckTxnProofState.NONE) {
                        return resolve(true); 
                    }
                    reject(false);
                })
            })
            .then(() => { 
                try {
                    wsCon.setCheckTxnProofState(WsCheckTxnProofState.PROCESSING)
                    wsCon.checkTxtProof(
                        order.txn,
                        txProofStrippedQuotes,
                        order.offerId)
                } catch (err){
                    // do nothing
                }
                
            })
            .catch(err => console.error(err));
        
            
        pollUntilPromise = new PollUntil();
        pollUntilPromise
            .stopAfter(40000)
            .tryEvery(500)
            .execute(() => {
                return new Promise((resolve, reject) => {
                    if(wsCon.getCheckTxnProofState() == WsCheckTxnProofState.NONE){
                        return resolve(true);
                    }
                    reject(false);
                })
            })
            .then(async () => { 
                try{
                    const txnProofValidation = JSON.parse(wsCon.getTxProofResult()) as TxnProofValidation
                    await setOrderValidation(order.uuid, toNormalUnits(txnProofValidation.receivedCash), txnProofValidation.valid)
                } catch (error) {
                    // do nothing
                }              
        
            })
            .catch(err => console.error(err));        

    }
   
    return true
}

async function displayClosedOrders(): Promise <boolean> {

    containerClosedOrders.innerHTML = ""
    const closedOrders = await getClosedOrders()

    closedOrders.forEach((order)=>{
        let card = document.createElement('div')
        containerClosedOrders.appendChild(card)
        card.outerHTML = createClosedCard(order, OrderCardStyle.CLOSED)
    })

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

    return true
}

function createCard (order: OpenOrder, styles: OrderCardStyle){

    let card: string[] = []

    let newMessagesBadge = ""
    if(order.hasNewMessages){
        newMessagesBadge = '<span class="badge bg-danger mt-1 float-end">New</span>'
        navIconOrders.classList.add('nav_icon_unread')

    }

    card.push(`<div class="card border-${styles} mb-3">`)
        card.push(`<div class="card-header pastel-bg-${styles}">${order.title} <i class="bx bxs-detail fs-3 walleticons float-end" style="vertical-align:middle;" data-function="manage_order" data-type="order" data-id="${order.uuid}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Progress and Chat"></i>${newMessagesBadge}</div>`)
            card.push(`<div class="card-body">`)
             card.push(`<div class="row text_small">`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span><b>Store: </b><span class="text-danger">${order.store}</span></span></div>`)
                    card.push(`<div class="row"><span><b>Account: </b> ${order.account}</span></div>`)
                    card.push(`<div class="row"><span><b>Quantity: </b> ${order.quantity || ""}</span></div>`)
                    card.push(`<div class="row"><span><b>Price: </b> ${order.price || ""} SFX</span></div>`)
                    if(!order.receivedCash || order.receivedCash == 0){
                        card.push(`<div class="row"><span><b>Received Cash: </b>awaiting validation</span></div>`)
                    } else {
                        card.push(`<div class="row"><span><b>Received Cash: </b>${order.receivedCash} SFX</span></div>`)
                    }
                    card.push(`<div class="row"><span><b>Communication: </b>${order.communicationStatus}</span></div>`)
                card.push(`</div>`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span class="text-nowrap"><b>Offer Id: </b>${order.offerId}</span></div>`)
                    card.push(`<div class="row"><span class="text-nowrap"><b>Txn: </b><a href="/tx/${order.txn}" target="_blank">${order.txn}</a></span></div>`)
                    let orderDateTime = ""
                    try{
                        if(order.timestamp){
                            orderDateTime = convertTimestampToDate(order.timestamp)
                        }
                    } catch (error){
                        // dont display timestamp
                    }
                    
                    card.push(`<div class="row"><span class="text-nowrap"><b>Received: </b>${orderDateTime}</span></div>`)
                
                card.push(`</div>`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span><b>Txn Status: </b>${order.txnStatus}</span></div>`)

                    let blockHeight = 0
                    if(order.txnStatus == TxnStatus.CONFIRMED && order.blockHeight){
                        blockHeight = order.blockHeight
                    } 

                    card.push(`<div class="row"><span><b>Block height: </b>${blockHeight}</span></div>`)
                    let blockDateTime = ""

                    try {
                        if(order.blockTimestamp != undefined && order.blockTimestamp > 0){
                            blockDateTime = convertTimestampToDate(order.blockTimestamp)
                        }
                    } catch (error){
                        // dont display timestamp
                    }

                    let confirmations = 0
                    if(order.txnStatus == TxnStatus.CONFIRMED && order.blockConfirmations){
                        confirmations = order.blockConfirmations 
                    }
                    
                    card.push(`<div class="row"><span><b>Block timestamp: </b>${blockDateTime}</span></div>`)
                    card.push(`<div class="row"><span><b>Block confirmations: </b>${confirmations}/10</span></div>`)

                    if(order.status == OrderStatus.NEW){
                        let validationStatus = "awaiting ..."
                        if(order.txnProofSignatureValid == true){
                            validationStatus = "<i class='bx bx-check-circle icon_xsmall ms-1 mb-1' style='color: #08aa47; vertical-align: middle;' ></i>"
                        }
                        if(order.txnProofSignatureValid == false){
                            validationStatus = "<i class='bx bx-error-circle icon_xsmall ms-1 mb-1' style='color: #df0000; vertical-align: middle;'></i>"
                        }
                        card.push(`<div class="row"><span><b>Validation: </b>${validationStatus}</span></div>`)
                    }

                card.push(`</div>`)

             card.push(`</div>`)

        card.push(`</div>`)
    card.push(`</div>`)

    return card.join('')
}

function createClosedCard (order: ClosedOrder, styles: OrderCardStyle){

    let card: string[] = []
    card.push(`<div class="card border-${styles} mb-3">`)
        card.push(`<div class="card-header pastel-bg-${styles} text-white">${order.title} <i class="bx bxs-detail fs-3 walleticons float-end" style="vertical-align:middle;" data-function="manage_closed_order" data-type="order" data-id="${order.uuid}"  data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Progress and Chat"></i></div>`)
            card.push(`<div class="card-body">`)
             card.push(`<div class="row text_small">`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span><b>Store:</b> ${order.store}</span></div>`)
                    card.push(`<div class="row"><span><b>Account:</b> ${order.account}</span></div>`)
                    card.push(`<div class="row"><span><b>Quantity:</b> ${order.quantity || ""}</span></div>`)

                    if(!order.receivedCash || order.receivedCash == 0){
                        card.push(`<div class="row"><span><b>Received Cash:</b> awaiting validation</span></div>`)
                    } else {
                        card.push(`<div class="row"><span><b>Received Cash:</b> ${order.receivedCash} SFX</span></div>`)
                    }

                    
                card.push(`</div>`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span class="text-nowrap"><b>Offer Id:</b> ${order.offerId}</span></div>`)
                    card.push(`<div class="row"><span class="text-nowrap"><b>Txn:</b> <a href="/tx/${order.txn}" target="_blank">${order.txn}</a></span></div>`)
                    card.push(`<div class="row"><span class="text-nowrap"><b>Received:</b> ${convertTimestampToDate( order.timestamp)}</span></div>`)
                
                card.push(`</div>`)

                card.push(`<div class="col">`)
                    card.push(`<div class="row"><span><b>Block height:</b> ${order.blockHeight || ""}</span></div>`)
                    card.push(`<div class="row"><span><b>Block timestamp:</b> ${order.blockTimestamp ? convertTimestampToDate(order.blockTimestamp) : ""}</span></div>`)
  
                card.push(`</div>`)

             card.push(`</div>`)

        card.push(`</div>`)
    card.push(`</div>`)

    return card.join('')
}

async function bindFunctions() {
    const manageIcons = document.querySelectorAll("i[data-function=manage_order]")
    if(manageIcons){
        manageIcons.forEach((manageIcon)=>{
            manageIcon.addEventListener('click', function(){ showMessageAndManageModal(manageIcon.getAttribute("data-type") || "", manageIcon.getAttribute("data-id") || "");}, false)
        })
    }
}

async function bindFunctionsClosed() {
    const manageIcons = document.querySelectorAll("i[data-function=manage_closed_order]")
    if(manageIcons){
        manageIcons.forEach((manageIcon)=>{
            manageIcon.addEventListener('click', function(){ showMessageAndManageModal(manageIcon.getAttribute("data-type") || "", manageIcon.getAttribute("data-id") || "");}, false)
        })
    }
}

export async function initOrders(){
    containerNewOrders.innerHTML = ""
    containerShippedOrders.innerHTML = ""
    containerDeliveredOrders.innerHTML = ""
    await displayOpenOrders()
    await bindFunctions()
}

initOrders()

setTimeout(()=>{
    initOrders()
}, 10000)

setInterval(async ()=>{
    if(orderAutoRefresh.checked == true){
        initOrders()
    }
}, 60000)

if(orderRefresh){
    orderRefresh.addEventListener('click', async (e) => { 
        e.preventDefault()
        initOrders()
    })
}