import * as express from "express";
import { Request, Response, Router } from "express";
import * as xmlParser from "express-xml-bodyparser";
import { logger } from "./logger";
import * as isNumber from "is-number";
import { Job, Trigger } from "./model";
import * as xml from "xml";

function toMember(key: string, value: string| number) {
	return { member: [{ name: key }, { value: [{ [isNumber(value) ? "i4" : "string"]: value }] }] };
}

function toJobMember(job: Job) {
	const jobStruct = {
		member: [
			{ name: "jobs" },
			{
				value: [
					{
						struct: [
							{
								member: [
									{ name: job.name },
									{
										value: [
											{
												struct: [{
													member: [
														{
															name: "interval"
														},
														{
															value: [
																{
																	struct: Object.keys(job.interval).sort().map(key =>
																		toMember(key, job.interval[key])
																	)
																}
															]
														}
													]
												},
												toMember("maxFailuresAllowedBeforeNotification", job.maxFailuresAllowedBeforeNotification)

											]
											}
										]
									}
								]
							}
						]
					}
				]
			}
		]
	};
	// console.log(JSON.stringify(jobStruct, null, 2))
	return jobStruct;
}

function toResponse(systemName: string, jobs: Job[]) {
	return {
		methodResponse: [
			{
				params: [
					{
						param: [
							{
								value: [
									{
										struct: [
											toMember("faultString", "ok"),
											toMember("faultCode", "200"),
											toMember("systemName", systemName),
											...jobs.map(toJobMember)
										]
									}
								]
							}
						]
					}
				]
			}
		]
	};
}

function isGetCronTab(req: Request): boolean {
	return /cron\.getCronTab/i.test(JSON.stringify(req.body));
}

function isTriggerJob(req: Request): boolean {
	return /cron\.triggerJob/i.test(JSON.stringify(req.body));
}

function parseTriggerJobRequest(req: Request): Trigger {
	let id = null;
	let name = null;
	let url = null;

	try {
		req.body.methodcall.params.forEach(params => {
			params.param.forEach(param => {
				param.value.forEach(value => {
					value.struct.forEach(struct => {
						struct.member.forEach(member => {
							if (member.name.includes("uniqueid")) {
								id = member.value[0].string[0];
							} else if (member.name.includes("jobName")) {
								name = member.value[0].string[0];
							} else if (member.name.includes("notificationUrl")) {
								url = member.value[0].string[0];
							}
						});
					});
				});
			});
		});
	} catch (error) {
		logger("Could not parse job request", error);
	}

	return {
		id,
		name,
		url
	};
}

function createMiddleware(systemName: string, jobs: Job[]) {
	logger(`Initializing JobD middleware`);
	const router = Router();

	// TODO check if this works after build
	router.use(express.static("public"));

	router.post("/RPC2", xmlParser(), async function(req: Request, res: Response) {
		if (isGetCronTab(req)) {
			res.set("Content-Type", "text/xml");
			res.send(xml(toResponse(systemName, jobs)));
		} else if (isTriggerJob(req)) {
			const { id, name, url } = parseTriggerJobRequest(req);
			const job = jobs.find(job => job.name === name);

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

			try {
				const startTime = Date.now();
				await job.action();
				const endTime = Date.now();

				logger(`${name} took ${endTime - startTime} seconds`);

				// TODO send success to notificationUrl with uniqueid
			} catch (error) {
				logger(`Job ${name} failed`, error);
				// TODO send error to notificationUrl with uniqueid
				console.log("Success", id, url);
			}
		} else {
			res.sendStatus(404);
		}
	});

	return router;
}

export default createMiddleware;
