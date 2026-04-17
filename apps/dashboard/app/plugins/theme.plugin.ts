export default defineNuxtPlugin({
	name: "theme",
	enforce: "pre",
	setup () {
		const appConfig = useAppConfig()

		try {
			const saved = localStorage.getItem("ui-theme")
			if (!saved) {return}

			const { primary, secondary, neutral, radius } = JSON.parse(saved)

			if (primary) { appConfig.ui.colors.primary = primary }
			if (secondary) { appConfig.ui.colors.secondary = secondary }

			if (neutral) { appConfig.ui.colors.neutral = neutral }
			// El radius ya lo aplica el script inline del head,
			// pero lo sincronizamos igualmente por si acaso
			if (radius) { document.documentElement.style.setProperty("--ui-radius", radius) }

		} catch {/* */}
	}
})
