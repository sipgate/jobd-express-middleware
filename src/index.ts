import { NextFunction, Request } from "express";


export const jobDMiddleware = (req: Request, res: Response, next: NextFunction) => {
	console.log("Request", req)
	next();
}

export default jobDMiddleware;