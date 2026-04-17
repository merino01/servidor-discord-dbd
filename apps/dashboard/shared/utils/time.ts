export const TimeUtils = {
	minutesToSeconds: (minutes: number) => minutes * 60,
	hoursToSeconds: (hours: number) => hours * 60 * 60,
	daysToSeconds: (days: number) => days * 24 * 60 * 60
} as const
