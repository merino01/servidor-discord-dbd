import mongoose from "mongoose"
import { getConfig } from "@org/config"
import { logger } from "@org/logger"

const config = getConfig()

const mongoLogger = logger.child("mongo")

interface MongoConfig {
  uri?: string;
  options?: mongoose.ConnectOptions;
}

let isConnected = false

/**
 * Obtiene la URI de MongoDB desde variables de entorno
 */
function getMongoUri (): string {
	const uri = process.env.MONGO_URI || process.env.MONGODB_URI || config.databases.mongo.uri

	if (!uri) {
		throw new Error(
			"❌ No se encontró la variable de entorno MONGO_URI o MONGODB_URI\n" +
			"   Configura la URI de MongoDB en las variables de entorno."
		)
	}

	return uri
}

/**
 * Conecta a MongoDB
 * Si no se proporciona URI, se lee de la variable de entorno MONGO_URI o MONGODB_URI
 */
export async function connectMongo (_config?: MongoConfig): Promise<void> {
	if (isConnected) {
		mongoLogger.debug("Ya conectado a MongoDB")
		return
	}

	const uri = _config?.uri || getMongoUri()

	try {
		await mongoose.connect(uri, {
			maxPoolSize: 10,
			minPoolSize: 2,
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000,
			..._config?.options
		})

		isConnected = true
		mongoLogger.info("Conectado a MongoDB")

		// Eventos de mongoose
		mongoose.connection.on("error", (error) => {
			mongoLogger.error("Error de MongoDB:", error)
		})

		mongoose.connection.on("disconnected", () => {
			mongoLogger.warn("MongoDB desconectado")
			isConnected = false
		})

		mongoose.connection.on("reconnected", () => {
			mongoLogger.info("MongoDB reconectado")
			isConnected = true
		})
	} catch (error) {
		mongoLogger.error("Error al conectar a MongoDB:", error)
		throw error
	}
}

/**
 * Desconecta de MongoDB
 */
export async function disconnectMongo (): Promise<void> {
	if (!isConnected) {
		return
	}

	try {
		await mongoose.disconnect()
		isConnected = false
		mongoLogger.info("Desconectado de MongoDB")
	} catch (error) {
		mongoLogger.error("Error al desconectar de MongoDB:", error)
		throw error
	}
}

/**
 * Verifica si está conectado
 */
export function isMongoConnected (): boolean {
	return isConnected
}

/**
 * Obtiene la conexión de mongoose (útil para transacciones)
 */
export function getMongoConnection (): mongoose.Connection {
	return mongoose.connection
}
