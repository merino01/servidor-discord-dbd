export function useRedis () {
	const { redis } = useNitroApp()

	return redis
}
