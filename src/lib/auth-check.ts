import { RequestHandler } from "express";
import AuthModule from "./auth";

export function refreshToken(): RequestHandler {
    return (req,res,next) => {
        //only refresh if there's a user in context
        if (req.user && req.user.sub) {
            const newToken = new AuthModule().getToken(
                req.user.username,
                req.user.sub,
                req.user.isAdmin
            );
            res.setHeader('token',newToken);
        }

        next();
    }
}

/**
 * Requires an authenticated request, and optionally that the user have one of the
 * roles specified.
 * 
 * If unauthenticated, halts request with 401. If no roles match,
 * halts request with 403.
 * 
 * @param roles optional set of roles, the user must have at least one of these
 */
export function userCheck(...roles: string[]): RequestHandler {
    return (req,res,next) => {
        if (!req.user || !req.user.sub) return res.sendStatus(401);

        if (req.user.useExp < Math.floor(Date.now() / 1000)) {
            //TODO: generate a new token
            const newToken = new AuthModule().getToken(
                req.user.username,
                req.user.sub,
                req.user.isAdmin
            );
            res.setHeader('token',newToken);
            //TODO: replace the user in context
        }

        if (roles.length > 0) {
            const userRoles = req.user.roles as string[];
            if (!roles.some(r => userRoles.includes(r))) return res.sendStatus(403);
        }
        next();
    }
}

/**
 * Requires an authenticated admin request, and optionally that the user have one of the
 * roles specified.
 * 
 * If unauthenticated, halts request with 401. If not an admin, halts request with 403.
 * If no roles match, halts request with 403.
 * 
 * @param roles optional set of roles, the user must have at least one of these
 */
export function adminCheck(...roles: string[]): RequestHandler {
    return (req,res,next) => {
        if (!req.user || !req.user.sub) return res.sendStatus(401);
        if (!req.user.isAdmin) return res.sendStatus(403);
        if (roles.length > 0) {
            const userRoles = req.user.roles as string[];
            if (!roles.some(r => userRoles.includes(r))) return res.sendStatus(403);
        }
        next();
    }
}