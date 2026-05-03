import { APIInteractionDataResolvedChannel, GuildBasedChannel } from "discord.js"

export interface CreateOptions {
		name: string,
		channel: TargetChannel,
		category: TargetChannel,
		cronExpression: string | null,
		message: string | null,
		messageEmbed: string | null
		waitTime: number | null,
		pin: boolean
	}

export type TargetChannel = GuildBasedChannel | APIInteractionDataResolvedChannel | null
