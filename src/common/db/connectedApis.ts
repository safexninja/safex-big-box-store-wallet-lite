import { UpdateWriteOpResult } from 'mongoose';
import { ConnectedApi } from './models/models';
import { IConnectedApi } from './models/interfaces';

export async function addApi(api: IConnectedApi): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const connectedApi = new ConnectedApi(api)

            connectedApi.save(function (error: any) {
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

export async function findApiByURL(user: string, url: string): Promise<IConnectedApi> {
    return new Promise<IConnectedApi>((resolve, reject) => {
        try {
            ConnectedApi.findOne({user, url}, function (error: Error, api: IConnectedApi) {
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


export async function findApiByUUID(user: string, uuid: string): Promise<IConnectedApi> {
    return new Promise<IConnectedApi>((resolve, reject) => {
        try {
            ConnectedApi.findOne({user, uuid}, function (error: Error, api: IConnectedApi) {
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



export async function findActiveApi(user: string): Promise<IConnectedApi> {
    return new Promise<IConnectedApi>((resolve, reject) => {
        try {
            ConnectedApi.findOne({user, isActiveApi: true}, function (error: Error, api: IConnectedApi) {
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


export async function findAllApisByUser(user: string): Promise<IConnectedApi[]> {
    return new Promise<IConnectedApi[]>((resolve, reject) => {
        try {
            ConnectedApi.find({user}, function (error: Error, api: IConnectedApi[]) {
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

export async function updateApi(user: string, url: string, isActiveApi: boolean, timestamp: number): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
        try {
            ConnectedApi.updateOne({user, url}, {url, isActiveApi, timestamp}, function (error: Error, result: UpdateWriteOpResult) {
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
};

export async function deActivateAllApis(user: string): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
        try {
            ConnectedApi.updateMany({user}, {isActiveApi: false}, function (error: Error, result: UpdateWriteOpResult) {
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
};

export async function deleteApi(user: string, url: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        ConnectedApi.deleteOne({ user, url }, function (error: Error, result: any) {
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



export async function deleteAllApi(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        ConnectedApi.deleteMany({  }, function (error: Error, result: any) {
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
export async function findAllApis(): Promise<IConnectedApi[]> {
    return new Promise<IConnectedApi[]>((resolve, reject) => {
        try {
            ConnectedApi.find(function (error: Error, user: IConnectedApi[]) {
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
