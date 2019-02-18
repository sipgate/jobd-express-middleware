import * as request from "supertest";
import * as express from "express";
import jobd from "./";
import { Job } from "./model";

const job: Job = {
	action: () => Promise.resolve(),
	name: "my-job",
	interval: {
		daysOfMonth: "*",
		daysOfWeek: "*",
		hoursOfDay: "*",
		minutesOfHour: "*",
		secondsOfMinute: "*",
		timeout: 300
	},
	maxFailuresAllowedBeforeNotification: 3,
	triggerDirectly: true
};

const app = express();
app.use(jobd("my-little-system", [job]));

test("functions.xml", done => {
	request(app)
		.get("/functions.xml")
		.expect("Content-Type", /xml/)
		.expect(/cron\.triggerJob/)
		.expect(/cron\.getCronTab/)
		.expect(200, done);
});

test("cron.getCronTab", done => {
	request(app)
		.post("/RPC2")
		.send("<xml><method>cron.getCronTab</method></xml>")
		.set("Content-Type", "application/xml")
		.expect("fooooo")
		.expect(200, done);
});
