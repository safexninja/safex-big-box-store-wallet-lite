import { IConnectedApi } from './models/interfaces';
import { getDb } from './connection';

export async function addApi(api: IConnectedApi): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            getDb().prepare(`INSERT INTO connectedApi (
                uuid,
                user,
                url,
                isActiveApi,
                messageAddress,
                privateKey,
                publicKey,
                timestamp
            ) VALUES (
                '${api.uuid}',
                '${api.user}',
                '${api.url}',
                ${api.isActiveApi},
                '${api.messageAddress}',
                '${api.privateKey}',
                '${api.publicKey}',
                ${api.timestamp}
            )`).run()
            resolve()
        } catch (err) {
            reject(err);
        }
    });
};

export async function findApiByURL(user: string, url: string): Promise<IConnectedApi> {
    return new Promise<IConnectedApi>((resolve, reject) => {
        try {
            const res = getDb().prepare(`SELECT * FROM connectedApi WHERE user='${user}' AND url='${url}'`).get() as IConnectedApi
            resolve(res)
        } catch (err) {
            reject(err);
        }
    });

};


export async function findApiByUUID(user: string, uuid: string): Promise<IConnectedApi> {

    return new Promise<IConnectedApi>((resolve, reject) => {
        try {
            const res = getDb().prepare(`SELECT * FROM connectedApi WHERE user='${user}' AND uuid='${uuid}'`).get() as IConnectedApi
            resolve(res)
        } catch (err) {
            reject(err);
        }
    });
};



export async function findActiveApi(user: string): Promise<IConnectedApi> {
    return new Promise<IConnectedApi>((resolve, reject) => {
        try {
            const res = getDb().prepare(`SELECT * FROM connectedApi WHERE user='${user}' AND isActiveApi=1`).get() as IConnectedApi
            resolve(res)
        } catch (err) {
            reject(err);
        }
    });

};


export async function findAllApisByUser(user: string): Promise<IConnectedApi[]> {
    return new Promise<IConnectedApi[]>((resolve, reject) => {
        try {
            const res = getDb().prepare(`SELECT * FROM connectedApi WHERE user='${user}'`).all() as IConnectedApi[]
            resolve(res)
        } catch (err) {
            reject(err);
        }
    });
};

export async function updateApi(user: string, url: string, isActiveApi: boolean, timestamp: number): Promise<boolean> {
    
    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`UPDATE connectedApi 
                                SET isActiveApi=${isActiveApi}, timestamp=${timestamp} 
                                WHERE user='${user}' AND url='${url}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
    
    
};

export async function deActivateAllApis(user: string): Promise<boolean> {

    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`UPDATE connectedApi 
                                SET isActiveApi=false 
                                WHERE user='${user}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
};

export async function deleteApi(user: string, url: string): Promise<boolean> {

    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`DELETE FROM connectedApi WHERE user='${user}' AND url='${url}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });

}

export async function deleteAllApi(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`DELETE FROM connectedApi`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
  }
