import { GuildMember, VoiceChannel, VoiceState, Guild } from "discord.js"
import { botEvents } from "@/core/events/bot-events"
import { Injectable } from "@/core/container"
import { RandomChannelRepository } from "../repositories/random-channel.repository"

interface RandomChannelConfig {
	categoryId: string | null
	channelIds: string[]
	excludeChannels: boolean
}

@Injectable(RandomChannelRepository)
export class RandomChannelListener {
	constructor (private readonly repository: RandomChannelRepository) {}

	register (): void{
		botEvents.on("voice:join", (member, voiceState) => this.handleRandomChannelJoin(member, voiceState))
		botEvents.on("voice:move", (member, voiceState, newVoiceState) => {
			this.handleRandomChannelJoin(member, voiceState, newVoiceState)
		})
	}

	private isValidVoiceChannel (channel: unknown): channel is VoiceChannel {
		return channel instanceof VoiceChannel && channel.joinable && !channel.full
	}

	private getChannelsWithExclusion (
		allChannels: VoiceChannel[],
		config: RandomChannelConfig
	): VoiceChannel[] {
		return allChannels.filter(
			(c) => c.parentId === config.categoryId &&
				c.id !== null &&
				!config.channelIds.includes(c.id)
		)
	}

	private getChannelsByCategory (
		allChannels: VoiceChannel[],
		categoryId: string
	): VoiceChannel[] {
		return allChannels.filter((c) => c.parentId === categoryId)
	}

	private getChannelsByIds (
		allChannels: VoiceChannel[],
		channelIds: string[]
	): VoiceChannel[] {
		return allChannels.filter((c) => c.id !== null && channelIds.includes(c.id))
	}

	private async fetchAvailableChannels (guild: Guild): Promise<VoiceChannel[]> {
		const allChannels = await guild.channels.fetch()
		return Array.from(allChannels.values()).filter((c) => this.isValidVoiceChannel(c))
	}

	private async selectChannelsToPick (
		guild: Guild,
		config: RandomChannelConfig
	): Promise<VoiceChannel[]> {
		const availableChannels = await this.fetchAvailableChannels(guild)

		if (config.excludeChannels) {
			return this.getChannelsWithExclusion(availableChannels, config)
		}

		if (!config.excludeChannels && config.categoryId) {
			return this.getChannelsByCategory(availableChannels, config.categoryId)
		}

		if (config.channelIds.length > 0) {
			return this.getChannelsByIds(availableChannels, config.channelIds)
		}

		return []
	}

	private filterOccupiedChannels (channels: VoiceChannel[]): VoiceChannel[] {
		if (channels.some((c) => c.members.size > 0)) {
			return channels.filter((c) => c.members.size > 0)
		}
		return channels
	}

	private filterMainChannel (channels: VoiceChannel[], mainChannelId: string): VoiceChannel[] {
		return channels.filter((c) => c.id !== mainChannelId)
	}

	private selectRandomChannel (channels: VoiceChannel[]): VoiceChannel | undefined {
		if (channels.length === 0) {
			return undefined
		}
		return channels[Math.floor(Math.random() * channels.length)]
	}

	private async handleRandomChannelJoin (
		member: GuildMember,
		voiceState: VoiceState,
		newVoiceState?: VoiceState
	): Promise<void> {
		const { channel } = newVoiceState ?? voiceState
		if (!channel) {
			return
		}

		const randomChannelConfig = await this.repository.findByMainChannelId(channel.id, channel.guild.id)
		if (!randomChannelConfig) {
			return
		}

		const channelsToPick = await this.selectChannelsToPick(channel.guild, randomChannelConfig)
		const noMainChannelList = this.filterMainChannel(channelsToPick, randomChannelConfig.mainChannelId)
		const filteredChannels = this.filterOccupiedChannels(noMainChannelList)
		const randomChannel = this.selectRandomChannel(filteredChannels)

		if (!randomChannel) {
			return
		}

		await member.voice.setChannel(randomChannel)
	}
}
