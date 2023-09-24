
import { getUserRegistrations, getUserSettings, saveUserSettings } from './apicalls'
import { showToast as showToast } from './toast'
import { countries } from '../../../common/constants/countries'
import { convertTimestampToDate } from '../../../common/utils/dates'

const formUserSettings = document.querySelector('#form_user_settings') as HTMLFormElement
const selectDefaultCountry = document.querySelector('#select_default_country') as HTMLSelectElement
const inputDefaultAddress = document.querySelector('#input_default_address') as HTMLInputElement
const inputDaemonAddress = document.querySelector('#input_settings_daemon_address') as HTMLInputElement
const inputExplorerAddress = document.querySelector('#input_settings_explorer_address') as HTMLInputElement
const containerActiveRegistrations = document.getElementById('user_active_registations') as HTMLDivElement


// if form is present
if(formUserSettings){
    formUserSettings.addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const savedSettings = await saveUserSettings(selectDefaultCountry.value, inputDefaultAddress.value, inputDaemonAddress.value, inputExplorerAddress.value)
        if(!savedSettings){
            showToast("Error", "Something went wrong while trying to save your settings", 15000)
        } else{
            showToast("Saved!", "Your settings are saved, application will reload ...", 5000)
        }
        
        setTimeout(()=>{
            window.location.reload()
        }, 700)
       
    })

}

export async function populateCountryList(): Promise<boolean> {
    countries.forEach((country)=>{
        selectDefaultCountry.options.add(new Option(country.label, country.country))
    })            

    return true
           
}

async function initialLoadSettings(): Promise<boolean>{

    const settings = await getUserSettings()
    if(settings && settings.defaultAddress){
        selectDefaultCountry.value = settings.defaultCountry
        inputDefaultAddress.value = settings.defaultAddress
        inputDaemonAddress.value = settings.daemonAddress
        inputExplorerAddress.value = settings.explorerAddress
    }

    containerActiveRegistrations.innerHTML = ""
    const userRegistrations = await getUserRegistrations()
    userRegistrations.forEach((registration)=>{

        let registrationRow = document.createElement('div')
            let registrationRowData: string[] = []
    
    
            registrationRowData.push(`<div class="card border mb-3">`)
        
                registrationRowData.push(`<div class="card-body">`)
                    registrationRowData.push(`<div class="row text_small">`)
                        registrationRowData.push(`<div class="col-4"><b>URL</b><br>${registration.url}</div>`)
                        registrationRowData.push(`<div class="col-3"><b>Account:</b><br>${registration.account}</div>`)
    
                        registrationRowData.push(`<div class="col-2"><b>Date/Time:</b><br>${convertTimestampToDate(registration.timestamp)}</div>`)
                    registrationRowData.push(`</div>`)
                registrationRowData.push(`</div>`)
            registrationRowData.push(`</div>`)
    
            containerActiveRegistrations.appendChild(registrationRow)
            registrationRow.outerHTML = registrationRowData.join('')

    })


    return true
}

async function initSettings(){
    if(formUserSettings === undefined || formUserSettings === null){
        return
    }
    await populateCountryList()
    await initialLoadSettings()
}

initSettings()
