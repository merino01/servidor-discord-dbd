import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface DiscordConfig {
	token: string
	guildId: string
	clientId: string
}

export interface BotConfig {
	ownerId: string
	prefix: string
}

export interface StatsFeature {
	enabled: boolean
	messageXp: number
	voiceXpPerMinute: number
	messageCooldownMs: number
	levelUpNotificationChannelId: string
}

export interface MongoConfig {
	uri: string
}

export interface FeaturesConfig {
	stats: StatsFeature
}

export interface DashboardConfig {
	port: number
}

export interface AppConfig {
	discord: DiscordConfig
	bot: BotConfig
	features: FeaturesConfig
	databases: {
		mongo: MongoConfig
	}
	dashboard: DashboardConfig
}

let cachedConfig: AppConfig | null = null

export function loadConfig (): AppConfig {
	if (cachedConfig) {
		return cachedConfig
	}

	const configPath = join(__dirname, "../../../config.json")
	const configContent = readFileSync(configPath, "utf-8")
	cachedConfig = JSON.parse(configContent) as AppConfig

	return cachedConfig
}

export function getConfig (): AppConfig {
	return loadConfig()
}

export default getConfig
