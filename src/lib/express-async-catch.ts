import { RequestHandler } from "express";

function handle(fn: RequestHandler): RequestHandler {
    return (req, res, next) => Promise
        .resolve(fn(req, res,next))
        .catch(next);
}

export default handle;