import { RequestHandler } from "express";

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