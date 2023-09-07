import { ErrorLog } from './models/models';
import { IErrorLog } from './models/interfaces';
import { getDb } from './connection';

export async function addErrorLogEntry(item: IErrorLog): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            getDb().prepare(`INSERT INTO errorLog (
                uuid,
                user,
                component,
                severity,
                timestamp,
                message
            ) VALUES (
                '${item.uuid}',
                '${item.user}',
                '${item.component}',
                '${item.severity}',
                ${item.timestamp},
                '${item.message}'
            )`).run()
            resolve()
        } catch (err) {
            reject(err);
        }
    });
};


export async function findAllErrorLogItems(user: string): Promise<IErrorLog[]> {
    return new Promise<IErrorLog[]>((resolve, reject) => {
        try {
            const res = getDb().prepare(`SELECT * FROM errorLog WHERE user='${user}'`).all() as IErrorLog[]
            resolve(res)
        } catch (err) {
            reject(err);
        }
    });
};
