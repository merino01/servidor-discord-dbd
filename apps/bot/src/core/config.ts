import { type AppConfig, getConfig as getAppConfig } from "@org/config"

export function getConfig (): AppConfig {
	return getAppConfig()
}
