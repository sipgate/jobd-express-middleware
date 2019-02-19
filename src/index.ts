import * as express from "express";
// tslint:disable-next-line:no-duplicate-imports
import { Request, Response, Router } from "express";
import * as xmlParser from "express-xml-bodyparser";
import * as xml from "xml";
import { logger } from "./logger";
import { Job } from "./model";
import { parseTriggerJobRequest, toResponse } from "./xml";

function isGetCronTab(req: Request): boolean {
	return /cron\.getCronTab/i.test(JSON.stringify(req.body));
}

function isTriggerJob(req: Request): boolean {
	return /cron\.triggerJob/i.test(JSON.stringify(req.body));
}

function requestHandler(systemName: string, jobs: Job[]) {
	return async (req: Request, res: Response) => {
		if (isGetCronTab(req)) {
			logger(`GetCronTab ${systemName}`);
			res.set("Content-Type", "text/xml");
			res.send(xml(toResponse(systemName, jobs)));
		} else if (isTriggerJob(req)) {
			const { id, name, url } = parseTriggerJobRequest(req);
			logger(`Triggering job ${id}/${name} - ${url}`);
			try {
				const job = jobs.find(j => j.name === name);

				if (!id || !name || !url) {
					res.sendStatus(500);
					return;
				} else if (!job) {
					logger(`Job ${name} not found`);
					res.sendStatus(404);
					return;
				} else {
					logger(`Job ${name} found`);
					res.sendStatus(200);
				}

				const startTime: number = Date.now();
				await job.action();
				const endTime: number = Date.now();

				logger(`${name} took ${endTime - startTime}ms`);

				// TODO send success to notificationUrl with uniqueid
			} catch (error) {
				logger(`Job ${name} failed`, error);
				// TODO send error to notificationUrl with uniqueid
				logger("Success", id, url);
			}
		} else {
			res.sendStatus(404);
		}
	};
}

function createMiddleware(systemName: string, jobs: Job[]): Router {
	logger(`Initializing JobD middleware`);
	const router: Router = Router();

	// TODO check if this works after build
	router.use(express.static("public"));
	router.post("/RPC2", xmlParser(), requestHandler(systemName, jobs));

	return router;
}

export default createMiddleware;
