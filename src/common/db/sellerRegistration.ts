import { SellerRegistration } from './models/models';
import { ISellerRegistration } from './models/interfaces';

export async function addRegistration(registration: ISellerRegistration): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const sellerRegistration = new SellerRegistration(registration)

            sellerRegistration.save(function (error: any) {
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

export async function findRegistationByURLAndAccount(url: string, user: string, account: string): Promise<ISellerRegistration> {
    return new Promise<ISellerRegistration>((resolve, reject) => {
        try {
            SellerRegistration.findOne({url, user, account}, function (error: Error, api: ISellerRegistration) {
                if (error) {
                    reject(error);
                } else {
                    resolve(api)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findRegistationsByUser(user: string): Promise<ISellerRegistration[]> {
    return new Promise<ISellerRegistration[]>((resolve, reject) => {
        try {
            SellerRegistration.find({user}, function (error: Error, api: ISellerRegistration[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(api)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findRegistationsByUserAndAccount(user: string, account: string): Promise<ISellerRegistration[]> {
    return new Promise<ISellerRegistration[]>((resolve, reject) => {
        try {
            SellerRegistration.find({user, account}, function (error: Error, api: ISellerRegistration[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(api)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function deleteRegistration(url: string, user: string, account: string): Promise<any> { 
    return new Promise<any>((resolve, reject) => {
      try {
        SellerRegistration.deleteOne({ url, user, account }, function (error: Error, result: any) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllRegistrations(): Promise<ISellerRegistration[]> {
    return new Promise<ISellerRegistration[]>((resolve, reject) => {
        try {
            SellerRegistration.find(function (error: Error, user: ISellerRegistration[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(user);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};
