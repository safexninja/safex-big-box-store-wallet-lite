
import { DaemonOffer, DaemonOffers, DaemonPricePeg } from '../../../common/daemon/types/daemon'
import { getAccounts, getOffersFromDaemon, storeFrontGetSellerRegistrionCheck, getWallets, storeFrontSubmitSellerRegistration, storeFrontRevokeSellerRegistration, getPricePegs, getPricePegsFromDaemon, storeFrontGetOffersDetails, getStore, storeFrontRemoveOffer, storeFrontAddOffer, getUserSettings, getDaemonHeight, refreshAuthToken } from './apicalls'
import { FormValidity, handleFormValidationAndSummarize, } from './formvalidation'
import { showToast as showToast } from './toast'
import { countries } from '../../../common/constants/countries'
import * as bootstrap from 'bootstrap'
import { clearAllBackDrops, confirmationModal, confirmationModalButton, confirmationModalText, createOfferModal, hideOfferModal, revokeRegistrationModal, showOfferModal } from './modals'
import { WalletWsConnectionHandler, websocketConnectionManager, WsConnectionState } from './websocket'
import { PollUntil } from 'poll-until-promise'
import { toNormalUnits } from '../../../common/utils/units'
import { dismissAlert, AlertArea, AlertType, isValidImageUrl, replaceSpecialChars, initializeTooltips } from './utils'
import { cropString } from '../../../common/utils/strings'
import { IWalletStrict } from '../../../common/db/models/interfaces'
import { StoreFrontSellerOffersDetails } from '../../../common/helpers/stores'
import { BB_OfferDescription, BB_V1, TWM_OfferDescription } from '../../../common/interfaces/offerFormat'


const formListingsSelect = document.querySelector('#form_listings_select') as HTMLFormElement
const selectAccount = document.querySelector('#select_listings_account') as HTMLSelectElement
const btnLoad = document.querySelector('#btn_listings_load') as HTMLButtonElement
const containerListingsOverview = document.querySelector('#container_listings_overview') as HTMLElement
const iconSyncAccounts =  document.querySelector('#icon_listings_sync_accounts') as HTMLElement
const iconSyncRegistration =  document.querySelector('#icon_listings_sync_registration') as HTMLElement

// registration
const buttonRegistrationRegister = document.getElementById("btn_listings_account_register") as HTMLButtonElement
const buttonRegistrationPending = document.getElementById("btn_listings_account_pending") as HTMLButtonElement
const buttonRegistrationRevoke = document.getElementById("btn_listings_account_revoke") as HTMLButtonElement
const buttonRegistrationRejected = document.getElementById("btn_listings_account_rejected") as HTMLButtonElement
const buttonRegistrationError = document.getElementById("btn_listings_account_error") as HTMLButtonElement
const tooltipRegistration = document.getElementById("tooltip_seller_registration_status") as HTMLElement
const buttonConfirmRevokeRegistration = document.getElementById("confirm_revoke_account") as HTMLButtonElement

// create offer
const buttonCreateOffer = document.getElementById("btn_offer_create") as HTMLButtonElement
const formCreateOffer = document.getElementById("form_create_offer") as HTMLFormElement
const formFieldsCreateOffer = document.getElementById("form_create_offer_fields") as HTMLFormElement
const confirmCreateOfferButton = document.getElementById("confirmCreateOffer") as HTMLButtonElement
const createOfferButton = document.getElementById("btn_create_offer") as HTMLButtonElement
const selectCreateOfferAccount = document.getElementById("select_create_offer_account") as HTMLSelectElement
const syncCreateOfferStatusSpinner = document.getElementById("sync_create_offer_status_spinner") as HTMLElement
const checkboxUsePricePeg = document.getElementById("checkbox_create_offer_use_price_peg") as HTMLInputElement
const areaNoPricePeg = document.getElementById("area_create_offer_price_no_peg") as HTMLDivElement
const areaWithPricePeg = document.getElementById("area_create_offer_price_with_peg") as HTMLInputElement
const selectPricePeg = document.getElementById("select_create_offer_price_peg") as HTMLSelectElement
const selectOfferShipmentCountry = document.getElementById("select_create_offer_country") as HTMLSelectElement

//containers
const containerListingsSelectAccount = document.getElementById("container_listings_select") as HTMLDivElement
const containerListingsCreateOffer = document.getElementById("container_listings_create") as HTMLDivElement
const containerListingsNoAccountWarning = document.getElementById("container_listings_no_acount") as HTMLDivElement

const offerModalLabel = document.getElementById("createOfferModalLabel") as HTMLElement

export async function populateShipmentCountryList(): Promise<boolean>{
    
    selectOfferShipmentCountry.options.add(new Option("", ""))

    countries.forEach((country)=>{
        selectOfferShipmentCountry.options.add(new Option(country.label, country.country))
    })            

    return true
}

populateShipmentCountryList()

// hide & show
const formHideOffer = document.querySelector('#form_hide_offer') as HTMLFormElement
const formShowOffer = document.querySelector('#form_show_offer') as HTMLFormElement
const confirmShowOfferButton = document.getElementById("confirmShowOffer")
const showOfferButton = document.getElementById("btn_show_offer")


let global_listingsDaemonPricePegs: DaemonPricePeg[]
let global_userWallets: IWalletStrict[]
let global_sellerApiRegistrationStatus: string | undefined
let global_sellerApiOffersRegistered: StoreFrontSellerOffersDetails[]
let global_bcHeight: number | undefined

if(buttonRegistrationRegister){
    buttonRegistrationRegister.addEventListener('click', async (e) => {
        e.preventDefault()

        const registrationSubmition = await storeFrontSubmitSellerRegistration(selectAccount.value)
        if(registrationSubmition.error){
            showToast("Error", registrationSubmition.error, 15000)
            return
        } else {
            showToast("Registration submitted", `Your registration for account "${selectAccount.value}" to this store was succesfully submitted.`, 10000)
            checkSellerRegistration()
        }
    })
}

if(buttonRegistrationRevoke){
    buttonRegistrationRevoke.addEventListener('click', async (e) => {
        e.preventDefault()
   
        const divAccountName = document.getElementById('account_to_revoke_name') as HTMLElement
        const divStoreName = document.getElementById('account_to_revoke_store') as HTMLElement
        const inputStoreUrl = document.getElementById('input_store_url') as HTMLInputElement    

        divAccountName.innerHTML = selectAccount.value
        divStoreName.innerHTML = inputStoreUrl.value
        revokeRegistrationModal.show()

    })
}

if(buttonConfirmRevokeRegistration){
    buttonConfirmRevokeRegistration.addEventListener('click', async (e) => {
        e.preventDefault()

        const registrationRevokation = await storeFrontRevokeSellerRegistration(selectAccount.value)
        if(registrationRevokation.error){
            showToast("Error", registrationRevokation.error, 15000)
            return
        } else {
            showToast("Revokation submitted", `Your revokation for account "${selectAccount.value}" was succesfully submitted to this store.`, 10000)
            checkSellerRegistration()
        }
        revokeRegistrationModal.hide()

    })
}

if(buttonCreateOffer){
    buttonCreateOffer.addEventListener('click', async (e) => {
        e.preventDefault()

        offerModalLabel.innerHTML = "Create Offer"
        formCreateOffer.setAttribute('data-mode', 'create')
        formCreateOffer.removeAttribute('data-offer')

        const userAccounts = await getAccounts()
        const userWallets = await getWallets()
        const pricePegs = await getPricePegs()

        const userSettings = await getUserSettings()

        if(pricePegs.length == 0 ){
            showToast("Error", "Could not fetch price pegs from selected store", 10000)
            return
        }
        const cashAvailable = document.getElementById("create_offer_cash_available") as HTMLSpanElement
    
        selectCreateOfferAccount.removeAttribute('disabled')
        selectCreateOfferAccount.innerHTML = ""
        cashAvailable.innerHTML = ""
        selectPricePeg.innerHTML = ""

        selectCreateOfferAccount.options.add(new Option("", ""))

        userAccounts.forEach((account)=>{

            const accountWalletLabel = userWallets.find(wallet => wallet.uuid == account.wallet)
            selectCreateOfferAccount.options.add(new Option(`${account.account}  - [ ${accountWalletLabel?.label} ]`, account.uuid))
        })            

        pricePegs.forEach((peg)=>{

            selectPricePeg.options.add(new Option(`${peg.currency}  - [ 1 SFX = ${ (1 / toNormalUnits(peg.rate)).toFixed(4) + ' ' + peg.currency  } ] - [ ${peg.creator} ]`, peg.price_peg_id))

        })

        formCreateOffer.classList.remove('was-validated')
        formCreateOffer.reset()
        confirmCreateOfferButton?.classList.remove("d-none")
        createOfferButton?.classList.add("d-none")
        syncCreateOfferStatusSpinner.classList.add("d-none")
        areaNoPricePeg.classList.add("d-none")
        areaWithPricePeg.classList.remove("d-none")

        if(userSettings && userSettings.defaultCountry){
            selectOfferShipmentCountry.value = userSettings.defaultCountry
        }
           
        formFieldsCreateOffer.setAttribute("disabled", '')

        const buttonCreateOffer = document.getElementById('btn_create_offer') as HTMLButtonElement
        if(buttonCreateOffer){
            buttonCreateOffer.innerHTML = 'Create!'
            buttonCreateOffer.removeAttribute("disabled")
        }

        document.getElementById('modal_alert_area_create_offer')?.classList.remove('d-none')
        document.getElementById('modal_alert_area_edit_offer')?.classList.add('d-none')

        createOfferModal.show()
        
    })
}

if(selectCreateOfferAccount){
    selectCreateOfferAccount.addEventListener('input', async (e) => {
        e.preventDefault()
        retrieveAccountData()
        
    })
}

async function retrieveAccountData(){

    if(selectCreateOfferAccount.value !== ""){
        
        syncCreateOfferStatusSpinner.classList.remove("d-none")
        
        const userAccounts = await getAccounts()
        const userWallets = await getWallets()

        const selectedAccount = userAccounts.find(account => account.uuid == selectCreateOfferAccount.value)
        const selectedWallet = userWallets.find(wallet => wallet.uuid == selectedAccount?.wallet)?.uuid
        const cashAvailable = document.getElementById("create_offer_cash_available") as HTMLSpanElement

        if(selectedWallet){
            
            let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(selectedWallet).wsConnection
            
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
                    syncCreateOfferStatusSpinner.classList.add("d-none")
                    cashAvailable.innerHTML = `( ${ toNormalUnits( wsCon.getUnlockedBalance())} SFX available for transaction fees )`
                    formCreateOffer.setAttribute('data-wallet', selectedWallet)
                    formFieldsCreateOffer.removeAttribute('disabled')
                })
                .catch(err => console.error(err));

        }
    }

}

if(checkboxUsePricePeg){
    checkboxUsePricePeg.addEventListener('input', async (e) => {
        e.preventDefault()
            if(checkboxUsePricePeg.checked){
                areaNoPricePeg.classList.add("d-none")
                areaWithPricePeg.classList.remove("d-none")
            } else {
                areaNoPricePeg.classList.remove("d-none")
                areaWithPricePeg.classList.add("d-none")
            }
    })

}

if(formListingsSelect){
        formListingsSelect.addEventListener('submit', async (e) => {
        e.preventDefault()
    
        await clearListingResults()
        global_sellerApiRegistrationStatus =  await checkSellerRegistration()
       
        const accountOffers: DaemonOffers = await getOffersFromDaemon(selectAccount.value)
        if((accountOffers as any).error){
            showToast("Something wrong here ...", "While fetching account offers from daemon", 10000)
            return
        }

        if(accountOffers.offers){
            accountOffers.offers.sort(function (a, b) {
                return b.height - a.height;
            });

            displayResults(accountOffers.offers)
        }  else {
            containerListingsOverview.innerHTML = `<div style="width: 100%;">No offers for this account on the blockchain</div>`
        }
       
    })

}

// create offer for is also used for editing offers
if(confirmCreateOfferButton){
    confirmCreateOfferButton.addEventListener('click', async (e) => {
        e.preventDefault()
                
        dismissAlert(AlertArea.MODAL_ALERT_AREA_CREATE_OFFER)
        dismissAlert(AlertArea.MODAL_ALERT_AREA_EDIT_OFFER)
        formCreateOffer.classList.remove('was-validated')

        const formFields = {
            account : {
                element: document.querySelector('#select_create_offer_account') as HTMLSelectElement,
                validationMessage: [""]
            },
            title : {
                element: document.querySelector('#input_create_offer_title') as HTMLInputElement,
                validationMessage: [""]
            },
            brand : {
                element: document.querySelector('#input_create_offer_brand') as HTMLInputElement,
                validationMessage: [""]
            },
            product : {
                element: document.querySelector('#input_create_offer_product') as HTMLInputElement,
                validationMessage: [""]
            },
            shortDescription : {
                element: document.querySelector('#input_create_offer_short_description') as HTMLInputElement,
                validationMessage: [""]
            },
            quantity: {
                element: document.querySelector('#input_create_offer_qy') as HTMLInputElement,
                validationMessage: [""]
            },
            usePricePeg: {
                element: document.querySelector('#checkbox_create_offer_use_price_peg') as HTMLInputElement,
                validationMessage: [""]
            },
            priceSfx: {
                element: document.querySelector('#input_create_offer_price_sfx') as HTMLInputElement,
                validationMessage: [""]
            },
            pricePegged: {
                element: document.querySelector('#input_create_offer_price_pegged') as HTMLInputElement,
                validationMessage: [""]
            },
            pricePeg: {
                element: document.querySelector('#select_create_offer_price_peg') as HTMLSelectElement,
                validationMessage: [""]
            },
            minSfx: {
                element: document.querySelector('#input_create_offer_price_pegged_minimum') as HTMLInputElement,
                validationMessage: [""]
            },
            longDescription: {
                element: document.querySelector('#input_create_offer_long_description') as HTMLInputElement,
                validationMessage: [""]
            },
            policy: {
                element: document.querySelector('#input_create_offer_policy') as HTMLInputElement,
                validationMessage: [""]
            },
            mainImage: {
                element: document.querySelector('#input_create_offer_main_image') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalImage1: {
                element: document.querySelector('#input_create_offer_additional_image_1') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalImage2: {
                element: document.querySelector('#input_create_offer_additional_image_2') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalImage3: {
                element: document.querySelector('#input_create_offer_additional_image_3') as HTMLInputElement,
                validationMessage: [""]
            },
            mixin: {
                element: document.querySelector('#input_create_offer_mixin') as HTMLInputElement,
                validationMessage: [""]
            },
            active: {
                element: document.querySelector('#checkbox_create_offer_active') as HTMLInputElement,
                validationMessage: [""]
            },
            shippedFrom: {
                element: document.querySelector('#select_create_offer_country') as HTMLInputElement,
                validationMessage: [""]
            }
        }

        formFields.longDescription.element.value = replaceSpecialChars(formFields.longDescription.element.value)
        formFields.shortDescription.element.value = replaceSpecialChars(formFields.shortDescription.element.value)
        formFields.title.element.value = replaceSpecialChars(formFields.title.element.value)
        formFields.policy.element.value = replaceSpecialChars(formFields.policy.element.value)
    
        if(formFields.account.element.value.length == 0) {
            formFields.account.validationMessage.push("Please select an account")

        }

        if(!/^[0-9]+$/.test(formFields.quantity.element.value)) {
            formFields.quantity.validationMessage.push("Please enter a numeric value for quantity (i.e. 10)")
        }

        // if offer is active only checks

        if(formFields.active.element.checked == true ){

            if( parseInt(formFields.quantity.element.value) < 1 ) {
                formFields.quantity.validationMessage.push("An active offer should have a quantity of 1 or more")
            }

            if(formFields.longDescription.element.value.length <= 30) {
                formFields.longDescription.validationMessage.push("Enter at least 30 characters as a long description for this offer")
            }
            
            if(!isValidImageUrl(formFields.mainImage.element.value)) {
                formFields.mainImage.validationMessage.push("Please enter a valid URL for the main image")
            }

            if(formFields.additionalImage1.element.value.length > 0 && !isValidImageUrl(formFields.additionalImage1.element.value)) {
                formFields.additionalImage1.validationMessage.push("Please enter a valid URL for the additional image")
            }

            if(formFields.additionalImage2.element.value.length > 0 && !isValidImageUrl(formFields.additionalImage2.element.value)) {
                formFields.additionalImage2.validationMessage.push("Please enter a valid URL for the additional image")
            }

            if(formFields.additionalImage3.element.value.length > 0 && !isValidImageUrl(formFields.additionalImage3.element.value)) {
                formFields.additionalImage3.validationMessage.push("Please enter a valid URL for the additional image")
            }

        }

        if(formFields.title.element.value.length <= 3) {
            formFields.title.validationMessage.push("Enter at least 3 characters as a title for this offer")
        }

        if(formFields.shortDescription.element.value.length <= 15) {
            formFields.shortDescription.validationMessage.push("Enter at least 15 characters as a short description for this offer")
        }

        if(formFields.shippedFrom.element.value.length == 0) {
            formFields.shippedFrom.validationMessage.push("Please provide a Shipped From country")
        }

        if(formFields.usePricePeg.element.checked == true) {

            if(!/^[0-9.]+$/.test(formFields.minSfx.element.value)) {
                formFields.minSfx.validationMessage.push("Please enter a numeric value for minimum SFX price (i.e. 100.50)")
            }

            if(!/^[0-9.]+$/.test(formFields.pricePegged.element.value)) {
                formFields.pricePegged.validationMessage.push("Please enter a numeric value for the price in the selected currency (i.e. 20.75)")
            }

        } else {

            if(!/^[0-9.]+$/.test(formFields.priceSfx.element.value)) {
                formFields.priceSfx.validationMessage.push("Please enter a numeric value for price in SFX (i.e. 100.50)")
            }

        }

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_CREATE_OFFER, AlertType.DANGER)
        formCreateOffer.classList.add('was-validated')

        if(formValidity === FormValidity.VALID && confirmationModalText){
            let confirmationText: string[] = []
            

            confirmationText.push(`Are you sure you want to ${formCreateOffer.getAttribute('data-mode')} this offer:<br><br>`)
            confirmationText.push(`<b>Account / Wallet</b>:<br> ${formFields.account.element.options[formFields.account.element.selectedIndex].text}<br><br>`)


            // image carousel
            confirmationText.push(`<div id="carouselExample" class="carousel carousel-dark slide">`)
            confirmationText.push(`<div class="carousel-inner">`)
                
                confirmationText.push(`<div class="carousel-item active">`)
                    confirmationText.push(`<img src="${formFields.mainImage.element.value}" class="d-block w-100" loading="lazy">`)
                confirmationText.push(`</div>`)
         
                if(formFields.additionalImage1.element.value.length > 0){
                    confirmationText.push(`<div class="carousel-item ">`)
                     confirmationText.push(`<img src="${formFields.additionalImage1.element.value}" class="d-block w-100" loading="lazy">`)
                    confirmationText.push(`</div>`)
                }

                if(formFields.additionalImage2.element.value.length > 0){
                    confirmationText.push(`<div class="carousel-item ">`)
                     confirmationText.push(`<img src="${formFields.additionalImage2.element.value}" class="d-block w-100" loading="lazy">`)
                    confirmationText.push(`</div>`)
                }

                if(formFields.additionalImage3.element.value.length > 0){
                    confirmationText.push(`<div class="carousel-item ">`)
                     confirmationText.push(`<img src="${formFields.additionalImage3.element.value}" class="d-block w-100" loading="lazy">`)
                    confirmationText.push(`</div>`)
                }           

            confirmationText.push(`</div>`)

            confirmationText.push(`<button class="carousel-control-prev" type="button" data-bs-target="#carouselExample" data-bs-slide="prev">`)
                confirmationText.push(`<span class="carousel-control-prev-icon" aria-hidden="true"></span>`)
                confirmationText.push(`<span class="visually-hidden">Previous</span>`)
            confirmationText.push(`</button>`)

            confirmationText.push(`<button class="carousel-control-next" type="button" data-bs-target="#carouselExample" data-bs-slide="next">`)
                confirmationText.push(`<span class="carousel-control-next-icon" aria-hidden="true"></span>`)
                confirmationText.push(`<span class="visually-hidden">Next</span>`)
            confirmationText.push(`</button>`)        


            confirmationText.push(`</div>`)
            // end image carousel

            confirmationText.push(`<b>Title</b>:<br> ${formFields.title.element.value}<br><br>`)
            confirmationText.push(`<b>Brand</b>:<br> ${formFields.brand.element.value}<br><br>`)
            confirmationText.push(`<b>Product</b>:<br> ${formFields.product.element.value}<br><br>`)
            confirmationText.push(`<b>Short Description</b>:<br> ${formFields.shortDescription.element.value}<br><br>`)
            confirmationText.push(`<b>Long Description</b>:<br> ${formFields.longDescription.element.value.replace(/(?:\r\n|\r|\n)/g, '<br>')}<br><br>`)
            confirmationText.push(`<b>Return/Refund Policy</b>:<br> ${formFields.policy.element.value.replace(/(?:\r\n|\r|\n)/g, '<br>')}<br><br>`)
            confirmationText.push(`<b>Available Quantity</b>:<br> ${formFields.quantity.element.value}<br><br>`)
            confirmationText.push(`<b>Shipped From</b>:<br> ${ countries.find(cou => cou.country == formFields.shippedFrom.element.value)?.label }<br><br>`)

            if(formFields.usePricePeg.element.checked == true) {
                confirmationText.push(`<b>Price</b>:<br> ${formFields.pricePegged.element.value} ${formFields.pricePeg.element.options[formFields.pricePeg.element.selectedIndex].text} <br>`)
                confirmationText.push(`With a minimum of: ${formFields.minSfx.element.value} SFX<br><br>`)
            } else {
                confirmationText.push(`<b>Price<b>:<br> ${formFields.priceSfx.element.value} SFX (fixed) <br><br>`)
            }      
  
            confirmationModalText.innerHTML = confirmationText.join('')
            if(confirmationModalButton){
                confirmationModalButton.textContent =  "Done"
                confirmationModalButton.setAttribute("data-enable-reconfirm", "true")
                confirmationModalButton.setAttribute("data-return-modal", "createOfferModal");
            }
            
            createOfferModal.hide();
            confirmationModal.show();
            
        }
        
    })

}

// create offer for is also used for editing offers, with attributes set for data-mode=edit, and data-offer=<offer_id>
if(formCreateOffer){
    formCreateOffer.addEventListener('submit', async (e) => {
        e.preventDefault()

        if(! new Array(...formCreateOffer.classList).includes('was-validated')){
            return
        }    

        dismissAlert(AlertArea.MODAL_ALERT_AREA_CREATE_OFFER)
        dismissAlert(AlertArea.MODAL_ALERT_AREA_EDIT_OFFER)
        formCreateOffer.classList.remove('was-validated')

        const wallet = formCreateOffer.getAttribute("data-wallet")

        const formFields = {
            account : {
                element: document.querySelector('#select_create_offer_account') as HTMLSelectElement,
                validationMessage: [""]
            },
            title : {
                element: document.querySelector('#input_create_offer_title') as HTMLInputElement,
                validationMessage: [""]
            },
            brand : {
                element: document.querySelector('#input_create_offer_brand') as HTMLInputElement,
                validationMessage: [""]
            },
            product : {
                element: document.querySelector('#input_create_offer_product') as HTMLInputElement,
                validationMessage: [""]
            },
            shortDescription : {
                element: document.querySelector('#input_create_offer_short_description') as HTMLInputElement,
                validationMessage: [""]
            },
            quantity: {
                element: document.querySelector('#input_create_offer_qy') as HTMLInputElement,
                validationMessage: [""]
            },
            usePricePeg: {
                element: document.querySelector('#checkbox_create_offer_use_price_peg') as HTMLInputElement,
                validationMessage: [""]
            },
            priceSfx: {
                element: document.querySelector('#input_create_offer_price_sfx') as HTMLInputElement,
                validationMessage: [""]
            },
            pricePegged: {
                element: document.querySelector('#input_create_offer_price_pegged') as HTMLInputElement,
                validationMessage: [""]
            },
            pricePeg: {
                element: document.querySelector('#select_create_offer_price_peg') as HTMLSelectElement,
                validationMessage: [""]
            },
            minSfx: {
                element: document.querySelector('#input_create_offer_price_pegged_minimum') as HTMLInputElement,
                validationMessage: [""]
            },
            longDescription: {
                element: document.querySelector('#input_create_offer_long_description') as HTMLInputElement,
                validationMessage: [""]
            },
            policy: {
                element: document.querySelector('#input_create_offer_policy') as HTMLInputElement,
                validationMessage: [""]
            },
            mainImage: {
                element: document.querySelector('#input_create_offer_main_image') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalImage1: {
                element: document.querySelector('#input_create_offer_additional_image_1') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalImage2: {
                element: document.querySelector('#input_create_offer_additional_image_2') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalImage3: {
                element: document.querySelector('#input_create_offer_additional_image_3') as HTMLInputElement,
                validationMessage: [""]
            },
            mixin: {
                element: document.querySelector('#input_create_offer_mixin') as HTMLInputElement,
                validationMessage: [""]
            },
            active: {
                element: document.querySelector('#checkbox_create_offer_active') as HTMLInputElement,
                validationMessage: [""]
            },
            shippedFrom: {
                element: document.querySelector('#select_create_offer_country') as HTMLInputElement,
                validationMessage: [""]
            }
        }      

        if(wallet){

            const buttonCreateOffer = document.getElementById('btn_create_offer') as HTMLButtonElement
            if(buttonCreateOffer){
                buttonCreateOffer.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
                buttonCreateOffer.setAttribute("disabled", '')
            }

            const accountUsed = (await getAccounts()).find(account => account.uuid == formFields.account.element.value)
            const offerDescription: BB_OfferDescription = {
                schema: "BB",
                version: 1,
                description: {
                    brand: formFields.brand.element.value,
                    product: formFields.product.element.value,
                    shortDescription: formFields.shortDescription.element.value,
                    longDescription: formFields.longDescription.element.value,
                    policy: formFields.policy.element.value,
                    mainImage: formFields.mainImage.element.value,
                    image1: formFields.additionalImage1.element.value,
                    image2: formFields.additionalImage2.element.value,
                    image3: formFields.additionalImage3.element.value,
                    shippedFrom: formFields.shippedFrom.element.value
                }
            }
            
            let pricePegUsed = 0
            let price = parseFloat(formFields.priceSfx.element.value)
            let pricePegId = ""
            let minSfxPrice = 0
            let offerActive = 1
        
            if(formFields.active.element.checked == false){
                offerActive = 0
            }

            if(formFields.usePricePeg.element.checked){
                pricePegUsed = 1
                pricePegId = formFields.pricePeg.element.value
                price = parseFloat(formFields.pricePegged.element.value)
                minSfxPrice = parseFloat(formFields.minSfx.element.value)
            }

            let mode = formCreateOffer.getAttribute('data-mode')
            let existingOfferId = formCreateOffer.getAttribute('data-offer')

            if(accountUsed){


                let wsCon: WalletWsConnectionHandler = websocketConnectionManager.getConnection(wallet).wsConnection

                if(mode && mode == "edit" && existingOfferId){

                    //edit existing offer
                    wsCon.editOffer(
                        accountUsed.account,
                        existingOfferId,
                        formFields.title.element.value,
                        price,
                        parseInt(formFields.quantity.element.value),
                        offerDescription,
                        pricePegUsed,
                        pricePegId,
                        minSfxPrice,
                        offerActive,
                        parseInt(formFields.mixin.element.value)
                    )

                } else {

                    //create new offer
                    wsCon.createOffer(
                        accountUsed.account,
                        formFields.title.element.value,
                        price,
                        parseInt(formFields.quantity.element.value),
                        offerDescription,
                        pricePegUsed,
                        pricePegId,
                        minSfxPrice,
                        offerActive,
                        parseInt(formFields.mixin.element.value)
                    )

                }

                
            }
           
        }

        createOfferModal.hide()
        clearAllBackDrops()
    

    })

}



if(formHideOffer){
    formHideOffer.addEventListener('submit', async (e) => {
        e.preventDefault()

        const account = formHideOffer.getAttribute("data-account")
        const offerId = formHideOffer.getAttribute("data-offer")

        if(account && offerId){
                const removedOffer = await storeFrontRemoveOffer(account, offerId)        
                if(removedOffer.status == "OK"){
                    const hideButton = document.querySelector(`button[data-function=hide_in_store][data-account="${account}"][data-offer="${offerId}"]`)
                    const showButton = document.querySelector(`button[data-function=show_in_store][data-account="${account}"][data-offer="${offerId}"]`)
                    hideButton?.classList.add("d-none")
                    showButton?.classList.remove("d-none")
                }
        }

        hideOfferModal.hide()
        clearAllBackDrops()

    })

}

if(formShowOffer){
    formShowOffer.addEventListener('submit', async (e) => {
        e.preventDefault()

        const account = formShowOffer.getAttribute("data-account")
        const offerId = formShowOffer.getAttribute("data-offer")
        const {selectedCountriesCodes} = showOfferGetSelectedCountries()

        if(account && offerId && selectedCountriesCodes){
                const addedOffer = await storeFrontAddOffer(account, offerId, selectedCountriesCodes)        
                if(addedOffer.status == "OK"){
                    const hideButton = document.querySelector(`button[data-function=hide_in_store][data-account="${account}"][data-offer="${offerId}"]`)
                    const showButton = document.querySelector(`button[data-function=show_in_store][data-account="${account}"][data-offer="${offerId}"]`)
                    hideButton?.classList.remove("d-none")
                    showButton?.classList.add("d-none")
                } else {
                    if(addedOffer.error){
                        showToast("Error", addedOffer.error, 15000)
                    }
                }
        }

        showOfferModal.hide()
        clearAllBackDrops()

    })

}

if(confirmShowOfferButton){
    confirmShowOfferButton.addEventListener('click', async (e) => {
        e.preventDefault()
        
        dismissAlert(AlertArea.MODAL_ALERT_AREA_RESTORE_ACCOUNT)
        formShowOffer.classList.remove('was-validated')


        const {selectedCountriesLabels} = showOfferGetSelectedCountries()

        if(confirmationModalText && confirmationModalButton){   
            confirmationModalText.innerHTML = `Are you sure you want to make this offer visible in the following countries?:<br><br>${selectedCountriesLabels.join('<br>')}`
            confirmationModalButton.textContent = "Done"
            confirmationModalButton.setAttribute("data-return-modal", "showOfferModal");
            confirmationModalButton.setAttribute("data-enable-reconfirm", "true");
            showOfferModal.hide();
            confirmationModal.show();
        }
    })

}

function showOfferGetSelectedCountries(){
    const selectedCountriesCodes: string[] = []
    const selectedCountriesLabels: string[] = []

    const countryCheckBoxes = document.querySelectorAll(`input[data-function="show_offer_country"]`) 
    if(countryCheckBoxes){
        countryCheckBoxes.forEach((countryCheckBox )=>{

            if( (countryCheckBox as HTMLInputElement).checked){
                const country = countryCheckBox.getAttribute('data-country')
                if(country){
                    selectedCountriesCodes.push(country)
                    selectedCountriesLabels.push(countries.find(cou => cou.country == country)?.label || "")
                }
                
            }

        })
    }

    return { selectedCountriesCodes, selectedCountriesLabels }
}


async function showEditOfferModal(account: string, offerId: string, address: string){
    
        formCreateOffer.setAttribute('data-mode', 'edit')
        formCreateOffer.setAttribute('data-offer', offerId)
        formCreateOffer.reset()

        formFieldsCreateOffer.setAttribute('disabled', '')
        offerModalLabel.innerHTML = "Edit Offer"
        
        const userAccounts = await getAccounts()
        const userWallets = await getWallets()
        const pricePegs = await getPricePegs()

        if(pricePegs.length == 0 ){
            showToast("Error", "Could not fetch price pegs from selected store", 10000)
            return
        }

        const cashAvailable = document.getElementById("create_offer_cash_available") as HTMLSpanElement

        selectCreateOfferAccount.innerHTML = ""
        cashAvailable.innerHTML = ""
        selectPricePeg.innerHTML = ""

        selectCreateOfferAccount.options.add(new Option("", ""))

        userAccounts.forEach((userAccount)=>{
            if(userAccount.account == account){
                const accountWallet = userWallets.find(wallet => wallet.uuid == userAccount.wallet)
                const accountSelectOption = new Option(`${userAccount.account}  - [ ${accountWallet?.label} ]`, userAccount.uuid)
                if (accountWallet?.address == address){
                    accountSelectOption.setAttribute("selected", "selected")
                    selectCreateOfferAccount.setAttribute('disabled', '')
                }
                selectCreateOfferAccount.options.add(accountSelectOption)
            }                
        })            

        
        const sellerOffers = await getOffersFromDaemon(account)
        const offerData: DaemonOffer | undefined = sellerOffers.offers?.find(offer => offer.offer_id == offerId)
        if(!offerData){
            return
        }

        const formFields = {
            title : {
                element: document.querySelector('#input_create_offer_title') as HTMLInputElement,
                validationMessage: [""]
            },
            brand : {
                element: document.querySelector('#input_create_offer_brand') as HTMLInputElement,
                validationMessage: [""]
            },
            product : {
                element: document.querySelector('#input_create_offer_product') as HTMLInputElement,
                validationMessage: [""]
            },
            shortDescription : {
                element: document.querySelector('#input_create_offer_short_description') as HTMLInputElement,
                validationMessage: [""]
            },
            quantity: {
                element: document.querySelector('#input_create_offer_qy') as HTMLInputElement,
                validationMessage: [""]
            },
            usePricePeg: {
                element: document.querySelector('#checkbox_create_offer_use_price_peg') as HTMLInputElement,
                validationMessage: [""]
            },
            priceSfx: {
                element: document.querySelector('#input_create_offer_price_sfx') as HTMLInputElement,
                validationMessage: [""]
            },
            pricePegged: {
                element: document.querySelector('#input_create_offer_price_pegged') as HTMLInputElement,
                validationMessage: [""]
            },
            pricePeg: {
                element: document.querySelector('#select_create_offer_price_peg') as HTMLSelectElement,
                validationMessage: [""]
            },
            minSfx: {
                element: document.querySelector('#input_create_offer_price_pegged_minimum') as HTMLInputElement,
                validationMessage: [""]
            },
            longDescription: {
                element: document.querySelector('#input_create_offer_long_description') as HTMLInputElement,
                validationMessage: [""]
            },
            policy: {
                element: document.querySelector('#input_create_offer_policy') as HTMLInputElement,
                validationMessage: [""]
            },
            mainImage: {
                element: document.querySelector('#input_create_offer_main_image') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalImage1: {
                element: document.querySelector('#input_create_offer_additional_image_1') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalImage2: {
                element: document.querySelector('#input_create_offer_additional_image_2') as HTMLInputElement,
                validationMessage: [""]
            },
            additionalImage3: {
                element: document.querySelector('#input_create_offer_additional_image_3') as HTMLInputElement,
                validationMessage: [""]
            },
            active: {
                element: document.querySelector('#checkbox_create_offer_active') as HTMLInputElement,
                validationMessage: [""]
            },
            shippedFrom: {
                element: document.querySelector('#select_create_offer_country') as HTMLInputElement,
                validationMessage: [""]
            }
        }

        formFields.title.element.value = offerData.title
        formFields.quantity.element.value = offerData.quantity.toString()

        if (offerData.price_peg_used){
            areaNoPricePeg.classList.add("d-none")
            areaWithPricePeg.classList.remove("d-none")
            formFields.usePricePeg.element.checked = true
            formFields.pricePegged.element.value = toNormalUnits(offerData.price).toString()
            formFields.minSfx.element.value = toNormalUnits(offerData.min_sfx_price).toString()
            // price peg
        } else {
            areaNoPricePeg.classList.remove("d-none")
            areaWithPricePeg.classList.add("d-none")
            formFields.usePricePeg.element.checked = false
            formFields.priceSfx.element.value = toNormalUnits(offerData.price).toString()
        }

        let parsedOffer: any
        let parsedOfferData: TWM_OfferDescription | BB_V1

        try {

            parsedOffer = JSON.parse(String.fromCharCode.apply(null, offerData.description))  

            if(parsedOffer.twm_version){
                parsedOfferData = parsedOffer as TWM_OfferDescription
        
                if(parsedOfferData.description){
                    formFields.longDescription.element.value = parsedOfferData.description
                }
        
                if(parsedOfferData.main_image){
                    formFields.mainImage.element.value = parsedOfferData.main_image
                }
        
                if(parsedOfferData.image_2){
                    formFields.additionalImage1.element.value = parsedOfferData.image_2
                }
        
                if(parsedOfferData.image_3){
                    formFields.additionalImage2.element.value = parsedOfferData.image_3
                }
        
                if(parsedOfferData.image_4){
                    formFields.additionalImage3.element.value = parsedOfferData.image_4
                }    

            }

            if(parsedOffer.schema && parsedOffer.schema == "BB"){
                parsedOfferData = parsedOffer.description as BB_V1

                if(parsedOfferData.brand){
                    formFields.brand.element.value = parsedOfferData.brand
                }
        
                if(parsedOfferData.product){
                    formFields.product.element.value = parsedOfferData.product
                }
        
                if(parsedOfferData.shortDescription){
                    formFields.shortDescription.element.value = parsedOfferData.shortDescription
                }
        
                if(parsedOfferData.longDescription){
                    formFields.longDescription.element.value = parsedOfferData.longDescription
                }

                if(parsedOfferData.policy){
                    formFields.policy.element.value = parsedOfferData.policy
                }
        
                if(parsedOfferData.mainImage){
                    formFields.mainImage.element.value = parsedOfferData.mainImage
                }
        
                if(parsedOfferData.image1){
                    formFields.additionalImage1.element.value = parsedOfferData.image1
                }
        
                if(parsedOfferData.image2){
                    formFields.additionalImage2.element.value = parsedOfferData.image2
                }
        
                if(parsedOfferData.image3){
                    formFields.additionalImage3.element.value = parsedOfferData.image3
                } 

                if(parsedOfferData.shippedFrom){
                    formFields.shippedFrom.element.value = parsedOfferData.shippedFrom
                }
               
            }

        } catch (error) {
           // just ignore this and dont fill any of the detailed fields
        }

        // fill select with price pegs and select the one that was used in the offer
        pricePegs.forEach((peg)=>{
            const pricePegSelectOption = new Option(`${peg.currency}  - [ 1 SFX = ${ (1 / toNormalUnits(peg.rate)).toFixed(4) + ' ' + peg.currency  } ] - [ ${peg.creator} ]`, peg.price_peg_id)
            if(offerData.price_peg_id == peg.price_peg_id){
                pricePegSelectOption.setAttribute('selected', 'selected')
            }
            selectPricePeg.options.add(pricePegSelectOption)
        })

        //reset form validation and buttons
        formCreateOffer.classList.remove('was-validated')
        confirmCreateOfferButton?.classList.remove("d-none")
        createOfferButton?.classList.add("d-none")
        syncCreateOfferStatusSpinner.classList.add("d-none")      

        const buttonCreateOffer = document.getElementById('btn_create_offer') as HTMLButtonElement
        if(buttonCreateOffer){
            buttonCreateOffer.innerHTML = 'Save Changes!'
            buttonCreateOffer.removeAttribute("disabled")
        }

        document.getElementById('modal_alert_area_create_offer')?.classList.add('d-none')
        document.getElementById('modal_alert_area_edit_offer')?.classList.remove('d-none')

        createOfferModal.show()
        //get account, wallet, and available funds
        await retrieveAccountData()

}

async function initialLoad(): Promise<boolean>{
    await clearListingResults() 
    return true
}


export async function clearListingResults(): Promise<true>{
    containerListingsOverview.innerHTML = ""
    return true;    
}

async function showHideOfferModal(account: string | null, offerId: string| null){
    if(account && account !== null && offerId && offerId !== null){

        formHideOffer.setAttribute('data-account', account)
        formHideOffer.setAttribute('data-offer', offerId)

        if(confirmationModalText){
            confirmationModalText.innerHTML = `Are you sure you want to hide<br><br> <b>Offer:</b><br> ${offerId} <br><br> <b>In store</b>:<br><br> ${(await getStore()).url}`
            confirmationModalButton?.setAttribute("data-return-modal", "hideOfferModal");
            confirmationModal.show();
        }
       
    }
}

function showShowOfferModal(account: string | null, offerId: string | null){
    if(account && account !== null && offerId && offerId !== null){
        formShowOffer.setAttribute('data-account', account)
        formShowOffer.setAttribute('data-offer', offerId)

        formShowOffer.classList.remove('was-validated')
        formShowOffer.reset()
        const buttonShow = document.getElementById('btn_show_offer') as HTMLButtonElement
        if(buttonShow){
            buttonShow.innerHTML = 'Show!'
            buttonShow.removeAttribute("disabled")
        }

        showOfferModal.show()

    }
}

async function displayResults(daemonOffers: DaemonOffer[]): Promise<boolean>{

    global_listingsDaemonPricePegs = (await getPricePegsFromDaemon()).price_pegs || []
    global_userWallets = await getWallets()
    global_sellerApiOffersRegistered = await storeFrontGetOffersDetails(selectAccount.value)
    global_bcHeight = (await getDaemonHeight()).height

    if(global_sellerApiRegistrationStatus == "ERROR_PUBKEY_DOES_NOT_MATCH"){
        containerListingsOverview.innerHTML = ""
        return false
    }

    daemonOffers.forEach((offer)=>{
        
        let parsedOffer: any
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
    
    })


    initializeTooltips()

    const showInStoreButtons = document.querySelectorAll("button[data-function=show_in_store]")
    if(showInStoreButtons){
        showInStoreButtons.forEach((showInStoreButton)=>{
            showInStoreButton.addEventListener('click', function(){ showShowOfferModal(showInStoreButton.getAttribute('data-account'), showInStoreButton.getAttribute('data-offer'));}, false)
            if(Array.isArray(global_sellerApiOffersRegistered)){
                if(global_sellerApiOffersRegistered.find(registeredOffer=>registeredOffer.offerId == showInStoreButton.getAttribute('data-offer'))){
                    showInStoreButton.classList.add("d-none")
                } else {
                    showInStoreButton.classList.remove("d-none")
                }
            } else {
                showInStoreButton.classList.add("d-none")
            }
            
        })
    }

    const hideInStoreButtons = document.querySelectorAll("button[data-function=hide_in_store]")
    if(hideInStoreButtons){
        hideInStoreButtons.forEach((hideInStoreButton)=>{
            hideInStoreButton.addEventListener('click', function(){ showHideOfferModal(hideInStoreButton.getAttribute('data-account'), hideInStoreButton.getAttribute('data-offer'));}, false)
            if(Array.isArray(global_sellerApiOffersRegistered)){
                const sellerOffer = global_sellerApiOffersRegistered.find(registeredOffer=>registeredOffer.offerId == hideInStoreButton.getAttribute('data-offer'))
                if(sellerOffer){
                    hideInStoreButton.classList.remove("d-none")
                    document.querySelector(`[data-offer-inactive-alert="${hideInStoreButton.getAttribute('data-offer')}"]`)?.classList.remove('d-none')
                } else {
                    hideInStoreButton.classList.add("d-none")
                }
            } else {
                hideInStoreButton.classList.add("d-none")
            }
            
        })
    }

    const editOfferButtons = document.querySelectorAll("i[data-function=edit_offer]")
    if(editOfferButtons){
        editOfferButtons.forEach((editOfferButton)=>{
            editOfferButton.addEventListener('click', function(){ showEditOfferModal(editOfferButton.getAttribute('data-account') || "", editOfferButton.getAttribute('data-offer') || "", editOfferButton.getAttribute('data-address') || "");}, false)
        })
    }

    return true
}

function addFormattedCard(offer: DaemonOffer, parsedOfferData: BB_OfferDescription){

    let offerCard = document.createElement('div')
    containerListingsOverview.appendChild(offerCard)

    let card: string[] = []
    card.push(`<div class="col">`)
        card.push(`<div class="card h-100 me-3 offer_card" style="width: 20rem;">`)

        if(parsedOfferData.description.mainImage){
            card.push(`<img src="${parsedOfferData.description.mainImage}" class="card-img-top offer_card_image p-2" alt="main image" loading="lazy">`)
        }

            card.push(`<div class="card-body mb-0 pb-0">`)
                card.push(`<h5 class="card-title">${offer.title}</h5>`)
                card.push(`<p class="card-text offer_card_description"><b>Brand: </b>${parsedOfferData.description.brand}<br><b>Product/Model: </b>${parsedOfferData.description.product}<br><b>Shipped From: </b>${countries.find(cou => cou.country == parsedOfferData.description.shippedFrom)?.label}</p>`)
            card.push(`</div>`)

            card.push(`<div class="card-body mb-0 pb-0">`)
                card.push(`<p class="card-text offer_card_description">${parsedOfferData.description.shortDescription}<br><br>${ cropString(parsedOfferData.description.longDescription, 200)}</p>`)
            card.push(`</div>`)


            addCommonInfoToCard(offer, card)
            addCommonFooterToCard(offer, card)

        card.push(`</div>`)
    card.push(`</div>`)

    offerCard.outerHTML = card.join('')
}

function addTWMCard(offer: DaemonOffer, parsedOfferData: TWM_OfferDescription){

    let offerCard = document.createElement('div')
    containerListingsOverview.appendChild(offerCard)

    let card: string[] = []
    card.push(`<div class="col">`)
        card.push(`<div class="card h-100 me-3 offer_card" style="width: 20rem;">`)

            if(parsedOfferData.main_image){
                card.push(`<img src="${parsedOfferData.main_image}" class="card-img-top offer_card_image p-2" alt="main image" loading="lazy">`)
            }

            card.push(`<div class="card-body mb-0 pb-0">`)
             card.push(`<h5><span class="badge bg-info">TWM Offer</span></h5>`)
                card.push(`<h5 class="card-title">${offer.title}</h5>`)
                card.push(`<p class="card-text offer_card_description">${ cropString(parsedOfferData.description, 200) }</p>`)
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
    containerListingsOverview.appendChild(offerCard)

    let card: string[] = []
    card.push(`<div class="col">`)
        card.push(`<div class="card h-100 me-3 offer_card" style="width: 20rem;">`)

            card.push(`<div class="card-body">`)
                card.push(`<h5><span class="badge bg-info">Unknown offer format</span></h5>`)
                card.push(`<h5 class="card-title">${offer.title}</h5>`)
                card.push(`<p class="card-text offer_card_description">${String.fromCharCode.apply(null, offer.description) }</p>`)
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

    card.push(`<div class="card-footer">`)
        card.push(`<div class="row align-items-center">`)
        card.push(`<div class="col-auto">`)

        if(global_sellerApiRegistrationStatus == "APPROVED"){
                card.push(`<small class="text-body-primary"><button class="btn btn-warning" data-function="hide_in_store" data-account="${selectAccount.value}" data-offer="${offer.offer_id}">Hide In Store</button></small>`)
                card.push(`<small class="text-body-primary"><button class="btn btn-success" data-function="show_in_store" data-account="${selectAccount.value}" data-offer="${offer.offer_id}">Show In Store</button></small>`)
                
                const sellerOffer = global_sellerApiOffersRegistered.find(registeredOffer=>registeredOffer.offerId == offer.offer_id)
                if(sellerOffer){
                    const offerCountryLabels: string[] = [] 
                    sellerOffer.countries.forEach(country =>{
                        const label = countries.find(cou => cou.country == country)
                        if(label){
                            offerCountryLabels.push(label.label)
                        }
                    })

                    card.push(`<small class="text-body-primary"><i class='bx bx-world ms-2 fs-4 walleticons' style="vertical-align: middle;" data-function="show_offer_countries" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-html="true" data-bs-title="${offerCountryLabels.join(', ')}" ></i></small>`)
                }
                
                
        }
        card.push(`</div>`)
        card.push(`<div class="col d-flex justify-content-end">`)
        if(global_bcHeight && global_bcHeight -10 >= offer.height){
            card.push(`<small class="text-body-primary"><i class='bx bxs-edit ms-3 fs-4 walleticons' data-function="edit_offer" data-account="${selectAccount.value}" data-offer="${offer.offer_id}" data-address="${offer.seller_address}" ></i></small>`)
        }
        
        card.push(`</div>`)

        card.push(`</div>`)

    
    card.push(`</div>`)

}

function addCommonInfoToCard(offer: DaemonOffer, card: string[]){


    card.push(`<div class="card-body mb-0 pb-0">`)
        card.push(`<p class="card-text offer_card_description"><b>Quantity: </b>${offer.quantity} <br><b>Active: </b>${offer.active ? "Yes": "No" }`)
        if(offer.active == false){
            card.push(`<i class="bx bxs-info-circle d-none" data-offer-inactive-alert="${offer.offer_id}" style="color:#f00; margin-bottom: 2px; margin-left: 5px;" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-custom-class="custom-tooltip" data-bs-html="true" data-bs-title="Please hide inactive offers from the store"></i>`)
        }
        
        card.push(`</p>`)
    card.push(`</div>`)

    if(!offer.price_peg_used){
        card.push(`<div class="card-body mb-0 pb-0">`)
        card.push(`<p class="card-text offer_card_description"><b>Price: </b>${ toNormalUnits(offer.price)}  SFX (fixed)</p>`)
        card.push(``)
        card.push(`</div>`)
    } else {
        const usedPeg = global_listingsDaemonPricePegs.find(peg => peg.price_peg_id == offer.price_peg_id)

        if(usedPeg){
            card.push(`<div class="card-body mb-0 pb-0">`)
                card.push(`<p class="card-text offer_card_description"><b>Price: </b>${toNormalUnits(offer.price)} ${usedPeg.currency} <i class="bx bxs-info-circle" style="color:#628d97; margin-bottom: 2px; margin-left: 5px;" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-custom-class="custom-tooltip" data-bs-html="true" data-bs-title="Using ${usedPeg.currency} peg with title '${usedPeg.title}' and description '${String.fromCharCode.apply(null, usedPeg.description)}', created by '${usedPeg.creator}'<br><br>id: ${usedPeg.price_peg_id}"></i><br>Minimum: ${toNormalUnits(offer.min_sfx_price)} SFX</p>`)
                card.push(``)
            card.push(`</div>`)
        }
        
    }
    

    const usedWallet = global_userWallets.find(wallet => wallet.address == offer.seller_address)
    let usedWalletLabel = ""
    if(usedWallet) {
        usedWalletLabel = usedWallet.label
    } else {
        usedWalletLabel = `Unkown  <i class="bx bxs-info-circle" style="color:#f00; margin-bottom: 2px; margin-left: 5px;vertical-align: middle;" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-custom-class="custom-tooltip" data-bs-title="This offer was createad by an unknown wallet with addess '${offer.seller_address}'; if the offer gets purchased the funds will go to this address. Consider deactivating this offer or restore the corresponding wallet."></i>`
    }

    card.push(`<div class="card-body mb-0 pb-0">`)
        card.push(`<p class="card-text offer_card_description"><b>Wallet: </b>${usedWalletLabel}<br><b>Block: </b>${offer.height}</p>`)
        card.push(``)
    card.push(`</div>`)

}


export async function populateAcountList(){
    selectAccount.innerHTML = ""
    
    const userAccounts = await getAccounts()
    const addedAccounts: string[] = []
    userAccounts.forEach((account)=>{
        if(!addedAccounts.includes(account.account)){
            if(account.status == 2){
                addedAccounts.push(account.account)
                selectAccount.options.add(new Option(account.account, account.account))
            }
           
        }
    })            

    if(addedAccounts.length == 0){
        containerListingsCreateOffer.classList.add("d-none")
        containerListingsSelectAccount.classList.add("d-none")
        containerListingsNoAccountWarning.classList.remove("d-none")
    }

    return true
           
}

export async function checkSellerRegistration(): Promise<string | undefined> {
    
    buttonRegistrationRegister.classList.add("d-none")
    buttonRegistrationPending.classList.add("d-none")
    buttonRegistrationRevoke.classList.add("d-none")
    buttonRegistrationRejected.classList.add("d-none")
    buttonRegistrationError.classList.add("d-none")
    
    const registrationStatus = await storeFrontGetSellerRegistrionCheck(selectAccount.value)
    
    if(registrationStatus.error){
        buttonRegistrationError.classList.remove("d-none")
        tooltipRegistration.setAttribute('data-bs-title', "Unable to retrieve registration status on this store. Please try again later.")
        showToast("Error", registrationStatus.error, 15000)
    } else {
        switch(registrationStatus.status){
            case "APPROVED":
                buttonRegistrationRevoke.classList.remove("d-none")
                tooltipRegistration.setAttribute('data-bs-title', "Your registration with this store is approved, you are now able to list offers in this store. You can revoke this registration if you dont want to be active in this store anymore.")
                break;
            case "BANNED":
                buttonRegistrationRejected.classList.remove("d-none")
                tooltipRegistration.setAttribute('data-bs-title', "Your registration with this store was rejected, you can not list offers in this store.")
                break;
            case "NEW":
                buttonRegistrationPending.classList.remove("d-none")
                tooltipRegistration.setAttribute('data-bs-title', "Your registration request was recieved by the store and is now pending approval.")
                break;
            case "NOT_FOUND":
                buttonRegistrationRegister.classList.remove("d-none")
                tooltipRegistration.setAttribute('data-bs-title', "You are not yet registered with this store. Please submit a registration request. Once your registration has been approved you can list offers in this store.")
                break;
            case "ERROR_NO_REMOTE_PUBKEY":
                buttonRegistrationError.classList.remove("d-none")
                tooltipRegistration.setAttribute('data-bs-title', "Unable to perform registration check [missing remote pubkey]")
                break;
            case "ERROR_PUBKEY_DOES_NOT_MATCH":
                buttonRegistrationError.classList.remove("d-none")
                tooltipRegistration.setAttribute('data-bs-title', "This account is registered at this store, but it seems to be registered from another user. If you are sure you want to use this account here, revoke the registration from the other user first. If you dont have access anymore contact the Store Front operator do remove your registration.")
                showToast("Attention!", "This account is registered at this store, but it seems to be registered from another user.", 15000)
                break;
        }
        return registrationStatus.status
    }

    initializeTooltips()

    return undefined

}


if(iconSyncAccounts){
    iconSyncAccounts.addEventListener('click', async (e) => {
        e.preventDefault()
        await populateAcountList()
    })
}

if(iconSyncRegistration){
    iconSyncRegistration.addEventListener('click', async (e) => {
        e.preventDefault()
        await checkSellerRegistration()
    })
}

async function initListings(){
    if(formListingsSelect === undefined || formListingsSelect === null){
        return
    }
    await populateAcountList()
    await initialLoad()

   initializeTooltips()
}

initListings()


