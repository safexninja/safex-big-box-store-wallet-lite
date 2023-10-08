
import { DaemonOffer, DaemonPricePeg } from '../../../common/daemon/types/daemon'
import { getOffers, getOffersFromDaemon, getPricePegsFromDaemon, getUserSettings, getWallets, processPurchaseAndMessageSeller, refreshAuthToken, storeFrontAddOffer, storeFrontCheckSellerPubKey, storeFrontReportOffer } from './apicalls'
import { showToast as showToast } from './toast'
import { countries } from '../../../common/constants/countries'
import { cropString, cropStringEnd } from '../../../common/utils/strings'
import { roundToTenDecimals, toNormalUnits } from '../../../common/utils/units'
import { BB_OfferDescription, TWM_OfferDescription } from '../../../common/interfaces/offerFormat'
import * as bootstrap from 'bootstrap'
import { clearAllBackDrops, confirmationModal, confirmationModalButton, confirmationModalText, offerDetailsModal, reportOfferModal } from './modals'
import { getEvaluatedPrice }from '../../../common/helpers/offers'
import { AlertArea, AlertType, dismissAlert, initializeTooltips, isValidImageUrl, newLineToBreak, removeHTML } from './utils'
import { PollUntil } from 'poll-until-promise'
import { WalletWsConnectionHandler, websocketConnectionManager, WsConnectionState, WsPurchaseState } from './websocket'
import { handleFormValidationAndSummarize, FormValidity } from './formvalidation'
import { WorkerOfferPurchased } from '../../../wallet/interfaces/walletworker'


const formMarketSearch = document.querySelector('#form_market_search') as HTMLFormElement
const formMarketSearchFieldSet = document.querySelector('#form_market_search_fields') as HTMLFormElement
const inputSearch = document.querySelector('#input_search') as HTMLInputElement
const selectCountry = document.querySelector('#select_country') as HTMLSelectElement
const inputMinPrice = document.querySelector('#input_minPrice') as HTMLInputElement
const inputMaxPrice = document.querySelector('#input_maxPrice') as HTMLInputElement
const inputMinQy = document.querySelector('#input_minQy') as HTMLInputElement
const selectOrder = document.querySelector('#select_order') as HTMLSelectElement
const btnSearch = document.querySelector('#btn_search') as HTMLButtonElement


const containerMarketResults = document.querySelector('#container_market_results') as HTMLElement
let global_marketDaemonPricePegs: DaemonPricePeg[]

// offer details
const offerDetails_title = document.getElementById('offer_details_title') as HTMLHeadingElement
const offerDetails_brand = document.getElementById('offer_details_brand') as HTMLSpanElement
const offerDetails_product = document.getElementById('offer_details_product') as HTMLSpanElement
const offerDetails_quantity = document.getElementById('offer_details_quantity') as HTMLSpanElement
const offerDetails_price = document.getElementById('offer_details_price') as HTMLSpanElement
const offerDetails_offerId = document.getElementById('offer_details_offer_id') as HTMLSpanElement
const offerDetails_seller = document.getElementById('offer_details_seller') as HTMLDivElement
const offerDetails_shortDescription = document.getElementById('offer_details_short_description') as HTMLSpanElement
const offerDetails_longDescription = document.getElementById('offer_details_long_description') as HTMLSpanElement
const offerDetails_policy = document.getElementById('offer_details_policy') as HTMLSpanElement
const offerDetails_imageCarousel = document.getElementById('offer_details_image_carousel') as HTMLDivElement


// purchase
const offerPurchase_selectWallet = document.getElementById('select_purchase_offer_wallet') as HTMLSelectElement
const syncPurchaseOfferStatusSpinner = document.getElementById("sync_purchase_offer_status_spinner") as HTMLElement
const formPurchaseOffer = document.getElementById("form_purchase_offer") as HTMLFormElement
const formFieldsPurchaseOffer = document.getElementById("form_purchase_offer_fields") as HTMLFormElement
const cashAvailable = document.getElementById("purchase_offer_cash_available") as HTMLSpanElement
const offerPurchase_textAreaAddress = document.getElementById("input_purchase_offer_delivery_address") as HTMLTextAreaElement
const offerPurchase_inputQuantity = document.getElementById("input_purchase_offer_quantity") as HTMLTextAreaElement
const offerPurchase_spanOfferPrice = document.getElementById("purchase_offer_price") as HTMLSpanElement
const offerPurchase_spanOfferTotalPrice = document.getElementById("purchase_offer_total_price") as HTMLSpanElement
const confirmPurchaseOfferButton = document.getElementById("confirmPurchaseOffer") as HTMLButtonElement
const offerPurchase_alertArea = document.getElementById("modal_alert_area_offer_purchase")

const reportOfferButton = document.getElementById('btn_report_offer') as HTMLButtonElement

function enableForm() {
    formMarketSearchFieldSet.removeAttribute('disabled')
    btnSearch.innerHTML = 'Search'
}

function disableForm() {
    formMarketSearchFieldSet.setAttribute('disabled', '')
    btnSearch.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
    
}

const collapsePurchaseEl = document.getElementById('collapsePurchase') as HTMLDivElement
const collapsePurchase = bootstrap.Collapse.getOrCreateInstance(collapsePurchaseEl)

const collapseToggle = document.getElementById('offer_details_purchase_start') as HTMLButtonElement
collapsePurchase.hide()
collapseToggle.addEventListener('click', function(){ 

    if( new Array(...collapsePurchaseEl.classList).includes('show')){
        collapsePurchase.hide()
    } else {
        collapsePurchase.show()
    }

}, false)
    
if(reportOfferButton){

    reportOfferButton.addEventListener('click', async (e) => {
        e.preventDefault()

        const reportReason = document.getElementById('input_report_reason') as HTMLSelectElement
        const reportRemark = document.getElementById('input_report_remark') as HTMLTextAreaElement

        const offer = reportOfferButton.getAttribute("data-offer")
        const country = reportOfferButton.getAttribute("data-country")

        if(offer && country){

            const reportedOffer = await storeFrontReportOffer(offer, country, reportReason.value, reportRemark.value)
            if(!reportedOffer){
                showToast("Error", "Something went wrong while trying to report offer to Store Front", 20000)
            } 

            if(reportedOffer.error){
                showToast("Error", reportedOffer.error, 20000)
            } 

            if(reportedOffer.status){
                showToast("Reported!", reportedOffer.status, 15000)
            } 
        }

        reportOfferModal.hide()
    })

}
// if form is present
if(formMarketSearch){
        // add event listener to connect button

        formMarketSearch.addEventListener('submit', async (e) => {
        e.preventDefault()
        
        disableForm()

        await clearMarketResults()

        formMarketSearch.classList.remove('was-validated')
           
        const searchedOffers: DaemonOffer[] = await getOffers(
            selectCountry.value,
            inputSearch.value,
            '',
            inputMinPrice.value,
            inputMaxPrice.value,
            inputMinQy.value,
            selectOrder.value
            )

        if((searchedOffers as any).error){
            containerMarketResults.innerHTML = '<div class="container">No results ...</div>'
            enableForm()
            showToast("No offers loaded ...", "No Store Front URL was set yet, so unable to load any offers", 10000)
        } else {
            displayResults(searchedOffers)
        }
       
    })

}

export async function initialLoadMarket(): Promise<boolean>{

    disableForm()
    await clearMarketResults()

    const searchedOffers: DaemonOffer[] = await getOffers(selectCountry.value, '', '', '', '', '1', 'NEWEST')

    if((searchedOffers as any).error){
        containerMarketResults.innerHTML = '<div class="container">No results ...</div>'
        enableForm()
        showToast("No offers loaded ...", "No Store Front URL was set yet, so unable to load any offers", 10000)
    } else {
        await displayResults(searchedOffers)
    }
    return true
}

export async function clearMarketResults(): Promise<true>{
    containerMarketResults.innerHTML = ""
    return true;    
}

async function displayResults(daemonOffers: DaemonOffer[]): Promise<boolean>{

    global_marketDaemonPricePegs = (await getPricePegsFromDaemon()).price_pegs || []
    if(!daemonOffers ||  daemonOffers.length == 0) {
        containerMarketResults.innerHTML = '<div class="container">No results ...</div>'
        enableForm()
        return true
    }

    let delayCounter = 0
    let addDelayAfterItem = 40
    let delay = 0

    daemonOffers.forEach((offer, i)=>{

        if(i >= addDelayAfterItem){
            delayCounter ++
            delay = 10
        }

        setTimeout(()=>{

            let parsedOffer
            let parsedOfferData: TWM_OfferDescription | BB_OfferDescription
            try {

                parsedOffer = JSON.parse(String.fromCharCode.apply(null, offer.description))  

                if(parsedOffer.twm_version){
                    parsedOfferData = parsedOffer as TWM_OfferDescription
                    addTWMCard(offer, parsedOfferData)
                }

                if(parsedOffer.schema && parsedOffer.schema == "BB"){
                    parsedOfferData = parsedOffer as BB_OfferDescription
                    addFormattedCard(offer, parsedOfferData)
                }

            } catch (error) {
                addDefaultCard(offer)
            }

           initializeTooltips()

            if(i == daemonOffers.length -1){
                enableForm()
                bindFunctions()
            }
            
        }, delayCounter * delay)

    })

    return true
}

function addFormattedCard(offer: DaemonOffer, parsedOfferData: BB_OfferDescription){

    let offerCard = document.createElement('div')
    containerMarketResults.appendChild(offerCard)

    let card: string[] = []
    card.push(`<div class="col">`)
        card.push(`<div class="card h-100 me-3 offer_card" style="width: 20rem;" data-function="open_offer" data-offer="${offer.offer_id}" data-seller="${offer.seller}">`)

            if(parsedOfferData.description.mainImage && isValidImageUrl(parsedOfferData.description.mainImage)){
                card.push(`<img src="${removeHTML(parsedOfferData.description.mainImage)}" class="card-img-top offer_card_image p-2" alt="image (may be unavailable)" loading="lazy">`)
            } else {
                card.push(`<img src="" class="card-img-top offer_card_image p-2" alt="image (may be unavailable)">`)
            }

            card.push(`<div class="card-body mb-0 pb-0">`)
                card.push(`<h5 class="card-title">${removeHTML(offer.title)}</h5>`)
                card.push(`<p class="card-text offer_card_description"><b>Brand: </b>${cropString(removeHTML(parsedOfferData.description.brand), 50)}<br><b>Product/Model: </b>${cropString(removeHTML(parsedOfferData.description.product), 50)}<br><b>Shipped From: </b>${ countries.find(cou => cou.country == parsedOfferData.description.shippedFrom)?.label }</p>`)
                card.push(``)
            card.push(`</div>`)

            card.push(`<div class="card-body mb-0 pb-0">`)
                card.push(`<p class="card-text offer_card_description">${cropString(removeHTML(parsedOfferData.description.shortDescription), 150)}</p>`)
                card.push(``)
            card.push(`</div>`)

            addCommonInfoToCard(offer, card)
            addCommonFooterToCard(offer, card)
    
        card.push(`</div>`)
    card.push(`</div>`)

    offerCard.outerHTML = card.join('')
}

function addTWMCard(offer: DaemonOffer, parsedOfferData: TWM_OfferDescription){

    let offerCard = document.createElement('div')
    containerMarketResults.appendChild(offerCard)

    let card: string[] = []
    card.push(`<div class="col">`)
        card.push(`<div class="card h-100 me-3 offer_card" style="width: 20rem;" data-function="open_offer" data-offer="${offer.offer_id}" data-seller="${offer.seller}">`)

            if(parsedOfferData.main_image && isValidImageUrl(parsedOfferData.main_image)){
                card.push(`<img src="${removeHTML(parsedOfferData.main_image)}" class="card-img-top offer_card_image p-2" alt="main image" loading="lazy">`)
            } else {
                card.push(`<img src="" class="card-img-top offer_card_image p-2" alt="main image">`)
            }

            card.push(`<div class="card-body mb-0 pb-0">`)
                card.push(`<h5 class="card-title">${removeHTML(offer.title)}</h5>`)
                if(parsedOfferData.description){
                    card.push(`<p class="card-text offer_card_description">${cropString(removeHTML(parsedOfferData.description), 200)}</p>`)
                }
               
                card.push(``)
            card.push(`</div>`)

            addCommonInfoToCard(offer, card)
            addCommonFooterToCard(offer, card)

           
        card.push(`</div>`)
    card.push(`</div>`)

    offerCard.outerHTML = card.join('')
}

function addDefaultCard(offer: DaemonOffer){

    let offerCard = document.createElement('div')
    containerMarketResults.appendChild(offerCard)

    let card: string[] = []
    card.push(`<div class="col">`)
        card.push(`<div class="card h-100 me-3 offer_card" style="width: 20rem;" data-function="open_offer" data-offer="${offer.offer_id}" data-seller="${offer.seller}">`)

            card.push(`<div class="card-body">`)
                card.push(`<h5><span class="badge bg-info">Unknown offer format</span></h5>`)
                card.push(`<h5 class="card-title">${removeHTML(offer.title)}</h5>`)
                card.push(`<p class="card-text offer_card_description"></p>`)
                card.push(``)
            card.push(`</div>`)

            addCommonInfoToCard(offer, card)
            addCommonFooterToCard(offer, card)

    
        card.push(`</div>`)
    card.push(`</div>`)

    offerCard.outerHTML = card.join('')
}


function addCommonFooterToCard(offer: DaemonOffer, card: string[]){
    card.push(`<div class="card-footer mt-2">`)
    card.push(`<p class="card-text text_xxsmall"><b>ID: </b>${offer.offer_id}</p>`)
    card.push(`</div>`)
}

function addCommonInfoToCard(offer: DaemonOffer, card: string[]){
        card.push(`<div class="card-body mb-0 pb-0">`)
        card.push(`<p class="card-text offer_card_description"><b>Seller: </b><a href="#" data-function="search_seller" data-seller="${offer.seller}" class="link-secondary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">${offer.seller}</a><br><b>Available Quantity: </b>${offer.quantity}</p>`)
        card.push(`</div>`)

    if(!offer.price_peg_used){
        card.push(`<div class="card-body mb-0 pb-0">`)
        card.push(`<p class="card-text offer_card_description"><b>Price: </b>${ toNormalUnits(offer.price)}  SFX (fixed)</p>`)
        card.push(`</div>`)
    } else {
        const usedPeg = global_marketDaemonPricePegs.find(peg => peg.price_peg_id == offer.price_peg_id)

        if(usedPeg){
            card.push(`<div class="card-body mb-0 pb-0">`)
                card.push(`<p class="card-text offer_card_description"><b>Price: </b> <b> ${ roundToTenDecimals(toNormalUnits(offer.evaluated_price || 0))} SFX </b><br><b>Peg:</b>  ${toNormalUnits(offer.price)} ${usedPeg.currency} <i class="bx bxs-info-circle" style="color:#628d97; margin-bottom: 2px; margin-left: 5px;" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-custom-class="custom-tooltip" data-bs-html="true" data-bs-title="Using ${usedPeg.currency} peg with title '${removeHTML(usedPeg.title)}' and description '${removeHTML(String.fromCharCode.apply(null, usedPeg.description))}', created by '${usedPeg.creator}'<br><br>id: ${usedPeg.price_peg_id}"></i><br>Minimum: ${toNormalUnits(offer.min_sfx_price)} SFX</p>`)
            card.push(`</div>`)
        }        
    }

    card.push(`<div class="card-body mb-0 py-0">`)
    card.push(`<p class="card-text offer_card_description"><span class="float-end" data-function="report_offer" data-offer="${offer.offer_id}" data-offer-title="${removeHTML(offer.title)}" data-seller="${offer.seller}">Report <i class='bx bx-block'  style="color: red; vertical-align: middle;"></i></span></p>`)
    card.push(`</div>`)
}

if(offerPurchase_selectWallet){
    offerPurchase_selectWallet.addEventListener('input', async (e) => {
        e.preventDefault()

        const wallet = offerPurchase_selectWallet.value

        if(wallet !== ""){
        
            syncPurchaseOfferStatusSpinner.classList.remove("d-none")
                    
            let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(wallet).wsConnection
            
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
                    syncPurchaseOfferStatusSpinner.classList.add("d-none")
                    cashAvailable.innerHTML = `( ${ toNormalUnits( wsCon.getUnlockedBalance())} SFX available for purchase AND transaction fees )`
                    formPurchaseOffer.setAttribute('data-wallet', wallet)
                    formFieldsPurchaseOffer.removeAttribute('disabled')
                })
                .catch(err => console.error(err));
      
        }
    })
    
}


if(offerPurchase_inputQuantity){
    offerPurchase_inputQuantity.addEventListener('input', async (e) => {
        e.preventDefault()
        caluculateTotalPurchasePrice()
        
    })
}

function caluculateTotalPurchasePrice(){
    let qy: number = parseInt(offerPurchase_inputQuantity.value)

    if( qy >= 1 ) {
        offerPurchase_spanOfferTotalPrice.innerHTML = roundToTenDecimals(parseFloat(offerPurchase_spanOfferPrice.innerHTML) * qy).toString()
    } else {
        offerPurchase_spanOfferTotalPrice.innerHTML = "N/A"
    }
}


// create offer for is also used for editing offers
if(confirmPurchaseOfferButton){
    confirmPurchaseOfferButton.addEventListener('click', async (e) => {
        e.preventDefault()
        
        dismissAlert(AlertArea.MODAL_ALERT_AREA_PURCHASE_OFFER)
        formPurchaseOffer.classList.remove('was-validated')

        const purchaseOfferTitleEl = document.getElementById('offer_details_title') as HTMLElement
        const purchaseOfferSellerEl = document.getElementById('offer_details_seller') as HTMLElement
        const purchaseOfferQyEl = document.getElementById('offer_details_quantity') as HTMLElement
        const purchaseTotalPrice = document.getElementById('purchase_offer_total_price') as HTMLElement

        const formFields = {
            wallet: {
                element: document.querySelector('#select_purchase_offer_wallet') as HTMLInputElement,
                validationMessage: [""]
            },
            quantity: {
                element: document.querySelector('#input_purchase_offer_quantity') as HTMLInputElement,
                validationMessage: [""]
            },
            deliveryAddress: {
                element: document.querySelector('#input_purchase_offer_delivery_address') as HTMLInputElement,
                validationMessage: [""]
            },
            email: {
                element: document.querySelector('#input_purchase_offer_delivery_email') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalMessage: {
                element: document.querySelector('#input_purchase_offer_message') as HTMLInputElement,
                validationMessage: [""]
            },
            mixin: {
                element: document.querySelector('#input_purchase_offer_mixin') as HTMLInputElement,
                validationMessage: [""]
            }
        }


        if(formFields.wallet.element.value.length == 0) {
            formFields.wallet.validationMessage.push("Please select a wallet")
        } else {
            let wsCon: WalletWsConnectionHandler=  websocketConnectionManager.getConnection(formFields.wallet.element.value).wsConnection
            if(   toNormalUnits(wsCon.getUnlockedBalance()) < parseFloat(purchaseTotalPrice.innerText) ){
                formFields.quantity.validationMessage.push("Not enough cash available to purchase this quantity; available SFX: " + roundToTenDecimals(toNormalUnits(wsCon.getUnlockedBalance())))
            }
        }

        if(!/^[0-9]+$/.test(formFields.quantity.element.value)) {
            formFields.quantity.validationMessage.push("Please enter a numeric value for quantity (i.e. 10)")
        }

        if(parseInt(formFields.quantity.element.value) < 1) {
            formFields.quantity.validationMessage.push("Please enter a quantity of 1 or more")
        }

        if(parseInt(formFields.quantity.element.value) > parseInt(purchaseOfferQyEl.innerText)) {
            formFields.quantity.validationMessage.push("Available quantity is: " + purchaseOfferQyEl.innerText)
        }

        if(formFields.deliveryAddress.element.value.length == 0) {
            formFields.deliveryAddress.validationMessage.push("Please enter a delivery address")
        }

        if(formFields.email.element.value.length == 0) {
            formFields.email.validationMessage.push("Please enter an e-mail address")
        }

        offerPurchase_alertArea?.classList.remove("d-none")

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_PURCHASE_OFFER, AlertType.DANGER)
        formFieldsPurchaseOffer.classList.add('was-validated')

        if(formValidity === FormValidity.VALID && confirmationModalText){

            offerPurchase_alertArea?.classList.add("d-none")

            let confirmationText: string[] = []

            confirmationText.push(`Are you sure you want to purchase this offer:<br><br>`)
            confirmationText.push(`<b>Title</b>:<br>${purchaseOfferTitleEl.innerText}<br><br>`)
            confirmationText.push(`<b>Seller</b>:<br>${purchaseOfferSellerEl.innerText}<br><br>`)
            confirmationText.push(`<b>Quantity</b>:<br>${formFields.quantity.element.value}<br><br>`)
            confirmationText.push(`<b>Total Price</b>:<br>${purchaseTotalPrice.innerText}<br><br>`)
            confirmationText.push(`<b>Offer ID</b>:<br><span class="text_xsmall">${formPurchaseOffer.getAttribute('data-offer')}</span><br><br>`)
            confirmationText.push(`<b>Delivery Address:</b> <br><span class="text_xsmall" style="color: #f00;">
                                            Make sure this is correct, otherwise you may not be able to recieve your package</span>
                                            <br><div class="row border mx-1 p-4" style="background-color: aliceblue;">${newLineToBreak(removeHTML(formFields.deliveryAddress.element.value))}</div><b>Country</b> <i class="bx bxs-info-circle" style="color:#f00; vertical-align: middle; margin-left: 2px; margin-right: 2px;" data-bs-toggle="tooltip" data-bs-placement="right" 
                                            data-bs-custom-class="custom-tooltip" data-bs-title="The seller is entitled to NOT deliver the order if you set the delivery address to a country for which the offer was not listed"></i>: ${  countries.find(cou => cou.country == selectCountry.value)?.label }<br><br>
                                           `)
            confirmationText.push(`<b>Email:</b> <br> <span class="text_xsmall" style="color: #f00;">Make sure this is correct, otherwise the seller may not be able to contact you when required</span><br><div class="row border mx-1 p-4" style="background-color: aliceblue;">${newLineToBreak(removeHTML(formFields.email.element.value))}</div><br><br>`)
            confirmationText.push(`<b>Additional Message:</b> <br>${newLineToBreak(formFields.additionalMessage.element.value)}<br><br>`)
            confirmationText.push(`<b>Mixin:</b> <br>${formFields.mixin.element.value}<br><br>`)

  
            confirmationModalText.innerHTML = confirmationText.join('')
            if(confirmationModalButton){
                confirmationModalButton.textContent =  "Done"
                confirmationModalButton.setAttribute("data-enable-reconfirm", "true")
                confirmationModalButton.setAttribute("data-return-modal", "offerDetailsModal");
            }
            
            offerDetailsModal.hide();
            confirmationModal.show();

            initializeTooltips()
            
        }
        
    })

}

if(formPurchaseOffer){
    formPurchaseOffer.addEventListener('submit', async (e) => {
        e.preventDefault()
        
        if(! new Array(...formFieldsPurchaseOffer.classList).includes('was-validated')){
            return
        }   

        const formFields = {
            wallet: {
                element: document.querySelector('#select_purchase_offer_wallet') as HTMLInputElement,
                validationMessage: [""]
            },
            quantity: {
                element: document.querySelector('#input_purchase_offer_quantity') as HTMLInputElement,
                validationMessage: [""]
            },
            deliveryAddress: {
                element: document.querySelector('#input_purchase_offer_delivery_address') as HTMLInputElement,
                validationMessage: [""]
            },
            email: {
                element: document.querySelector('#input_purchase_offer_delivery_email') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalMessage: {
                element: document.querySelector('#input_purchase_offer_message') as HTMLInputElement,
                validationMessage: [""]
            },
            mixin: {
                element: document.querySelector('#input_purchase_offer_mixin') as HTMLInputElement,
                validationMessage: [""]
            }
        }

    
        dismissAlert(AlertArea.MODAL_ALERT_AREA_PURCHASE_OFFER)
        formPurchaseOffer.classList.remove('was-validated')

        let wallet = formPurchaseOffer.getAttribute('data-wallet')
        let offerId = formPurchaseOffer.getAttribute('data-offer')
        let seller = formPurchaseOffer.getAttribute('data-seller') || ""
        let sellerAddress = formPurchaseOffer.getAttribute('data-seller-address') || ""

        if(wallet && offerId){

            const buttonPurchaseOffer = document.getElementById('btn_purchase_offer') as HTMLButtonElement
            if(buttonPurchaseOffer){
                buttonPurchaseOffer.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
                buttonPurchaseOffer.setAttribute("disabled", '')
            }

            let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(wallet).wsConnection

            if(wsCon.getPurchaseState() != WsPurchaseState.NONE){
                showToast("Error", "Currently processing another purchase. Please try again later.", 20000)
            } else {


                const sellerPubKeyValidation = await storeFrontCheckSellerPubKey(seller)

                if(sellerPubKeyValidation.status != "OK"){
                    showToast("Error", "Purchase not completed. Some when wrong while checking sellers messaging key: " + sellerPubKeyValidation.error, 30000)
                } else {

                    wsCon.setPurchaseState(WsPurchaseState.PROCESSING)
           
                    wsCon.purchaseOffer(
                            offerId,
                            parseInt(formFields.quantity.element.value),
                            parseInt(formFields.mixin.element.value),
                            sellerAddress
                        )
        
                    let pollUntilPromise = new PollUntil();
                    pollUntilPromise
                        .stopAfter(180000)
                        .tryEvery(200)
                        .execute(() => {
                            return new Promise((resolve, reject) => {
                                if (wsCon.getPurchaseState() != WsPurchaseState.PROCESSING) {
                                    return resolve(true); 
                                }
                                reject(false);
                            })
                        })
                        .then(async () => { 
    
                            let txnData = wsCon.getPurchaseTxnData() as WorkerOfferPurchased
                            if(txnData.type == "ERROR" || txnData.type == "AUTH"){
                                //do nothing
                            } else {
    
                                if(wsCon.getPurchaseState() == WsPurchaseState.COMITTED){
            
                                    const processed =  await processPurchaseAndMessageSeller(
                                        txnData.data.offer_id,
                                        seller,
                                        txnData.data.txn_id,
                                        txnData.data.txn_proof,
                                        parseInt(formFields.quantity.element.value),
                                        formFields.deliveryAddress.element.value,
                                        formFields.email.element.value,
                                        formFields.additionalMessage.element.value,
                                        wallet || ""

                                    )

                                    if(processed.status != "OK"){
                                        showToast("Error", "Some went wrong when processing purchase: " + processed.error, 30000)
                                    }
                                    
                                }
                            }
                           
                            wsCon.setPurchaseState(WsPurchaseState.NONE)
    
                        })
                        .catch(err => console.error(err));        
                }
            }
        }

        offerDetailsModal.hide()
        clearAllBackDrops()
    })

}

export async function populateCountryList(): Promise<boolean>{
    
    const userSettings = await getUserSettings()
    if(!userSettings){
        showToast("Error", "Something went wrong while trying to fetch user settings", 15000)
    }

    countries.forEach((country)=>{
        selectCountry.options.add(new Option(country.label, country.country))
    })            

    if(userSettings && userSettings.defaultCountry){
        selectCountry.value = userSettings.defaultCountry
    }

    return true
           
}

async function bindFunctions() {
    const sellerLinks = document.querySelectorAll("a[data-function=search_seller]")
    if(sellerLinks){
        sellerLinks.forEach((sellerLink)=>{
            sellerLink.addEventListener('click', function(e){
                e.stopPropagation() 
                searchSeller(sellerLink.getAttribute('data-seller') || '');
            }, false)
        })
    }

    const openOfferElements = document.querySelectorAll("[data-function=open_offer]")
    if(openOfferElements){
        openOfferElements.forEach((openOfferElement)=>{
            openOfferElement.addEventListener('click', function(){ openOffer(openOfferElement.getAttribute('data-offer') || '', openOfferElement.getAttribute('data-seller') || '');}, false)
        })
    }

    const reportOfferElements = document.querySelectorAll("span[data-function=report_offer]")
    if(reportOfferElements){
        reportOfferElements.forEach((reportOfferElement)=>{
            reportOfferElement.addEventListener('click', function(e){
                e.stopPropagation()
                 reportOffer(reportOfferElement.getAttribute('data-offer') || '', reportOfferElement.getAttribute('data-offer-title') || '', reportOfferElement.getAttribute('data-seller') || '');
                }, false)
        })
    }

}

async function searchSeller(seller: string) {       

        await clearMarketResults()
           
        const searchedOffers: DaemonOffer[] = await getOffers(
            selectCountry.value,
            seller,
            'seller',
            '',
            '',
            '',
            selectOrder.value
            )

        if((searchedOffers as any).error){
            showToast("No offers loaded ...", "No Store Front URL was set yet, so unable to load any offers", 10000)
        }

        displayResults(searchedOffers)
}

async function reportOffer(offerId: string, title: string, seller: string) {  
    const reportOfferId = document.getElementById('report_offer_offerid') as HTMLSpanElement
    const reportOfferTitle = document.getElementById('report_offer_title') as HTMLSpanElement
    const reportOfferSeller = document.getElementById('report_offer_seller') as HTMLSpanElement
    const reportOfferStoreFrontUrl = document.getElementById('report_offer_store_url') as HTMLSpanElement
    const activeStoreFrontUrl = document.getElementById('input_store_url') as HTMLInputElement
    const reportOfferButton = document.getElementById('btn_report_offer') as HTMLSpanElement   
    
    if(offerId && title && seller){

        reportOfferId.innerHTML = offerId
        reportOfferTitle.innerHTML = title
        reportOfferSeller.innerHTML = seller
        reportOfferStoreFrontUrl.innerHTML = activeStoreFrontUrl.value
        
        reportOfferButton.setAttribute("data-offer", offerId)
        reportOfferButton.setAttribute("data-country", selectCountry.value)
        reportOfferModal.show()

    }
}

async function openOffer(offerId: string, seller: string) {      
    
    const sellersOffers = await getOffersFromDaemon(seller)
    const offerToOpen = sellersOffers.offers?.find(offer => offer.offer_id == offerId)

    if(!offerToOpen) {
        return
    }

    const pricePegs = (await getPricePegsFromDaemon()).price_pegs
    if(!pricePegs) {
        return
    }

    getEvaluatedPrice(offerToOpen, pricePegs)
          
    let brand: string = ""
    let product: string = ""
    let shortDescription: string = ""
    let longDescription: string = ""
    let policy: string = ""
    let mainImage: string = ""
    let image1: string = ""
    let image2: string = ""
    let image3: string = ""

    let parsedOffer
    let parsedOfferData: TWM_OfferDescription | BB_OfferDescription
    try {

        parsedOffer = JSON.parse(String.fromCharCode.apply(null, offerToOpen.description))  

        if(parsedOffer.twm_version){
            parsedOfferData = parsedOffer as TWM_OfferDescription

            longDescription = removeHTML(parsedOfferData.description)
            mainImage = removeHTML(parsedOfferData.main_image)
            image1 = removeHTML(parsedOfferData.image_2)
            image2 = removeHTML(parsedOfferData.image_3)
            image3 = removeHTML(parsedOfferData.image_4)
        }

        if(parsedOffer.schema && parsedOffer.schema == "BB"){
            parsedOfferData = parsedOffer as BB_OfferDescription
            brand = removeHTML(parsedOfferData.description.brand)
            product = removeHTML(parsedOfferData.description.product)
            shortDescription = removeHTML(parsedOfferData.description.shortDescription)
            longDescription = removeHTML(parsedOfferData.description.longDescription)
            policy = removeHTML(parsedOfferData.description.policy)
            mainImage = removeHTML(parsedOfferData.description.mainImage)
            image1 = removeHTML(parsedOfferData.description.image1)
            image2 = removeHTML(parsedOfferData.description.image2)
            image3 = removeHTML(parsedOfferData.description.image3)

        }

    } catch (error) {
        longDescription = "No description could be read from unknown offer format"
    }

    offerDetails_title.innerHTML = removeHTML(offerToOpen.title)
    offerDetails_brand.innerHTML = brand
    offerDetails_product.innerHTML = product
    offerDetails_seller.innerHTML = offerToOpen.seller
    offerDetails_quantity.innerHTML = offerToOpen.quantity.toString()

    const pegDataFromDaemon = global_marketDaemonPricePegs.find(peg => peg.price_peg_id == offerToOpen.price_peg_id)

    let pricingInfo: string = roundToTenDecimals(toNormalUnits(offerToOpen.evaluated_price || 0)).toString() + " SFX  "
    if(offerToOpen.price_peg_used && pegDataFromDaemon){
        pricingInfo = pricingInfo + `<br>--------<br><span class="text_small">${toNormalUnits(offerToOpen.price)} ${pegDataFromDaemon.currency} <i class="bx bxs-info-circle" style="color:#628d97; margin-bottom: 2px; margin-left: 5px;" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-custom-class="custom-tooltip" data-bs-html="true" data-bs-title="Using ${pegDataFromDaemon.currency} peg with title '${removeHTML(pegDataFromDaemon.title)}' and description '${removeHTML( String.fromCharCode.apply(null, pegDataFromDaemon.description))}', created by '${pegDataFromDaemon.creator}'<br><br>id: ${pegDataFromDaemon.price_peg_id}"></i> <br> Minimum: ${toNormalUnits(offerToOpen.min_sfx_price)} SFX</span>`
    } 

    offerDetails_price.innerHTML = pricingInfo
    offerDetails_offerId.innerHTML = offerToOpen.offer_id
    offerDetails_shortDescription.innerHTML = shortDescription
    offerDetails_longDescription.innerHTML = newLineToBreak(longDescription)
    offerDetails_policy.innerHTML = newLineToBreak("<b>Return/Refund Policy:</b>" + policy)

    let carousel: string[] = []
    let numberOfCarouselSlides = 1

    if(image1 && image1.length > 0 ){
        numberOfCarouselSlides ++
    }

    if(image2 && image2.length > 0 ){
        numberOfCarouselSlides ++
    }

    if(image3 && image3.length > 0 ){
        numberOfCarouselSlides ++
    }

    // image carousel
    carousel.push(`<div id="offerImagesCarousel" class="carousel carousel-dark slide">`)
        carousel.push(`<div class="carousel-indicators">`)

        // add carousel slide indicators first
        if(numberOfCarouselSlides > 1){
            for (let i = 1; i <= numberOfCarouselSlides; i++) {
                let activeSlideProperties = ""
                if(i==1){
                    activeSlideProperties = `class="active" aria-current="true"`
                }
                carousel.push(`<button type="button" data-bs-target="#offerImagesCarousel" data-bs-slide-to="${i-1}" aria-label="Image Slide ${i}" ${activeSlideProperties}></button>`)
                
            }
        }

        carousel.push(`</div>`)
        carousel.push(`<div class="carousel-inner">`)
            
            if(isValidImageUrl(mainImage)){
                carousel.push(`<div class="carousel-item active">`)
                    carousel.push(`<img src="${mainImage}" class="d-block w-100">`)
                carousel.push(`</div>`)
            }
           
        
            if(image1 && image1.length > 0 && isValidImageUrl(image1)){
                carousel.push(`<div class="carousel-item">`)
                    carousel.push(`<img src="${image1}" class="d-block w-100">`)
                carousel.push(`</div>`)
            }

            if(image2 && image2.length > 0 && isValidImageUrl(image2)){
                carousel.push(`<div class="carousel-item">`)
                    carousel.push(`<img src="${image2}" class="d-block w-100">`)
                carousel.push(`</div>`)
            }

            if(image3 && image3.length > 0 && isValidImageUrl(image3)){
                carousel.push(`<div class="carousel-item">`)
                    carousel.push(`<img src="${image3}" class="d-block w-100">`)
                carousel.push(`</div>`)
            }           

        carousel.push(`</div>`)

        // if more than 1 slide add Prev and Next control buttons
        if(numberOfCarouselSlides > 1){
            carousel.push(`<button class="carousel-control-prev" type="button" data-bs-target="#offerImagesCarousel" data-bs-slide="prev">`)
                carousel.push(`<span class="carousel-control-prev-icon" aria-hidden="true"></span>`)
                carousel.push(`<span class="visually-hidden">Previous</span>`)
            carousel.push(`</button>`)
    
            carousel.push(`<button class="carousel-control-next" type="button" data-bs-target="#offerImagesCarousel" data-bs-slide="next">`)
                carousel.push(`<span class="carousel-control-next-icon" aria-hidden="true"></span>`)
                carousel.push(`<span class="visually-hidden">Next</span>`)
            carousel.push(`</button>`)        

        }
    

    carousel.push(`</div>`)

    offerDetails_imageCarousel.innerHTML = carousel.join('')   

    initializeTooltips()
    
    collapsePurchase.hide()
    formPurchaseOffer.classList.remove('was-validated')
    formPurchaseOffer.reset()
    formPurchaseOffer.setAttribute('data-offer', offerId)
    formPurchaseOffer.setAttribute('data-seller-address', offerToOpen.seller_address)
    formPurchaseOffer.setAttribute('data-seller', offerToOpen.seller)
    formFieldsPurchaseOffer.setAttribute('disabled', '')

    cashAvailable.innerHTML = ""
    const buttonPurchaseOffer = document.getElementById('btn_purchase_offer') as HTMLButtonElement
        if(buttonPurchaseOffer){
            buttonPurchaseOffer.innerHTML = 'Purchase!'
            buttonPurchaseOffer.removeAttribute("disabled")
            buttonPurchaseOffer.classList.add("d-none")
        }

    const userWallets = await getWallets()
    const preCheckWarning = document.getElementById('modal_alert_area_offer_purchase_precheck') as HTMLDivElement

    if(userWallets.length == 0){
        preCheckWarning.innerHTML = "It seems you dont have a wallet yet. Please create a wallet to be able to purchase an item."
        document.querySelector('[data-area=purchase_offer_disabled')?.classList.remove('d-none')
        document.querySelector('[data-area=purchase_offer_button')?.classList.add('d-none')
        document.querySelector('[data-area=purchase_offer')?.classList.add('d-none')
    } else {
        preCheckWarning.innerHTML = ""
        document.querySelector('[data-area=purchase_offer_disabled')?.classList.add('d-none')
        document.querySelector('[data-area=purchase_offer_button')?.classList.remove('d-none')
        document.querySelector('[data-area=purchase_offer')?.classList.remove('d-none')
    }   

    syncPurchaseOfferStatusSpinner.classList.add("d-none")

    // fill select box with available wallets
    offerPurchase_selectWallet.innerHTML = ""
    offerPurchase_selectWallet.options.add(new Option("", ""))

    userWallets
    .filter((wallet)=>{
        return wallet.deleted == false
    })
    .forEach((wallet)=>{
        offerPurchase_selectWallet.options.add(new Option(`${wallet.label} - [${cropStringEnd(wallet.address, 10)}]`, wallet.uuid))
    })

    offerPurchase_spanOfferPrice.innerHTML = pricingInfo
    caluculateTotalPurchasePrice()

    const userSettings = await getUserSettings()
    offerPurchase_textAreaAddress.value =  cropString(userSettings.defaultAddress + '\n' + countries.find(cou => cou.country == userSettings.defaultCountry)?.label, 97) 
    offerDetailsModal.show()
}


async function initMarket(){
    if(formMarketSearch === undefined || formMarketSearch === null){
        return
    }
    await populateCountryList()
    await initialLoadMarket()
}

initMarket()



