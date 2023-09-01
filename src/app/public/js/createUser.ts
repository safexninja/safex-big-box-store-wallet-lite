import { createUser, fetchUsers } from './apicalls'
import { FormValidity, handleFormValidationAndSummarize } from './formvalidation'
import { showToast } from './toast'
import { AlertArea, AlertType, dismissAlert, showAlert } from './utils'
const createUserForm = document.querySelector('#form_create_user') as HTMLFormElement
const createUserButton = document.querySelector('#btn_create_user') as HTMLButtonElement

if(createUserForm){
    createUserForm.addEventListener('submit', async (e) => {
        e.preventDefault()

        
        createUserButton.setAttribute('disabled', '')

        dismissAlert(AlertArea.MODAL_ALERT_AREA_CREATE_USER)
        createUserForm.classList.remove('was-validated')

        const formFields = {
            newUserName : {
                element: document.querySelector('#input_new_user_name') as HTMLInputElement,
                validationMessage: [""]
            },
            newUserPassword: {
                element: document.querySelector('#input_new_user_password') as HTMLInputElement,
                validationMessage: [""]
            }, 
            newUserPasswordConfirm: {
                element: document.querySelector('#input_new_user_password_confirm') as HTMLInputElement,
                validationMessage: [""]
            }, 
        }

        const existingUserList = await fetchUsers();

        if(existingUserList.find(user => user.name === formFields.newUserName.element.value)) {
            formFields.newUserName.validationMessage.push("This <strong>username</strong> is already taken.")
        }

        if(formFields.newUserName.element.value.length < 3) {
            formFields.newUserName.validationMessage.push("User name requires at least 3 characters.")
        }
      
        if(formFields.newUserPassword.element.value.trim() !== formFields.newUserPasswordConfirm.element.value.trim()) {
            formFields.newUserPasswordConfirm.validationMessage.push("The password confirmation must match.")
        }

        if(formFields.newUserPassword.element.value.length < 8) {
            formFields.newUserPassword.validationMessage.push("Password requires at least 8 characters.")
        }

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_CREATE_USER, AlertType.DANGER)
        createUserForm.classList.add('was-validated')


        if(formValidity === FormValidity.VALID){
            const newUser = await createUser(formFields.newUserName.element.value, formFields.newUserPassword.element.value)
            if(!newUser){
                showToast("Error", "Something went wrong while trying to create a new user", 15000)
            }
            window.location.reload()
        } else {
            createUserButton.removeAttribute('disabled')    
        }
        
    })

}
