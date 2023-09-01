import * as jwt from 'jsonwebtoken'
import { Request, Response } from 'express';
import { IAccountId, IWalletId } from '../db/models/interfaces';
import { LogLevel, log } from '../utils/logger';

const configuration = require('./config.json');

export interface authenticatedUser {
    uuid: string;
    name: string;
    termsAccepted: boolean;
    accounts: IAccountId[];
    wallets: IWalletId[];
}

export function generateJwt(data: Object): string {
    return jwt.sign(data, configuration.jwtSecret, {expiresIn: configuration.jwtExpiresIn})
}

// Express middleware
export function authenticateJwt (req: Request, res: Response, next: Function) {

    let providedToken
    const authHeader = req.headers.authorization;

    if(authHeader){
        providedToken =  authHeader.split(' ')[1];
    } else {
        providedToken = req.cookies.access_token
    }

    if (providedToken) {
        jwt.verify(providedToken, configuration.jwtSecret, (err: any, decoded: any) => {
            if (err) {
                return res.status(403).send({error: "Invalid token, please (re)authenticate / login again", path: req.path});
            };
            
            return next();
        });
    } else {
        res.status(401).send({error: "Unauthorized", path: req.path});
    }
};

// Express middleware
export function authenticateJwtFrontEnd (req: any, res: any, next: Function) {

    let providedToken = req.cookies.access_token

    if (providedToken) {
        jwt.verify(providedToken, configuration.jwtSecret, (err: any, decoded: any) => {
            if (err) {
                log(LogLevel.INFO, 'login not OK')
                return res.render('login', {
                    title: 'login',
                    notfoundmsg: 'login'
                });
            };
            
            return next();
        });
    } else {
        res.render('login', {
            title: 'login',
            notfoundmsg: 'login'
        });
    }
};

export function decodeJwt (token: string): authenticatedUser | undefined {
    try {
        return jwt.verify(token, configuration.jwtSecret) as authenticatedUser
    } catch (error) {
        log(LogLevel.ERROR, 'error while decoding JWT: ' + error)
        return undefined;
    }

};

export function getTokenFromAuthHeader (req: Request): string {
    let providedToken = ""
    const authHeader = req.headers.authorization;

    if(authHeader){
        providedToken =  authHeader.split(' ')[1];
    } else {
        providedToken = req.cookies.access_token
    }
    
    return providedToken
};