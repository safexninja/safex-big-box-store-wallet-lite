import {app, BrowserWindow} from 'electron'
import { ChildProcess, fork } from "child_process";
import path from "path";
import { connectDb, createTables, disconnectDb } from '../../common/db/connection';

const fs = require('fs');
// const name = 'Safex-Big-Box-Store'
// const appName = app.getPath("exe");

const userDataPath = app.getPath("userData");
const appDataPath = path.join(userDataPath, "bigbox")
const databasePath = path.join(appDataPath, "database")
const walletsPath = path.join(appDataPath, "wallets")

let appServerProcess: ChildProcess
let apiServerProcess: ChildProcess
let walletServerProcess: ChildProcess

process.env.FILE_STORE_DIR=walletsPath
process.env.DB_PATH=databasePath
console.log(userDataPath)

// const expressPath = appName.endsWith(`${name}.exe`)
//   ? path.join("./resources/app.asar", "./build/app/server/app-server.js")
//   : "./build/app/server/app-server.js";


const createDirIfNotExists = (dir: string) =>{

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
        console.log("Directory created: " + dir)
    } else {
        console.log("Directory already exists: " + dir)
    }

}
createDirIfNotExists(appDataPath)
createDirIfNotExists(databasePath)
createDirIfNotExists(walletsPath)
 

function createWindow() {

    // Create the browser window.
    const mainWindow = new BrowserWindow({
    minWidth: 1575,
    minHeight: 950,
    width: 1200,
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
    // mainWindow.webContents.openDevTools();
}


function initializeDataBase() {
    connectDb(path.join(databasePath, "bigbox.db"))
    createTables()
}

function startBackgroundServers() {

    appServerProcess = fork(path.join(__dirname, '../server/app-server.js'), {detached: true})
    apiServerProcess = fork(path.join(__dirname, '../../api/api-server.js'), {detached: true})
    walletServerProcess = fork(path.join(__dirname, '../../wallet/wallet-server.js'), {detached: true})

}

function closeBackgroundServers(){

        // app server
        const appServerShutDownRequest = new Request("http://localhost:3100/app/shutdown", {
            method: "GET",
        });

        fetch(appServerShutDownRequest)
        .then((response) => {
            appServerProcess.kill()
        })
        .catch()

        // api server
        const apiServerShutDownRequest = new Request("http://localhost:3101/api/shutdown", {
            method: "GET",
        });

        fetch(apiServerShutDownRequest)
        .then((response) => {
            apiServerProcess.kill()
        })
        .catch()

        // wallet server
        const walletServerShutDownRequest = new Request("http://localhost:3102/ws/shutdown", {
            method: "GET",
        });

        fetch(walletServerShutDownRequest)
        .then((response) => {
            walletServerProcess.kill()
        })
        .catch()


}



app.whenReady().then(() => {
    
    initializeDataBase();
    createWindow();
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
   disconnectDb()
})


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") { // not on Mac, keep it open there
    app.quit();
  }
});

