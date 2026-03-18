import { readFileSync, existsSync } from "node:fs"
import { join, resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

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

export interface RedisConfig {
	host: string
	port: number
	username?: string
	password?: string
}

export interface AppConfig {
	discord: DiscordConfig
	bot: BotConfig
	features: FeaturesConfig
	databases: {
		mongo: MongoConfig
		redis: RedisConfig
	}
	dashboard: DashboardConfig
}

let cachedConfig: AppConfig | null = null

export function loadConfig (): AppConfig {
	if (cachedConfig) {
		return cachedConfig
	}

	// Buscar config.json en dos ubicaciones posibles
	const possiblePaths = [
		resolve(join(__dirname, "..", "..", "..", "..", "config.json")),
		resolve(join(__dirname, "..", "..", "..", "config.json"))
	]

	let configPath: string | null = null
	for (const path of possiblePaths) {
		if (existsSync(path)) {
			configPath = path
			break
		}
	}

	if (!configPath) {
		throw new Error("No se encontró config.json en las rutas esperadas")
	}

	const configContent = readFileSync(configPath, "utf-8")
	cachedConfig = JSON.parse(configContent) as AppConfig

	return cachedConfig
}

export function getConfig (): AppConfig {
	return loadConfig()
}

export default getConfig
