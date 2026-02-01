import { GuildMember, VoiceChannel, VoiceState, Guild } from "discord.js"
import { botEvents } from "@/core/events/bot-events"
import { RandomChannelModel } from "@org/mongo"

interface RandomChannelConfig {
	categoryId: string | null
	channelIds: string[]
	excludeChannels: boolean
}

const isValidVoiceChannel = (
	channel: unknown
): channel is VoiceChannel => channel instanceof VoiceChannel && channel.joinable && !channel.full

const getChannelsWithExclusion = (
	allChannels: VoiceChannel[],
	config: RandomChannelConfig
): VoiceChannel[] => allChannels.filter((c) => c.parentId === config.categoryId &&
		c.id !== null &&
		!config.channelIds.includes(c.id)
)

const getChannelsByCategory = (
	allChannels: VoiceChannel[],
	categoryId: string
): VoiceChannel[] => allChannels.filter((c) => c.parentId === categoryId)

const getChannelsByIds = (
	allChannels: VoiceChannel[],
	channelIds: string[]
): VoiceChannel[] => allChannels.filter((c) => c.id !== null && channelIds.includes(c.id))

const fetchAvailableChannels = async (guild: Guild): Promise<VoiceChannel[]> => {
	const allChannels = await guild.channels.fetch()
	return Array.from(allChannels.values()).filter(isValidVoiceChannel)
}

const selectChannelsToPick = async (guild: Guild, config: RandomChannelConfig): Promise<VoiceChannel[]> => {
	const availableChannels = await fetchAvailableChannels(guild)

	if (config.excludeChannels) {
		return getChannelsWithExclusion(availableChannels, config)
	}

	if (!config.excludeChannels && config.categoryId) {
		return getChannelsByCategory(availableChannels, config.categoryId)
	}

	if (config.channelIds.length > 0) {
		return getChannelsByIds(availableChannels, config.channelIds)
	}

	return []
}

const filterOccupiedChannels = (channels: VoiceChannel[]): VoiceChannel[] => {
	if (channels.some((c) => c.members.size > 0)) {
		return channels.filter((c) => c.members.size > 0)
	}
	return channels
}

const selectRandomChannel = (channels: VoiceChannel[]): VoiceChannel | undefined => {
	if (channels.length === 0) {
		return undefined
	}
	return channels[Math.floor(Math.random() * channels.length)]
}

const handleRandomChannelJoin = async (member: GuildMember, voiceState: VoiceState, newVoiceState?: VoiceState) => {
	const { channel } = newVoiceState ?? voiceState
	if (!channel) {
		return
	}

	const randomChannelConfig = await RandomChannelModel.findOne({
		guildId: member.guild.id,
		mainChannelId: channel.id
	})
	if (!randomChannelConfig) {
		return
	}

	const channelsToPick = await selectChannelsToPick(channel.guild, randomChannelConfig)
	const filteredChannels = filterOccupiedChannels(channelsToPick)
	const randomChannel = selectRandomChannel(filteredChannels)

	if (!randomChannel) {
		return
	}

	await member.voice.setChannel(randomChannel)
}

botEvents.on("voice:join", handleRandomChannelJoin)
botEvents.on("voice:move", handleRandomChannelJoin)
