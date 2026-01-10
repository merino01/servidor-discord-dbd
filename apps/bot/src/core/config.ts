import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { botLogger } from "@core/logger"

export interface BotConfig {
  discord: {
    token: string;
    guildId: string;
    clientId: string;
  };
  bot: {
    ownerId: string;
    prefix: string;
  };
  features?: {
    triggers?: {
      enabled: boolean;
      maxPerGuild: number;
    };
    autoMod?: {
      enabled: boolean;
    };
  };
}

let cachedConfig: BotConfig | null = null

/**
 * Carga la configuración desde config.json
 */
export function loadConfig (configPath?: string): BotConfig {
	if (cachedConfig) {
		return cachedConfig
	}

	// Si se proporciona una ruta específica, usarla
	if (configPath) {
		const finalPath = configPath
		if (!existsSync(finalPath)) {
			throw new Error(
				`❌ No se encontró el archivo de configuración en: ${finalPath}\n` +
				"   Copia config.example.json a config.json y configúralo."
			)
		}
		return loadFromPath(finalPath)
	}

	// Intentar varias ubicaciones posibles
	const possiblePaths = [
		// En el directorio actual (para producción: dist/)
		join(process.cwd(), "config.json"),
		// En el directorio del ejecutable (dist/)
		join(__dirname, "..", "config.json"),
		// En desarrollo desde src/core
		join(__dirname, "..", "..", "config.json"),
		// Ruta absoluta al directorio del bot
		join(process.cwd(), "apps", "bot", "config.json")
	]

	for (const path of possiblePaths) {
		if (existsSync(path)) {
			botLogger.info(`Config encontrado en: ${path}`)
			return loadFromPath(path)
		}
	}

	throw new Error(
		"❌ No se encontró el archivo de configuración en ninguna ubicación:\n" +
		possiblePaths.map((p) => `   - ${p}`).join("\n") +
		"\n   Copia config.example.json a config.json y configúralo."
	)
}

function loadFromPath (finalPath: string): BotConfig {
	try {
		const configFile = readFileSync(finalPath, "utf-8")
		const config: BotConfig = JSON.parse(configFile)

		// Validar campos requeridos
		validateConfig(config)

		cachedConfig = config
		botLogger.info("Configuración cargada correctamente")
		return config
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error(`❌ Error parsing config.json: JSON inválido\n${error.message}`)
		}
		throw error
	}
}

/**
 * Valida que la configuración tenga los campos requeridos
 */
function validateConfig (config: BotConfig): void {
	const errors: string[] = []

	if (!config.discord?.token) {
		errors.push("discord.token es requerido")
	}

	if (!config.discord?.clientId) {
		errors.push("discord.clientId es requerido")
	}

	if (!config.bot?.ownerId) {
		errors.push("bot.ownerId es requerido")
	}

	if (errors.length > 0) {
		throw new Error(
			`❌ Errores en config.json:\n${errors.map((e) => `   - ${e}`).join("\n")}`
		)
	}

	// Validar que el token tenga formato correcto
	if (config.discord.token === "TU_TOKEN_DE_DISCORD_AQUI") {
		throw new Error("❌ Por favor configura tu token de Discord en config.json")
	}
}

/**
 * Obtiene la configuración (debe haberse cargado previamente)
 */
export function getConfig (): BotConfig {
	if (!cachedConfig) {
		throw new Error("❌ La configuración no ha sido cargada. Llama a loadConfig() primero.")
	}
	return cachedConfig
}
