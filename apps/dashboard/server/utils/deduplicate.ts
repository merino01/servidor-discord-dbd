const pendingPromises = new Map<string, Promise<unknown>>()

export async function getOrCreateInFlightRequest<T> (key: string, fn: () => Promise<T>): Promise<T> {
	if (pendingPromises.has(key)) {
		return pendingPromises.get(key) as Promise<T>
	}

	const promise = fn().finally(() => pendingPromises.delete(key))
	pendingPromises.set(key, promise)

	return promise
}
