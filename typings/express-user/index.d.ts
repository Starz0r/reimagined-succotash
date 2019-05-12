declare module 'express-user' {
}

//This allows express-jwt to function, because express-jwt sets the user data in Request.user
//after validating the jwt token, but express does not declare such a member on request.

//This is an "Ambient Declaration"
declare namespace Express {
    export interface Request {
        user: any;
    }
}
