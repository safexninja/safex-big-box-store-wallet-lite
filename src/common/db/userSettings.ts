import { UserSettings } from './models/models';
import { IUserSettings } from './models/interfaces';
import { UpdateWriteOpResult } from 'mongoose';
import { decryptWithHashString, encryptWithHashString } from '../crypto/crypto';

export async function addSettings(settings: IUserSettings, encryptionHashString: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {

            settings.defaultAddress = encryptWithHashString(settings.defaultAddress, encryptionHashString)

            const userSettings = new UserSettings(settings)
            userSettings.save(function (error: any) {
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

export async function findSettingsByUserUUID(userUuid: string, encryptionHashString: string): Promise<IUserSettings> {
    return new Promise<IUserSettings>((resolve, reject) => {
        try {
            UserSettings.findOne({user: userUuid}, function (error: Error, settings: IUserSettings) {
                if (error) {
                    reject(error);
                } else {
                    if(settings && settings.defaultAddress){
                        settings.defaultAddress = decryptWithHashString(settings.defaultAddress, encryptionHashString)
                    }
                   resolve(settings)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};


// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllUserSettings(): Promise<IUserSettings> {
    return new Promise<IUserSettings>((resolve, reject) => {
        try {
            UserSettings.find(function (error: Error, settings: IUserSettings) {
                if (error) {
                    reject(error);
                } else {
                    resolve(settings);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};


export async function updateUserSettings(
    userUuid: string,
    settings: object,
    encryptionHashString: string
  ): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
      try {

        (settings as any).defaultAddress = encryptWithHashString((settings as any).defaultAddress, encryptionHashString)

        UserSettings.updateOne(
          { user: userUuid },
          { ...settings },
          function (error: Error, result: UpdateWriteOpResult) {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  }
