import {app, BrowserWindow} from 'electron'
import { ChildProcess, fork } from "child_process";
import path from "path";
import { connectDb, createTables, disconnectDb } from '../../common/db/connection';
import { processMessage } from '../../common/interfaces/processMessage';
import { saveJsonToFile } from '../../common/utils/json-utils';
import { log, LogLevel } from '../../common/utils/logger';

// process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// app.commandLine.appendSwitch('ignore-certificate-errors');

const fs = require('fs');

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
console.log('database: ' + databasePath)

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

    // const jwtSecret = require('crypto').randomBytes(64).toString('hex');
    // const jwtConfig = {
    //     jwtSecret: jwtSecret,
    //     jwtExpiresIn: 86400
    // }

    // saveJsonToFile('../../common/auth/config.json', JSON.stringify(jwtConfig))

    // Create the browser window.
    const mainWindow = new BrowserWindow({
    minWidth: 1575,
    minHeight: 950,
    width: 1200,
    height: 800,
    webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        // sandbox: false,
        // experimentalFeatures: true
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

    appServerProcess = fork(path.join(__dirname, '../server/app-server.js'), {detached: false })
    apiServerProcess = fork(path.join(__dirname, '../../api/api-server.js'), {detached: false})
    walletServerProcess = fork(path.join(__dirname, '../../wallet/wallet-server.js'), {detached: false})

    apiServerProcess.on('message', (m: processMessage) => {
        if(m.type == "set password"){
            log(LogLevel.MESSAGE, 'Got password message from api server sending to wallet server:' + m.message)
            walletServerProcess.send({ type: m.type, message: m.message } as processMessage);
        }
        
    });

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
        const walletServerShutDownRequest = new Request("http://localhost:3150/ws/shutdown", {
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



