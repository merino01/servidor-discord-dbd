import { createClient } from "redis"
import { connectRedis } from "./redis"
import { logger } from "@org/logger"
import { RedisQueue, QueueMessage } from "./keys"

const redisLogger = logger.child("redis")

export enum RedisChannel {
  STATUS = "dashboard:status",
  NOTIFY = "dashboard:notify"
}

export type ChannelMessage = {
  [RedisChannel.STATUS]: string;
  [RedisChannel.NOTIFY]: { type: string; payload: unknown };
}

type RedisClientInstance = ReturnType<typeof createClient>

export interface SetOptions {
	/** Tiempo de expiración en segundos */
	EX?: number
	/** Tiempo de expiración en milisegundos */
	PX?: number
}

export interface RedisClientParams {
	redis?: RedisClientInstance;
	subscriber?: RedisClientInstance;
}

export class RedisClient {
	private readonly redis: RedisClientInstance
	private readonly subscriber: RedisClientInstance

	private constructor (redis: RedisClientInstance, subscriber: RedisClientInstance) {
		this.redis = redis
		this.subscriber = subscriber

		this.redis.on("error", (err) => {
			redisLogger.error("Redis error (publisher):", err)
		})
		this.subscriber.on("error", (err) => {
			redisLogger.error("Redis error (subscriber):", err)
		})
	}

	static async create (params: RedisClientParams = {}): Promise<RedisClient> {
		const redis = params.redis ?? await connectRedis()
		const subscriber = params.subscriber ?? await connectRedis()
		return new RedisClient(redis, subscriber)
	}

	async set<T = unknown> (key: string, value: T, options?: SetOptions): Promise<void> {
		const data = typeof value === "string" ? value : JSON.stringify(value)
		await this.redis.set(key, data, options)
	}

	async get<T = unknown> (key: string): Promise<T | null> {
		const data = await this.redis.get(key)
		if (data === null) { return null }
		try {
			return JSON.parse(data) as T
		} catch {
			return data as unknown as T
		}
	}

	async del (key: string | string[]): Promise<number> {
		const keys = Array.isArray(key) ? key : [key]
		return this.redis.del(keys)
	}

	async exists (key: string): Promise<boolean> {
		const count = await this.redis.exists(key)
		return count > 0
	}

	async expire (key: string, seconds: number): Promise<number> {
		return this.redis.expire(key, seconds)
	}

	async publish<C extends RedisChannel> (channel: C, message: ChannelMessage[C]): Promise<number> {
		const data = typeof message === "string" ? message : JSON.stringify(message)
		return this.redis.publish(channel, data)
	}

	async subscribe<C extends RedisChannel> (
		channel: C,
		handler: (message: ChannelMessage[C]) => void
	): Promise<void> {
		await this.subscriber.subscribe(channel, (msg) => {
			let returnMsg
			try {
				returnMsg = JSON.parse(msg) as ChannelMessage[C]
			} catch {
				returnMsg = msg as unknown as ChannelMessage[C]
			}
			handler(returnMsg)
		})
	}

	async unsubscribe<C extends RedisChannel> (channel: C): Promise<void> {
		await this.subscriber.unsubscribe(channel)
	}

	/**
	 * Añade un mensaje al final de una cola.
	 * En el consumidor usar dequeue() o dequeueBlocking().
	 */
	async enqueue<Q extends RedisQueue> (queue: Q, message: QueueMessage[Q]): Promise<void> {
		const data = JSON.stringify(message)
		await this.redis.lPush(queue, data)
	}

	/**
	 * Extrae y devuelve el mensaje más antiguo de la cola (FIFO, no bloqueante).
	 * Devuelve null si la cola está vacía.
	 */
	async dequeue<Q extends RedisQueue> (queue: Q): Promise<QueueMessage[Q] | null> {
		const data = await this.redis.rPop(queue)
		if (data === null) { return null }
		return JSON.parse(data) as QueueMessage[Q]
	}

	/**
	 * Espera bloqueando hasta que haya un mensaje en la cola y lo devuelve.
	 * Ideal para workers. Usar timeout=0 para esperar indefinidamente.
	 */
	async dequeueBlocking<Q extends RedisQueue> (queue: Q, timeoutSeconds = 0): Promise<QueueMessage[Q] | null> {
		const result = await this.redis.brPop(queue, timeoutSeconds)
		if (result === null) { return null }
		return JSON.parse(result.element) as QueueMessage[Q]
	}

	async disconnect (): Promise<void> {
		await this.redis.quit()
		await this.subscriber.quit()
	}
}
