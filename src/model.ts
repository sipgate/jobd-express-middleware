export interface Job {
	name: string;
	interval: {
		secondsOfMinute: string;
		minutesOfHour: string;
		hoursOfDay: string;
		daysOfWeek: string;
		daysOfMonth: string;
		timeout: number;
	};
	action: () => Promise<void>;
	triggerDirectly: boolean;
	maxFailuresAllowedBeforeNotification: number;
}
