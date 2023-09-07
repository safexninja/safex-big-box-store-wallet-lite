import { UserSettings } from './models/models';
import { IUserSettings } from './models/interfaces';
import { UpdateWriteOpResult } from 'mongoose';
import { decryptWithHashString, encryptWithHashString } from '../crypto/crypto';
import { getDb } from './connection';

export async function addSettings(settings: IUserSettings, encryptionHashString: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {

            settings.defaultAddress = encryptWithHashString(settings.defaultAddress, encryptionHashString)
            
            getDb().prepare(`INSERT INTO userSettings (
                uuid,
                user,
                defaultCountry,
                defaultAddress,
                daemonAddress,
                explorerAddress
            ) VALUES (
                '${settings.uuid}',
                '${settings.user}',
                '${settings.defaultCountry}',
                '${settings.defaultAddress}',
                '${settings.daemonAddress}',
                '${settings.explorerAddress}'   
            )`).run()
            resolve()
        } catch (err) {
            reject(err);
        }
    });
};

export async function findSettingsByUserUUID(userUuid: string, encryptionHashString: string): Promise<IUserSettings> {
    return new Promise<IUserSettings>((resolve, reject) => {
        try {
            const settings = getDb().prepare(`SELECT * FROM userSettings WHERE user='${userUuid}'`).get() as IUserSettings
            if(settings && settings.defaultAddress){
                settings.defaultAddress = decryptWithHashString(settings.defaultAddress, encryptionHashString)
            }
            
            resolve(settings)
        } catch (err) {
            reject(err);
        }
    });
};



export async function updateUserSettings(
    userUuid: string,
    settings: IUserSettings,
    encryptionHashString: string
  ): Promise<boolean> {

    return new Promise<boolean>((resolve, reject) => {
        try {

            settings.defaultAddress = encryptWithHashString(settings.defaultAddress, encryptionHashString)

            getDb().prepare(`UPDATE userSettings 
                        SET defaultCountry='${settings.defaultCountry}',
                        defaultAddress='${settings.defaultAddress}',
                        daemonAddress='${settings.daemonAddress}',
                        explorerAddress='${settings.explorerAddress}'
                        WHERE user='${userUuid}'`).run()
            resolve(true)

        } catch (err) {
            reject(false);
        }
    });

  }
