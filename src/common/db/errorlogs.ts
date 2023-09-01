import { ErrorLog } from './models/models';
import { IErrorLog } from './models/interfaces';

export async function addErrorLogEntry(item: IErrorLog): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const newItem = new ErrorLog(item)
            newItem.save(function (error: any) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};


export async function findAllErrorLogItems(user: string): Promise<IErrorLog[]> {
    return new Promise<IErrorLog[]>((resolve, reject) => {
        try {
            ErrorLog.find({user}, function (error: Error, items: IErrorLog[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(items)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};
