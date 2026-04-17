/**
 * Devuelve el valor cacheado en Redis si existe.
 * Si no, ejecuta `fn` (con deduplicación in-flight) y almacena el resultado.
 *
 * @param key        - Clave de Redis
 * @param ttlSeconds - Tiempo de vida del cache en segundos
 * @param fn         - Función que obtiene el dato (llamada solo en cache miss)
 */
export async function getOrSetCache<T> (key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
	const redis = useRedis()

	const cached = await redis.get<T>(key)
	if (cached !== null) { return cached }

	const result = await getOrCreateInFlightRequest(key, fn)
	await redis.set(key, result, { EX: ttlSeconds })
	return result
}
