import { clearStore, getStore, setStore } from './apicalls'
import { handleFormValidation, } from './formvalidation'
import { ActiveStore, SetStoreResult } from './interfaces'
import { showToast as showToast } from './toast'
import { AlertArea, dismissAlert, isValidHttpsUrl, removeTrailingSlash } from './utils'
import { clearListingResults } from './listings'
import { clearMarketResults, initialLoadMarket } from './market'
const formSetStore = document.querySelector('#form_set_store') as HTMLFormElement
const inputStoreFrontUrl = document.querySelector('#input_store_url') as HTMLInputElement
const btnSetStore = document.querySelector('#btn_set_store') as HTMLButtonElement
const btnLeaveStore = document.querySelector('#btn_leave_store') as HTMLButtonElement

function enableForm() {
    inputStoreFrontUrl.disabled = false
    btnSetStore.innerHTML = "Connect"
    btnSetStore.classList.remove('d-none')
    btnLeaveStore.classList.add('d-none')
}

function disableForm() {
    inputStoreFrontUrl.disabled = true
    btnSetStore.classList.add('d-none')
    btnLeaveStore.classList.remove('d-none')
    
}

async function loadCurrentStore() {
    const activeStoreFrontApi: ActiveStore = await getStore();
    if(activeStoreFrontApi.url){
        inputStoreFrontUrl.value = activeStoreFrontApi.url
        disableForm()
        return
    } 
    enableForm()
}


async function leaveStore(): Promise<boolean> {

    clearListingResults()
    clearMarketResults()
    
    const storeCleared: Boolean = await clearStore();
    if(storeCleared){
        enableForm()
        return true
    }
    return false
}


// if form is present
if(formSetStore){
    
    // show current store in navigation / address field
    loadCurrentStore()

    // add event listener to leave button
    btnLeaveStore.addEventListener('click', async (e)=> {
        await leaveStore()
    })

    // add event listener to connect button

    formSetStore.addEventListener('submit', async (e) => {
        e.preventDefault()

        btnSetStore.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
        dismissAlert(AlertArea.ALERT_AREA)
        formSetStore.classList.remove('was-validated')

        const formFields = {
            storeUrl : {
                element: inputStoreFrontUrl,
                validationMessage: [""]
            }
        }
        

        if (!isValidHttpsUrl(formFields.storeUrl.element.value)) {
            formFields.storeUrl.validationMessage.push("This is not a valid https URL")
            handleFormValidation(formFields)
            btnSetStore.innerHTML = "Connect"
            formSetStore.classList.add('was-validated')
            return
        } 
           
        const setStoreResult: SetStoreResult = await setStore(removeTrailingSlash(formFields.storeUrl.element.value))

        if(setStoreResult.error){
                formFields.storeUrl.validationMessage.push(setStoreResult.error)
                handleFormValidation(formFields)
                btnSetStore.innerHTML = "Connect"
                formSetStore.classList.add('was-validated')
                return
        }

        if(setStoreResult.status && setStoreResult.status !== "OK"){
                formFields.storeUrl.validationMessage.push("Store status: " + setStoreResult.status)
                handleFormValidation(formFields)
                btnSetStore.innerHTML = "Connect"
                formSetStore.classList.add('was-validated')
                return
        }



        handleFormValidation(formFields)
        formSetStore.classList.remove('was-validated')
        disableForm()

        if(setStoreResult.message){
            showToast("Message from store", setStoreResult.message, 20000)
        }

        initialLoadMarket()
        
       
    })

}
