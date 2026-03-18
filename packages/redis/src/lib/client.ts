import { RedisClientType, RedisModules } from "redis"
import { connectRedis } from "./redis"

export enum RedisChannel {
  STATUS = "dashboard:status",
  NOTIFY = "dashboard:notify"
}

export type ChannelMessage = {
  [RedisChannel.STATUS]: string;
  [RedisChannel.NOTIFY]: { type: string; payload: unknown };
}

export interface RedisClientParams {
	redis?: RedisClientType<RedisModules>;
	subscriber?: RedisClientType<RedisModules>;
}

export class RedisClient {
	private redis!: RedisClientType<RedisModules>
	private subscriber!: RedisClientType<RedisModules>
	private _init: Promise<void>

	constructor (params: RedisClientParams = {}) {
		this._init = (async () => {
			this.redis = (params.redis ?? await connectRedis()) as RedisClientType<RedisModules>
			this.subscriber = (params.subscriber ?? await connectRedis()) as RedisClientType<RedisModules>

			this.redis.on("error", (err) => {
				console.error("Redis error (publisher):", err)
			})
			this.subscriber.on("error", (err) => {
				console.error("Redis error (subscriber):", err)
			})
		})()
	}

	async set<T = unknown> (key: string, value: T): Promise<void> {
		await this._init
		const data = typeof value === "string" ? value : JSON.stringify(value)
		await this.redis.set(key, data)
	}

	async get<T = unknown> (key: string): Promise<T | null> {
		await this._init
		const data = await this.redis.get(key)
		if (data === null) { return null }
		try {
			return JSON.parse(data) as T
		} catch {
			return data as unknown as T
		}
	}

	async publish<C extends RedisChannel> (channel: C, message: ChannelMessage[C]): Promise<number> {
		await this._init
		const data = typeof message === "string" ? message : JSON.stringify(message)
		return this.redis.publish(channel, data)
	}

	async subscribe<C extends RedisChannel> (
		channel: C,
		handler: (message: ChannelMessage[C]) => void
	): Promise<void> {
		await this._init
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

	async disconnect (): Promise<void> {
		await this._init
		this.redis.destroy()
		this.subscriber.destroy()
	}
}
