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

process.env.USER_DATA_PATH = app.getPath("userData");
process.env.APP_PATH = path.join(process.env.USER_DATA_PATH, "bigbox")
process.env.DB_PATH = path.join(process.env.APP_PATH, "database")
process.env.FILE_STORE_DIR = path.join(process.env.APP_PATH, "wallets")

let appServerProcess: ChildProcess
let apiServerProcess: ChildProcess
let walletServerProcess: ChildProcess

const createDirIfNotExists = (dir: string) =>{

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
        console.log("Directory created: " + dir)
    } else {
        console.log("Directory already exists: " + dir)
    }

}
createDirIfNotExists(process.env.APP_PATH)
createDirIfNotExists(process.env.DB_PATH)
createDirIfNotExists(process.env.FILE_STORE_DIR)
 


function createWindow() {

    const jwtSecret = require('crypto').randomBytes(64).toString('hex');
    const jwtConfig = {
        jwtSecret: jwtSecret,
        jwtExpiresIn: 86400
    }

    if(process.env.APP_PATH){
        log(LogLevel.INFO, 'Saving newly generated JWT secret')
        saveJsonToFile( path.join(process.env.APP_PATH, "config.json"), jwtConfig)
    }
    
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

    mainWindow.setMenuBarVisibility(false);

    mainWindow.loadFile(path.join(__dirname, '../public/loader.html'));

    mainWindow.on('close', ()=>{
        closeBackgroundServers();
    })

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
}


function initializeDataBase() {
    connectDb(path.join(process.env.DB_PATH as string, "bigbox.db"))
    createTables()
}

function startBackgroundServers() {

    appServerProcess = fork(path.join(__dirname, '../server/app-server.js'), {detached: false })
    apiServerProcess = fork(path.join(__dirname, '../../api/api-server.js'), {detached: false})
    walletServerProcess = fork(path.join(__dirname, '../../wallet/wallet-server.js'), {detached: false})

    apiServerProcess.on('message', (m: processMessage) => {
        if(m.type == "set password"){
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



