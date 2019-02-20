import { Request } from "express";
import * as xml from "xml";
import { logger } from "./logger";
import { Job } from "./model";

function isNumber(x: any): x is number {
	return typeof x === "number";
}

function member(key: string, value: string | number) {
	return { member: [{ name: key }, { value: [{ [isNumber(value) ? "i4" : "string"]: value }] }] };
}

function jobMember(job: Job) {
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
												struct: [
													{
														member: [
															{
																name: "interval"
															},
															{
																value: [
																	{
																		struct: Object.keys(job.interval)
																			.sort()
																			.map((key: keyof Job["interval"]) =>
																				member(key, job.interval[key])
																			)
																	}
																]
															}
														]
													},
													member(
														"maxFailuresAllowedBeforeNotification",
														job.maxFailuresAllowedBeforeNotification
													)
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

export function response(struct: any[]) {
	return {
		methodResponse: [
			{
				params: [
					{
						param: [
							{
								value: [
									{
										struct
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

export function cronTabResponse(systemName: string, jobs: Job[]) {
	return xml(
		response([
			member("faultString", "ok"),
			member("faultCode", "200"),
			member("systemName", systemName),
			...jobs.map(jobMember)
		])
	);
}

export function successResponse() {
	return xml(response([member("faultString", "ok"), member("faultCode", "200")]));
}

export function methodCallResponse(
	methodName: string,
	systemName: string,
	eventName: string,
	success: boolean,
	uniqueId: string
) {
	return xml({
		methodCall: [
			{
				methodName
			},
			{
				params: [
					{
						param: [
							{
								value: [
									{
										struct: [
											member("eventName", eventName),
											member("status", success ? "success" : "error"),
											member("uniqueid", uniqueId),
											member("systemName", systemName)
										]
									}
								]
							}
						]
					}
				]
			}
		]
	});
}

export function parseTriggerRequest(req: Request) {
	let id: string = null;
	let name: string = null;
	let url: string = null;

	try {
		req.body.methodcall.params.forEach((params: any) => {
			params.param.forEach((p: any) => {
				p.value.forEach((v: any) => {
					v.struct.forEach((s: any) => {
						s.member.forEach((m: any) => {
							if (m.name.includes("uniqueid")) {
								id = m.value[0].string[0];
							} else if (m.name.includes("jobName")) {
								name = m.value[0].string[0];
							} else if (m.name.includes("notificationUrl")) {
								url = m.value[0].string[0];
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
