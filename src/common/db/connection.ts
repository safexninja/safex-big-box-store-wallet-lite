import { connect, disconnect, Mongoose } from 'mongoose';

export async function connectDb(host: string, databaseName: string, user: string, pass: string, port: number): Promise<Mongoose> {
    return await connect(`mongodb://${host}:${port}/${databaseName}`,{
        authSource: databaseName,
        user: user,
        pass: pass
    })
};

export async function disconnectDb(): Promise<void> {
    return await disconnect()
};