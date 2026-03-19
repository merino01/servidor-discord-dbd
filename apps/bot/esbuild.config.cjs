const { resolve, join } = require("node:path")
const { readdirSync, existsSync } = require("node:fs")

/**
 * Plugin que genera automáticamente un módulo virtual `~modules` importando
 * todos los archivos `*.module.ts` que existan en src/modules/* (cualquier
 * nombre), con `index.ts` como fallback. De esta forma no hay que importar
 * cada módulo manualmente en bootstrap.ts.
 */
const moduleDiscoveryPlugin = {
	name: "module-discovery",
	setup (build) {
		build.onResolve({ filter: /^~modules$/ }, () => ({
			path: "~modules",
			namespace: "module-discovery"
		}))

		build.onLoad({ filter: /.*/, namespace: "module-discovery" }, () => {
			const modulesDir = resolve(__dirname, "src", "modules")
			const dirs = readdirSync(modulesDir, { withFileTypes: true })
				.filter((entry) => entry.isDirectory())

			const imports = dirs
				.map(({ name }) => {
					const moduleFile = readdirSync(join(modulesDir, name))
						.find((file) => file.endsWith(".module.ts"))
					if (moduleFile) {
						const stem = moduleFile.replace(/\.ts$/, "")
						return `import "./src/modules/${name}/${stem}"`
					}
					if (existsSync(join(modulesDir, name, "index.ts"))) {
						return `import "./src/modules/${name}/index"`
					}
					return null
				})
				.filter(Boolean)
				.join("\n")

			return { contents: imports, loader: "ts", resolveDir: __dirname }
		})
	}
}

module.exports = {
	plugins: [moduleDiscoveryPlugin],
	sourcemap: false,
	outExtension: { ".js": ".js" }
}
