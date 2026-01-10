import express from "express"
import { join } from "node:path"
import { existsSync } from "node:fs"
import { dashboardLogger } from "./lib/logger"

const host = process.env.HOST ?? "localhost"
const port = process.env.PORT ? Number(process.env.PORT) : 3000

const app = express()

app.use(express.json())

// API routes
app.get("/api/health", (req, res) => {
	res.json({ message: "Dashboard API OK", timestamp: new Date() })
})

// Servir archivos estáticos del frontend en producción
const isProduction = process.env.NODE_ENV === "production"
if (isProduction) {
	// Buscar el build del cliente
	const clientDistPath = join(process.cwd(), "dist-client")

	if (existsSync(clientDistPath)) {
		dashboardLogger.info(`Sirviendo archivos estáticos desde: ${clientDistPath}`)
		app.use(express.static(clientDistPath))
		// SPA fallback: todas las rutas que no sean /api/* devuelven index.html
		app.get("*", (req, res) => {
			if (!req.path.startsWith("/api")) {
				res.sendFile(join(clientDistPath, "index.html"))
			}
		})
	} else {
		dashboardLogger.warn(`No se encontró el build del cliente en: ${clientDistPath}`)
	}
} else {
	dashboardLogger.info("En desarrollo - usar Vite dev server por separado")
}

app.listen(port, host, () => {
	dashboardLogger.info(`[ ready ] http://${host}:${port}`)
})
