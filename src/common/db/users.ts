import { UpdateWriteOpResult } from 'mongoose';
import { User } from './models/models';
import { IUser, IUserStrict } from './models/interfaces';

export async function addUser(user: IUser): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const newUser = new User(user)

            newUser.save(function (error: any) {
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

export async function findUserByUUID(uuid: string): Promise<IUserStrict> {
    return new Promise<IUserStrict>((resolve, reject) => {
        try {
            User.findOne({uuid}, function (error: Error, user: IUser) {
                if (error) {
                    reject(error);
                } else {
                    if(user == null){
                        resolve(user);
                    } else {
                        resolve(
                            {
                                uuid: user.uuid,
                                name: user.name,
                                status: user.status,
                                termsAccepted: user.termsAccepted,
                                logsLastSeen: user.logsLastSeen
                            }
                        )
                    }
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findUserByName(name: string): Promise<IUserStrict> {
    return new Promise<IUserStrict>((resolve, reject) => {
        try {
            User.findOne({name}, function (error: Error, user: IUser) {
                if (error) {
                    reject(error);
                } else {
                    if(user == null){
                        resolve(user);
                    } else {
                        resolve(
                            {
                                uuid: user.uuid,
                                name: user.name,
                                status: user.status,
                                termsAccepted: user.termsAccepted,
                                logsLastSeen: user.logsLastSeen
                            }
                        )
                    }
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findUserWithPasswordByName(name: string): Promise<IUser> {
    return new Promise<IUser>((resolve, reject) => {
        try {
            User.findOne({name}, function (error: Error, user: IUser) {
                if (error) {
                    reject(error);
                } else {
                    resolve(user)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function updateUserInfo(uuid: string, description: string): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
        try {
            User.updateOne({uuid}, {description}, function (error: Error, result: UpdateWriteOpResult) {
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

export async function updateUserLogsLastSeen(uuid: string, logsLastSeen: number): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
        try {
            User.updateOne({uuid}, {logsLastSeen}, function (error: Error, result: UpdateWriteOpResult) {
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

export async function updateUserTermsAccepted(uuid: string, termsAccepted: boolean): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
        try {
            User.updateOne({uuid}, {termsAccepted}, function (error: Error, result: UpdateWriteOpResult) {
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


export async function updateUserPassword(uuid: string, password: string): Promise<UpdateWriteOpResult> {
    return new Promise<UpdateWriteOpResult>((resolve, reject) => {
        try {
            User.updateOne({uuid}, {password}, function (error: Error, result: UpdateWriteOpResult) {
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

export async function deleteUser(uuid: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        User.deleteOne({ uuid }, function (error: Error, result: any) {
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
export async function findAllUsers(): Promise<IUser[]> {
    return new Promise<IUser[]>((resolve, reject) => {
        try {
            User.find(function (error: Error, user: IUser[]) {
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

export async function getUserCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        try {
            User.find(function (error: Error, users: typeof User) {
                if (error) {
                    reject(error);
                } else {
                    resolve(users.length);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};
