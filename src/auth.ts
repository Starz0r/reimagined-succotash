import config from './config/config';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export default class AuthModule {
    public getToken(username: string, id: number, isAdmin: boolean) {
        return jwt.sign({username,isAdmin},
          config.app_jwt_secret,
          {
            expiresIn: "1 day",
            subject: ""+id
          });
    }

    public async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password,10);
    }

    public async verifyPassword(hash: string, password: string): Promise<boolean> {
        if (!password) return false;
        return await bcrypt.compare(password,hash.replace(/^\$2y/, "$2a"));
    }
}