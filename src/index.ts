import { NextFunction, Request, Response, Router } from "express";
import { logger } from "./logger";
import { JobDFunction } from "./model";
import { text } from "body-parser";

function isJobDRequest(req: Request) {
	const body = JSON.stringify(req.body);
	const isTriggerJob = body && body.match(/cron.triggerJob/i);
	return isTriggerJob;
}

async function parseJobDRequest(req: Request) {
	logger("Body", req.body);
	return new Promise((resolve, reject) => {
		try {
			let uniqueId = null;
			let notificationUrl = null;
			req.body.methodcall.params.forEach(params => {
				params.param.forEach(param => {
					param.value.forEach(value => {
						value.struct.forEach(struct => {
							struct.member.forEach(member => {
								if (member.name.includes("uniqueid")) {
									uniqueId = member.value[0].string[0];
								} else if (member.name.includes("notificationUrl")) {
									notificationUrl = member.value[0].string[0];
								}
							});
						});
					});
				});
			});
			resolve({
				uniqueId,
				notificationUrl
			});
		} catch (e) {
			reject(e);
		}
	});
}

async function handleJobDRequest(jobdFunction: JobDFunction, req: Request, res: Response) {
	try {
		const data = await parseJobDRequest(req);
		logger("Triggering jobd function", data);
		const startTime = Date.now();
		const result = await jobdFunction();
		const endTime = Date.now();
		const executionTime = endTime - startTime;
		logger(`JobD function execution took ${executionTime}ms`);
		res.sendStatus(200);
	} catch (e) {
		logger("Failed to execute jobd function", e);
		res.sendStatus(500);
	}
}

function createMiddlware(name: string, cron: string, jobdFunction: JobDFunction) {
	logger(`Create JobD function ${name} with cron ${cron}`);
	const router = Router();

	router.post("/RPC2", text({ type: "*/*" }), async function(req: Request, res: Response) {
		try {
			if (isJobDRequest(req)) {
				await handleJobDRequest(jobdFunction, req, res);
				// Do not continue routing context
				return;
			}
		} catch (e) {
			logger("Cannot handle JobD request", e);
		}
	});

	return router;
}

export default createMiddlware;
