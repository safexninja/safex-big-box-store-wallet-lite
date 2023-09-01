

import { getOpenOrders, OpenOrder, getClosedOrders, ClosedOrder, getWallets, refreshAuthToken, setOrderValidation, getErrorLog, getLogsLastSeenTouch } from './apicalls'
import { convertTimestampToDate } from '../../../common/utils/dates'
import { PollUntil } from 'poll-until-promise'
import { createAccountModal, clearAllBackDrops } from './modals'
import { WalletWsConnectionHandler, websocketConnectionManager, WsCheckTxnProofState } from './websocket'
import { toNormalUnits } from '../../../common/utils/units'
import { showMessageAndManageModal } from './managing'
import { ErrorLogSeverity } from '../../../common/db/enums/errorlog'

const buttonLoadLogs = document.getElementById('button_load_logs') as HTMLButtonElement
const containerLogs = document.getElementById('container_logs') as HTMLElement
const navIconLogs = document.getElementById('nav_icon_logs') as HTMLElement

if(buttonLoadLogs){
    buttonLoadLogs.addEventListener('click', async (e) => {
        e.preventDefault()

        containerLogs.innerHTML = ""

        const logs = await getErrorLog(0)
        await getLogsLastSeenTouch()

        if(logs.length == 0){
            containerLogs.innerHTML = "No log yet ..."
        }

        logs.forEach((log)=>{
            

            let logRow = document.createElement('div')
            let logRowData: string[] = []
    
    
            logRowData.push(`<div class="card border mb-3">`)
            let displayClass: string

            switch (log.severity){

                case ErrorLogSeverity.INFO :
                    displayClass = "text-info"
                    break;
                case ErrorLogSeverity.WARNING:
                    displayClass = "text-warning"
                    break;
                case ErrorLogSeverity.ERROR:
                    displayClass = "text-danger"
                    break;
                case ErrorLogSeverity.FATAL:
                    displayClass = "bg-danger text-white"
                    break;
                default:
                    displayClass = "text-info"
                    break;
            }
        
                logRowData.push(`<div class="card-body">`)
                    logRowData.push(`<div class="row text_small">`)
                        logRowData.push(`<div class="col-1"><b>Component</b><br>${log.component}</div>`)
                        logRowData.push(`<div class="col-1"><b>Severity:</b><br><span class="${displayClass}">${log.severity}</span></div>`)
                        logRowData.push(`<div class="col-8"><b>Message:</b><br>${log.message}</div>`)
                        logRowData.push(`<div class="col-2"><b>Date/Time:</b><br>${convertTimestampToDate(log.timestamp)}</div>`)
                    logRowData.push(`</div>`)
                logRowData.push(`</div>`)
            logRowData.push(`</div>`)
    
            containerLogs?.appendChild(logRow)
            logRow.outerHTML = logRowData.join('')

            navIconLogs.classList.remove('nav_icon_unread')

        })
    })
}
