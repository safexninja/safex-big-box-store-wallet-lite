// @ts-nocheck
import { clearStore, getStore, getUserStores, setStore } from './apicalls'
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

let global_VisitedStores: string[] = []

async function loadVistedStores() {
    global_VisitedStores = await getUserStores()
    autocomplete(inputStoreFrontUrl, global_VisitedStores);
}

loadVistedStores()

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
        global_VisitedStores = await getUserStores()
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


function autocomplete(input: any, suggestionsArray: any) {
  
    var currentFocus: number;

    input.addEventListener("input", function(e) {
        console.log("input in text box: " + this.value)
        var autoCompleteSuggestions: HTMLDivElement, suggestion: HTMLElement, i: number, val = this.value;
      
        closeAllLists();
  
        currentFocus = -1;

        autoCompleteSuggestions = document.createElement("DIV") as HTMLDivElement;
        autoCompleteSuggestions.setAttribute("id", this.id + "autocomplete-list");
        autoCompleteSuggestions.setAttribute("class", "autocomplete-items");

        this.parentNode.appendChild(autoCompleteSuggestions);

        // loop auto fill array
        for (i = 0; i < suggestionsArray.length; i++) {

          if (suggestionsArray[i].toLowerCase().includes(val.toLowerCase())) {
            suggestion = document.createElement("DIV");
            suggestion.innerHTML = suggestionsArray[i].replace(val, "<span style='color:#ff8f00;font-weight:bold;'>" + val + "</span>" )
            suggestion.innerHTML += "<input type='hidden' value='" + suggestionsArray[i] + "'>";

            //add eventlistener for clicked suggestion
            suggestion.addEventListener("click", function(e: any) {
              input.value = this.getElementsByTagName("input")[0].value;
              closeAllLists();
            });
            autoCompleteSuggestions.appendChild(suggestion);
          }
        }
    });

    /*addd eventlistener for keydown event on keyboard*/
    input.addEventListener("keydown", function(e: { keyCode: number; preventDefault: () => void }) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div") as HTMLCollectionOf<HTMLElement>;
        if (e.keyCode == 40) {
          currentFocus++;

          addActive(x);
        } else if (e.keyCode == 38) { 
          currentFocus--;

          addActive(x);
        } else if (e.keyCode == 13) {

          e.preventDefault();
          if (currentFocus > -1) {

            if (x) x[currentFocus].click();
          }
        }
    });

    function addActive(x: string | any[] | HTMLElement | null) {
      if (!x) return false;
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = (x.length - 1);
      x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
      for (var i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
      }
    }
    function closeAllLists() {
      var x: HTMLElement[] = document.querySelectorAll(".autocomplete-items") as HTMLElement[];
      x.forEach(element => {
        element.remove()
      });
      
  }

  // add event listener to document for when is clicked outside of the suggestions
  document.addEventListener("click", function (e) {
      closeAllLists();
  });
  }

