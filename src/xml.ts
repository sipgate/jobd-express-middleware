import { Request } from "express";
import * as isNumber from "is-number";
import { logger } from "./logger";
import { Job, Trigger } from "./model";

function toMember(key: string, value: string| number): any {
	return { member: [{ name: key }, { value: [{ [isNumber(value) ? "i4" : "string"]: value }] }] };
}

function toJobMember(job: Job): any {
	return {
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
}

export function toResponse(systemName: string, jobs: Job[]): any {
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

export function parseTriggerJobRequest(req: Request): Trigger {
	let id: string = null;
	let name: string = null;
	let url: string = null;

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