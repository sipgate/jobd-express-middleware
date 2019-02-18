import * as express from "express";
import * as fs from "fs";
import * as request from "supertest";
import * as xml2js from "xml2js";
import jobd from "./";
import { Job } from "./model";

const job: Job = {
	action: () => Promise.resolve(),
	interval: {
		daysOfMonth: "*",
		daysOfWeek: "*",
		hoursOfDay: "*",
		minutesOfHour: "*",
		secondsOfMinute: "*",
		timeout: 300
	},
	maxFailuresAllowedBeforeNotification: 3,
	name: "my-job",
	triggerDirectly: true
};

function loadXmlAsString(path: string): string {
	return fs
		.readFileSync(path)
		.toString()
		.replace(/\s/g, "");
}

function writeXmlFile(path: string, content: string): void {
	fs.writeFileSync(path, content);
}

const app: express.Application = express();
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
	const expected: string = loadXmlAsString("test/getCronTab_expected.xml");
	request(app)
		.post("/RPC2")
		.send("<xml><method>cron.getCronTab</method></xml>")
		.set("Content-Type", "application/xml")
		.expect(expected)
		.expect(200)
		.end((e, res) => {
			writeXmlFile("test/getCronTab_actual.xml", res.text);
			xml2js.parseString(res.text, (e1,result) => {
				xml2js.parseString(expected, (e2,resultt) => {
					// tslint:disable-next-line:no-console
					expect(result).toEqual(resultt);
					done();
				});
			});
		});
});
