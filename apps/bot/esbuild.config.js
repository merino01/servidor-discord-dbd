const { resolve, join } = require("path")

const pathAliasPlugin = {
	name: "path-alias",
	setup (build) {
		// Leer paths del tsconfig
		const tsconfig = require("./tsconfig.app.json")
		const paths = tsconfig.compilerOptions?.paths || {}
		const baseUrl = tsconfig.compilerOptions?.baseUrl || "."
		const srcDir = join(__dirname, baseUrl)

		// Crear filtros para cada alias
		Object.entries(paths).forEach(([alias, [target]]) => {
			// Convertir @types a un patrón regex
			const pattern = alias.replace("/*", "").replace("*", "")
			const filter = new RegExp(`^${pattern}$`)

			build.onResolve({ filter }, (args) => {
				const targetPath = target.replace("/*", "").replace("*", "")
				const resolvedPath = resolve(srcDir, targetPath)
				return { path: resolvedPath }
			})

			// También manejar imports con subcarpetas (ej: @core/BotClient)
			if (alias.endsWith("/*")) {
				const filterWithPath = new RegExp(`^${pattern}/`)
				build.onResolve({ filter: filterWithPath }, (args) => {
					const targetPath = target.replace("/*", "")
					const importSubpath = args.path.replace(pattern + "/", "")
					const resolvedPath = resolve(srcDir, targetPath, importSubpath)
					return { path: resolvedPath }
				})
			}
		})
	}
}

module.exports = {
	plugins: [pathAliasPlugin],
	sourcemap: true,
	outExtension: {
		".js": ".js"
	}
}
