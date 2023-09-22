import * as bootstrap from 'bootstrap'
import { v4 as uuidv4 } from 'uuid';


export function showToast(header: string, body: string | undefined, displayTime: number){

    const toastContainer = document.querySelector('#toast-container')
    if(toastContainer){
      toastContainer.innerHTML = ""

      let toastElement = document.createElement('div') as Element
      toastContainer.appendChild(toastElement)
  
      toastElement.outerHTML = [
  
          `<div id="${ uuidv4()}" class="toast" role="status" aria-live="assertive" aria-atomic="true" data-bs-delay="10000">`,
              `<div class="toast-header bg-primary text-white">`,
              `<strong class="me-auto">${header}</strong>`,
              `<button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>`,
              `</div>`,
              `<div class="toast-body">`,
              `${body}`,
              `</div>`,
          `</div>`,
  
        ].join('')
  
        
        const toastElList = document.querySelectorAll('.toast')
        const toastList = [...toastElList].map(toastEl => new bootstrap.Toast(toastEl, {
          animation: true,
          autohide: true,
          delay: displayTime
        }
        ))
        toastList[0].show()
    }
    
 
}
