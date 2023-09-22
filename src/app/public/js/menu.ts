import { logout } from "./apicalls";
import * as bootstrap from 'bootstrap'


document.addEventListener("DOMContentLoaded", function (event) {
  const showNavbar = (
    toggleId: string,
    navId: string,
    bodyId: string,
    headerId: string
  ) => {
    const toggle = document.getElementById(toggleId) as HTMLElement,
      nav = document.getElementById(navId) as HTMLElement,
      bodypd = document.getElementById(bodyId) as HTMLElement,
      headerpd = document.getElementById(headerId) as HTMLElement;

    // Validate that all variables exist
    if (toggle && nav && bodypd && headerpd) {
      toggle.addEventListener("click", () => {
        // show navbar
        nav.classList.toggle("shows");
        // change icon
        toggle.classList.toggle("bx-x");
        // add padding to body
        bodypd.classList.toggle("body-pd");
        // add padding to header
        headerpd.classList.toggle("body-pd");
      });
      toggle.click()
    }
  };

  showNavbar("header-toggle", "nav-bar", "body-pd", "header");

  /*===== LINK ACTIVE =====*/
  const linkColor = document.querySelectorAll(".nav_link");

  function openPage(this: HTMLElement) {

    //hide all pages
    const pages = document.querySelectorAll("[id^=\"page\"]")
    pages.forEach((page)=>{
        page.classList.add("d-none")
    })

    const selectedPage = this.getAttribute("page") || ""

    //unhide selected page
    const targetPage = document.querySelector("#page_" + selectedPage)
    targetPage?.classList.remove("d-none")

    //set page title to selected page
    const pageTitle = document.querySelector("#head_page_title") as HTMLElement
    pageTitle.innerText = selectedPage.toUpperCase() || ""

    const containerStore = document.querySelector('#container_store')
    if(selectedPage === "market" || selectedPage === "listings"){
        containerStore?.classList.remove("d-none")
    } else {
        containerStore?.classList.add("d-none")
    }


    if (linkColor) {

      linkColor.forEach((l) => {
        l.classList.remove("active")
      });

      this.classList.add("active");
    }

  }

  linkColor.forEach((l) => l.addEventListener("click", openPage));

    const defaultPage = document.querySelector("#page_market")
    defaultPage?.classList.remove("d-none");

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

});


const logoutButton = document.querySelector('#logout') as HTMLFormElement

if(logoutButton){
    logoutButton.addEventListener('click', async (e) => {
        await logout()
        window.location.reload()
    })
}


