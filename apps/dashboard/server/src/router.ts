import { RedisChannel, RedisClient } from "@org/redis"
import { Router } from "express"

interface Route {
	method: "get" | "post" | "put" | "delete"
	path: string
	handler: (req: any, res: any) => Promise<void>
}

const redis = new RedisClient()

const routes: Route[] = [
	{
		method: "post",
		path: "/crear-clan",
		handler: async (req, res) => {
			try {
				await redis.publish(RedisChannel.STATUS, "Crear clan solicitado desde el dashboard")
			} catch (error) {
				console.log((error as Error).message)
			}

			res.json({ message: "Mensaje publicado en Redis", timestamp: new Date() })
		}
	}
]

export function createRouter (): Router {
	const router = Router()
	for (const route of routes) {
		router[route.method](route.path, route.handler)
	}
	return router
}
