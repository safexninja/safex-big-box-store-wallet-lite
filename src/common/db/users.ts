import { UpdateWriteOpResult } from 'mongoose';
import { User } from './models/models';
import { IUser, IUserStrict } from './models/interfaces';
import { getDb } from './connection';

export async function addUser(user: IUser): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            getDb().prepare(`INSERT INTO user (
                uuid,
                name,
                password,
                description,
                status,
                termsAccepted,
                logsLastSeen,
                passwordHashed
            ) VALUES (
                '${user.uuid}',
                '${user.name}',
                '${user.password}',
                '${user.description}',
                '${user.status}',
                ${user.termsAccepted},
                ${user.logsLastSeen},
                ${user.passwordHashed}
            )`).run()
            resolve()
        } catch (err) {
            reject(err);
        }
    });
};

export async function findUserByUUID(uuid: string): Promise<IUserStrict> {
    return new Promise<IUserStrict>((resolve, reject) => {
        try {
            const user = getDb().prepare(`SELECT * FROM userStrict WHERE uuid='${uuid}'`).get() as IUserStrict
            resolve(user)
        } catch (err) {
            reject(err);
        }
    });
};

export async function findUserByName(name: string): Promise<IUserStrict> {
        return new Promise<IUserStrict>((resolve, reject) => {
            try {
                const user= getDb().prepare(`SELECT * FROM userStrict WHERE name='${name}'`).get() as IUserStrict
                resolve(user)
            } catch (err) {
                reject(err);
            }
        });
};

export async function findUserWithPasswordByName(name: string): Promise<IUser> {
    return new Promise<IUser>((resolve, reject) => {
        try {
            const user = getDb().prepare(`SELECT * FROM user WHERE name='${name}'`).get() as IUser
            resolve(user)
        } catch (err) {
            reject(err);
        }
    });
};

export async function updateUserInfo(uuid: string, description: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`UPDATE user SET description='${description}' WHERE uuid='${uuid}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
};

export async function updateUserLogsLastSeen(uuid: string, logsLastSeen: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`UPDATE user SET logsLastSeen=${logsLastSeen} WHERE uuid='${uuid}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
};

export async function updateUserTermsAccepted(uuid: string, termsAccepted: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`UPDATE user SET termsAccepted=${termsAccepted} WHERE uuid='${uuid}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
};


export async function updateUserPassword(uuid: string, password: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`UPDATE user SET password='${password}' WHERE uuid='${uuid}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
};

export async function deleteUser(uuid: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            getDb().prepare(`DELETE FROM user WHERE uuid='${uuid}'`).run()
            resolve(true)
        } catch (err) {
            reject(false);
        }
    });
  }

// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllUsers(): Promise<IUser[]> {
    return new Promise<IUser[]>((resolve, reject) => {
        try {
            const result = getDb().prepare('SELECT * FROM user').all() as IUser[]
            resolve(result)
        } catch (err) {
            reject(err);
        }
    });
};

export async function getUserCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        try {
            const count = getDb().prepare(`SELECT COUNT(uuid) FROM user`).get() as number
            resolve(count)
        } catch (err) {
            reject(err);
        }
    });
};
