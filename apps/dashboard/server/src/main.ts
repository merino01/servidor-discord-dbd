import express from "express"
import { join } from "node:path"
import { existsSync } from "node:fs"
import cors from "cors"
import { dashboardLogger } from "./lib/logger"
import { getConfig } from "@org/config"
import { createRouter } from "./router"
import { isDevelopment, isProduction } from "./lib/environment"

const config = getConfig()
const router = createRouter()

const host = process.env.HOST ?? "localhost"
const { port } = config.dashboard

const app = express()
app.use(express.json())
if (isDevelopment) {
	app.use(cors({
		allowedHeaders: ["Content-Type"],
		origin: "*"
	}))
}

// API routes
app.get("/api/health", (req, res) => {
	res.json({ message: "Dashboard API OK", timestamp: new Date() })
})
app.use("/api", router)

// Servir archivos estáticos del frontend en producción
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

