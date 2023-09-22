import { authenticate, fetchUsers } from './apicalls'
import { AlertArea, AlertType, showAlert } from './utils'
const loginForm = document.querySelector('#form_login') as HTMLFormElement

if(loginForm){
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const userName = document.querySelector('#select_user_name') as HTMLInputElement
        const userPassword = document.querySelector('#input_user_password') as HTMLInputElement

        if((await authenticate(userName.value, userPassword.value))){
            window.location.reload()
        } else {
            showAlert(AlertArea.ALERT_AREA, "Sadly the credentials are not valid", AlertType.DANGER)
        }
    })

    populateUserList()
}


export async function populateUserList(){

    const userSelectBox = document.querySelector('#select_user_name') as HTMLSelectElement
    const userList  = await fetchUsers();

    if(userList.length == 0){
        showAlert(AlertArea.ALERT_AREA, "Hi! It seems there is no user yet, please create a new user", AlertType.INFO)
    }

    userList.forEach((user)=>{
        userSelectBox.options.add(new Option(user.name, user.name))
    })            
           
}

