import express from 'express';
import * as http from 'http';

import cookieParser from 'cookie-parser';
import hbs from 'hbs';
import path from 'path';

import { CONFIG } from './config'
import { authenticateJwtFrontEnd } from '../../common/auth/authJwt';

import { log, LogLevel } from '../../common/utils/logger';


// declare servers
const app: express.Application = express()
app.use(express.json());
app.use(cookieParser())

//set paths for Express / HandleBars config
const publicDirPath = path.join(__dirname, '../public')
const viewsPath = path.join(__dirname, '../templates/views')
const partialPath = path.join(__dirname, '../templates/partials')

//setup HandleBars engine and views location
app.set('view engine', 'hbs')
app.set('views', viewsPath)
hbs.registerPartials(partialPath)

//set up static dir to serve
app.use(express.static(publicDirPath))

const server = http.createServer(app);

app.get('/', authenticateJwtFrontEnd, (req, res) => {
    res.render('index', {
        title: 'welcome',
        notfoundmsg: 'index'
    })
})

app.get('/app/online', async (req, res) => {
    res.sendStatus(200)
})

app.get('/app/shutdown', async (req, res) => {
    shutdown()
    process.exit()
})



// ############################################

server.listen(CONFIG.Port, () => {
    log(LogLevel.MESSAGE, `Safex APP server is up on port ${CONFIG.Port}`)
    var figlet = require('figlet');

    figlet('Safex Big Box Store', function(err: any, data:any) {
        if (err) {
            console.dir(err);
            return;
        }
        // dot not delete, this is useful console output
        console.log(data)
    });
})


function shutdown() {
    log(LogLevel.WARN, "Shutting down APP server...")
    server.close();
  }
  
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  