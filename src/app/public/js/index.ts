import { fetchMessages, getDaemonInfo, getDaemonStakedTokens, getErrorLog, getLogsLastSeen, getUserName, getUserSettings, getUserTerms, logout, refreshAuthToken, setUserTermsAccepted, validateAuthToken } from './apicalls'
import * as bootstrap from 'bootstrap'
import { roundToThreeDecimals, toNormalUnits } from '../../../common/utils/units'
import { userTermsModal } from './modals'
import { ErrorLogSeverity } from '../../../common/db/enums/errorlog'
import { showToast } from './toast'

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

export var explorerAddress: string

async function getExplorerUrl(){
    const settings = await getUserSettings()
    if(settings && settings.explorerAddress){
        explorerAddress = settings.explorerAddress
    }
}
getExplorerUrl()

async function updateHeaderBlockChainHeight(){
    const blockchainHeight = document.getElementById('bc_sync_header_height') as HTMLElement
    const blockchainSyncSpinner = document.getElementById('bc_sync_header_spinner')  as HTMLElement
    const blockchainHeader = document.getElementById('bc_sync_header') as HTMLElement
    const nextStakingInterval = document.getElementById('next_staking_interval') as HTMLElement
    const totalStakedTokens = document.getElementById('total_staked_tokens') as HTMLSpanElement

    if(blockchainHeight){
        const info = await getDaemonInfo()
        const stakedTokens = await getDaemonStakedTokens()

        if(info && !info.target_height){
            info.target_height = 1
        }
        

        if(!info.error && info && info.height && info.target_height ){
            if(info.height < info.target_height){
                blockchainSyncSpinner.classList.remove('d-none')
                blockchainHeader.classList.add('bc_syncing')
                blockchainHeight.innerText = `${(info.height || 0).toString()} (${
                    roundToThreeDecimals((info.height / info.target_height) * 100)
                }%)`   
            } else {
                blockchainSyncSpinner.classList.add('d-none')
                blockchainHeader.classList.remove('bc_syncing')
                blockchainHeight.innerText = (info.height || 0).toString() 
                if(info.height > 0){
                    nextStakingInterval.innerHTML = (1000 - (info.height % 1000)).toString()
                    totalStakedTokens.innerHTML = toNormalUnits(stakedTokens.staked).toString()
                }
                
            }
        }
    }

    
}

async function setUserName(){
    const userNamePlaceholder = document.getElementById('user_name') as HTMLSpanElement
    const userName = await getUserName()
    userNamePlaceholder.innerHTML = userName.username

}

async function checkUserTerms(){
    const userTerms = await getUserTerms()
    if(userTerms.status != "OK"){

        const btnAcceptUserTerms = document.getElementById('accept_user_terms') as HTMLButtonElement
        const btnDeclineUserTerms = document.getElementById('decline_user_terms') as HTMLButtonElement

        if(btnAcceptUserTerms){
            btnAcceptUserTerms.addEventListener('click', async (e) => {
                e.preventDefault()
        
                await setUserTermsAccepted()
                await refreshAuthToken()
                userTermsModal.hide()
            })
        
        }

        if(btnDeclineUserTerms){
            btnDeclineUserTerms.addEventListener('click', async (e) => {
                e.preventDefault()
                await logout()
                window.location.reload()
            })
        }

        userTermsModal.show()
    }

}

async function checkNewLogs(){
    const navIconLogs = document.getElementById('nav_icon_logs') as HTMLElement
    const logsLastSeen = await getLogsLastSeen()
    if(logsLastSeen.timestamp){
        const logEntries = await getErrorLog(logsLastSeen.timestamp)
        const newImportantEntries = logEntries.filter(entry => entry.timestamp >= logsLastSeen.timestamp && [ErrorLogSeverity.ERROR, ErrorLogSeverity.FATAL].includes(entry.severity))
        if(newImportantEntries.length > 0 ){
            showToast("Important!", "You have new important notifications in the Logs. Please read them", 30000)
            navIconLogs.classList.add('nav_icon_unread')
        } else {
            navIconLogs.classList.remove('nav_icon_unread')
        }
    }
}

setTimeout(()=>{
    checkNewLogs()
}, 15000)

setInterval(async function() {
    updateHeaderBlockChainHeight()
}, 15000);

setInterval(async function() {
    fetchMessages()
}, 60000);

setInterval(async function() {
    checkNewLogs()
    validateAuthToken()
}, 60000);


setUserName()
checkUserTerms()
fetchMessages()
updateHeaderBlockChainHeight()