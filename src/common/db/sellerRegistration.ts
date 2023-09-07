import { SellerRegistration } from './models/models';
import { ISellerRegistration } from './models/interfaces';
import { getDb } from './connection';

export async function addRegistration(registration: ISellerRegistration): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            getDb().prepare(`INSERT INTO sellerRegistration (
                uuid,
                user,
                url,
                account,
                token,
                revokeToken,
                timestamp
            ) VALUES (
                '${registration.uuid}',
                '${registration.user}',
                '${registration.url}',
                '${registration.account}',
                '${registration.token}',
                '${registration.revokeToken}',
                ${registration.timestamp}
            )`).run()
            resolve()
        } catch (err) {
            reject(err);
        }
    });
};

export async function findRegistationByURLAndAccount(url: string, user: string, account: string): Promise<ISellerRegistration> {
    return new Promise<ISellerRegistration>((resolve, reject) => {
        try {
            const res = getDb().prepare(`SELECT * FROM sellerRegistration WHERE url='${url}' AND user='${user}' AND account='${account}'`).get() as ISellerRegistration
            resolve(res)
        } catch (err) {
            reject(err);
        }
    });
};

export async function findRegistationsByUser(user: string): Promise<ISellerRegistration[]> {

    return new Promise<ISellerRegistration[]>((resolve, reject) => {
        try {
            const res = getDb().prepare(`SELECT * FROM sellerRegistration WHERE user='${user}'`).all() as ISellerRegistration[]
            resolve(res)
        } catch (err) {
            reject(err);
        }
    });

};

export async function findRegistationsByUserAndAccount(user: string, account: string): Promise<ISellerRegistration[]> {
    return new Promise<ISellerRegistration[]>((resolve, reject) => {
        try {
            const res = getDb().prepare(`SELECT * FROM sellerRegistration WHERE user='${user}' AND account='${account}'`).all() as ISellerRegistration[]
            resolve(res)
        } catch (err) {
            reject(err);
        }
    });

};

export async function deleteRegistration(url: string, user: string, account: string): Promise<boolean> { 

    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`DELETE FROM sellerRegistration WHERE url='${url}' AND user='${user}' AND account='${account}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });

  }
