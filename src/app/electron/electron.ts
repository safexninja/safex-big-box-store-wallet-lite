import {app, BrowserWindow} from 'electron'
import { ChildProcess, fork } from "child_process";
import path from "path";
// const name = 'Safex-Big-Box-Store'
// const appName = app.getPath("exe");

const userDataPath = app.getPath("userData");

let appServerProcess: ChildProcess
let apiServerProcess: ChildProcess
let walletServerProcess: ChildProcess
process.env.FILE_STORE_DIR=userDataPath

// const expressPath = appName.endsWith(`${name}.exe`)
//   ? path.join("./resources/app.asar", "./build/app/server/app-server.js")
//   : "./build/app/server/app-server.js";

 

function createWindow() {

    // Create the browser window.
    const mainWindow = new BrowserWindow({
    minWidth: 1400,
    minHeight: 800,
    width: 1400,
    height: 800,
    webPreferences: {
        webSecurity: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../public/loader.html'));

    mainWindow.on('close', ()=>{
        closeBackgroundServers();
    })

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
}


function initializeDataBase() {

}

function startBackgroundServers() {

    appServerProcess = fork(path.join(__dirname, '../server/app-server.js'), {detached: true})
    apiServerProcess = fork(path.join(__dirname, '../../api/api-server.js'), {detached: true})
    walletServerProcess = fork(path.join(__dirname, '../../wallet/wallet-server.js'), {detached: true})

}

function closeBackgroundServers(){

        // app server
        const appServerShutDownRequest = new Request("http://localhost:3000/app/shutdown", {
            method: "GET",
        });

        fetch(appServerShutDownRequest)
        .then((response) => {
            appServerProcess.kill()
        })
        .catch()

        // api server
        const apiServerShutDownRequest = new Request("http://localhost:3001/api/shutdown", {
            method: "GET",
        });

        fetch(apiServerShutDownRequest)
        .then((response) => {
            apiServerProcess.kill()
        })
        .catch()

        // wallet server
        const walletServerShutDownRequest = new Request("http://localhost:3002/ws/shutdown", {
            method: "GET",
        });

        fetch(walletServerShutDownRequest)
        .then((response) => {
            walletServerProcess.kill()
        })
        .catch()
}



app.whenReady().then(() => {

    createWindow();
    initializeDataBase();
    startBackgroundServers();

    app.on("activate", function () {
        // mac create window in open when there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});


// does not work?
app.on('quit', ()=>{
   //TO DO
   closeBackgroundServers()
})


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") { // not on Mac, keep it open there
    app.quit();
  }
});

