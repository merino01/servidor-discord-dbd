// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },

	modules: [
		"@nuxt/eslint",
		"@nuxt/fonts",
		"@nuxtjs/i18n",
		"@pinia/nuxt",
		"@nuxt/ui",
		"@nuxt/icon",
		"nuxt-auth-utils"
	],

	css: [
		"@/assets/css/main.css"
	],

	app: {
		pageTransition: { name: "page", mode: "out-in" }
	},

	i18n: {
		defaultLocale: "es",
		locales: [
			{ code: "es", name: "Español", file: "es.json" },
			{ code: "en", name: "English", file: "en.json" }
		]
	},

	typescript: {
		tsConfig: {
			compilerOptions: {
				customConditions: ["@org/source"]
			}
		}
	},

	nitro: {
		externals: {
			inline: ["@org/config", "@org/logger", "@org/mongo", "@org/redis"]
		}
	}
})
