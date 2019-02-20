# jobd-express-middleware

Use this express middleware if you are writing

## Usage

```ts
import * as express from "express";
import { jobd, Job } from "@sipgate/jobd-express-middleware";

const job: Job = {
	// Name your job
	name: "my-job",

	// Reject the return promise on error or a resolve it on success
	action: () => Promise.resolve(),

	// Run every day on 4 am
	interval: {
		daysOfMonth: "*",
		daysOfWeek: "*",
		hoursOfDay: "4",
		minutesOfHour: "0",
		secondsOfMinute: "0",
		timeout: 300
	},

	// Allow this job to fail three times before notification
	maxFailuresAllowedBeforeNotification: 3,

	// Run this job on all nodes (true) or just a single one (false)
	triggerDirectly: true
};

const app = express();

app.use(jobd("my-system-name", [job]));

app.listen(3000);
```

## License

The MIT License (MIT)

Copyright (c) 2019 sipgate GmbH
