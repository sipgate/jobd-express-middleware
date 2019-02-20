import axios from "axios";
import * as express from "express";
// tslint:disable-next-line:no-duplicate-imports
import { Request, Response, Router } from "express";
import * as xmlParser from "express-xml-bodyparser";
import { logger } from "./logger";
import { Job } from "./model";
import { cronTabResponse, methodCallResponse, parseTriggerRequest, successResponse } from "./xml";

function isGetCronTab(req: Request): boolean {
	return /cron\.getCronTab/i.test(JSON.stringify(req.body));
}

function isTriggerJob(req: Request): boolean {
	return /cron\.triggerJob/i.test(JSON.stringify(req.body));
}

async function respondJobStatus(url, systemName, name, success: boolean, id) {
	const response = methodCallResponse("jobd.updateEvent", systemName, name, success, id);
	logger(`Responding job status to ${url}`, response);

	const { statusText, status, data } = await axios.post(url, response, {
		headers: { "content-type": "application/xml" }
	});
	logger("JobD repsonse result", { statusText, status, data });
}

function requestHandler(systemName: string, jobs: Job[]) {
	return async (req: Request, res: Response) => {
		if (isGetCronTab(req)) {
			logger(`GetCronTab ${systemName}`);
			res.type("xml").send(cronTabResponse(systemName, jobs));
		} else if (isTriggerJob(req)) {
			const { id, name, url } = parseTriggerRequest(req);
			logger(`Triggering job ${id}/${name}`);
			try {
				const job = jobs.find(j => j.name === name);

				if (!id || !name || !url) {
					res.sendStatus(500);
					return;
				} else if (!job) {
					logger(`Job ${name} not found`);
					res.type("xml").sendStatus(404);
					return;
				} else {
					logger(`Job ${name} found`);
					res.type("xml").send(successResponse());
				}

				const startTime: number = Date.now();
				await job.action();
				const endTime: number = Date.now();

				logger(`Job ${name} succeded. It took ${endTime - startTime}ms`);
				respondJobStatus(url, systemName, name, true, id);
			} catch (error) {
				logger(`Job ${name} failed`, error);
				respondJobStatus(url, systemName, name, false, id);
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
