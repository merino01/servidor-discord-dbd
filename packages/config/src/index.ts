import { readFileSync, existsSync } from "node:fs"
import { join, resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

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

function getModuleDirectory (): string | null {
	try {
		return dirname(fileURLToPath(import.meta.url))
	} catch {
		return null
	}
}

function getConfigCandidates (): string[] {
	const candidates = new Set<string>()
	const cwd = process.cwd()

	if (process.env.ORG_CONFIG_PATH) {
		candidates.add(resolve(process.env.ORG_CONFIG_PATH))
	}

	candidates.add(resolve(join(cwd, "config.json")))
	candidates.add(resolve(join(cwd, "..", "config.json")))
	candidates.add(resolve(join(cwd, "..", "..", "config.json")))

	const moduleDirectory = getModuleDirectory()
	if (moduleDirectory) {
		candidates.add(resolve(join(moduleDirectory, "..", "..", "..", "..", "config.json")))
		candidates.add(resolve(join(moduleDirectory, "..", "..", "..", "config.json")))
	}

	return [...candidates]
}

export function loadConfig (): AppConfig {
	if (cachedConfig) {
		return cachedConfig
	}

	const possiblePaths = getConfigCandidates()

	let configPath: string | null = null
	for (const path of possiblePaths) {
		if (existsSync(path)) {
			configPath = path
			break
		}
	}

	if (!configPath) {
		throw new Error(`No se encontró config.json en las rutas esperadas: ${possiblePaths.join(", ")}`)
	}

	const configContent = readFileSync(configPath, "utf-8")
	cachedConfig = JSON.parse(configContent) as AppConfig

	return cachedConfig
}

export function getConfig (): AppConfig {
	return loadConfig()
}

export default getConfig
