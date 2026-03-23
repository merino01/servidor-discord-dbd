import { ITrigger, TriggerMatchType, TriggerModel } from "@org/mongo"
import { Trigger, CreateTriggerDto, UpdateTriggerDto } from "../types/trigger.types"

/**
 * Servicio para manejar la lógica de negocio de triggers
 * Aquí puedes agregar la conexión a tu base de datos
 */
export class TriggerRepository {
	private triggers: Map<string, Trigger[]> = new Map()

	/**
   * Crea un nuevo trigger
   */
	async create (guildId: string, userId: string, data: CreateTriggerDto): Promise<Trigger> {
		const trigger: Trigger = {
			id: this.generateId(),
			guildId,
			keyword: data.keyword,
			response: data.response,
			createdBy: userId,
			createdAt: new Date(),
			isActive: true
		}

		const guildTriggers = this.triggers.get(guildId) || []
		guildTriggers.push(trigger)
		this.triggers.set(guildId, guildTriggers)

		return trigger
	}

	/**
   * Obtiene todos los triggers de un servidor
   */
	async findByGuild (guildId: string): Promise<Trigger[]> {
		return this.triggers.get(guildId) || []
	}

	/**
   * Obtiene un trigger por ID
   */
	async findById (guildId: string, triggerId: string): Promise<Trigger | null> {
		const guildTriggers = this.triggers.get(guildId) || []
		return guildTriggers.find((t) => t.id === triggerId) || null
	}

	/**
   * Actualiza un trigger
   */
	async update (
		guildId: string,
		triggerId: string,
		data: UpdateTriggerDto
	): Promise<Trigger | null> {
		const guildTriggers = this.triggers.get(guildId) || []
		const index = guildTriggers.findIndex((t) => t.id === triggerId)

		if (index === -1) {return null}

		guildTriggers[index] = {
			...guildTriggers[index],
			...data
		}

		this.triggers.set(guildId, guildTriggers)
		return guildTriggers[index]
	}

	/**
   * Elimina un trigger
   */
	async delete (guildId: string, triggerId: string): Promise<boolean> {
		const guildTriggers = this.triggers.get(guildId) || []
		const filtered = guildTriggers.filter((t) => t.id !== triggerId)

		if (filtered.length === guildTriggers.length) {return false}

		this.triggers.set(guildId, filtered)
		return true
	}

	/**
   * Busca un trigger por keyword
   */
	async findByKeyword (guildId: string, keyword: string): Promise<Trigger | null> {
		const guildTriggers = this.triggers.get(guildId) || []
		return guildTriggers.find((t) => t.keyword.toLowerCase() === keyword.toLowerCase() && t.isActive) || null
	}

	/**
   * Genera un ID único (reemplazar con UUID en producción)
   */
	private generateId (): string {
		return `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	// FUNCIONES DE DB
	async softDeleteTriggerDb (triggerId: string, guildId: string, userId: string): Promise<ITrigger | null> {
		return await TriggerModel.findOneAndUpdate(
			{
				_id: triggerId,
				guildId,
				isActive: true
			},
			{
				isActive: false,
				deletedBy: userId,
				deletedAt: new Date()
			},
			{ new: false }
		)
	}

	async findByGuildDb (guildId: string, verEliminados: boolean): Promise<ITrigger[]> {
		 return await TriggerModel.find({
			guildId,
			isActive: !verEliminados
		}).sort({ createdAt: -1 })
	}

	async createTriggerRecordDb (guildId: string, userId: string, options: any): Promise<ITrigger> {
		const {
			triggerText,
			response,
			matchType,
			caseSensitive,
			channels,
			excludeChannels,
			deleteOriginalMessage,
			regexFlags
		} = options

		return await TriggerModel.create({
			guildId,
			trigger: triggerText,
			response,
			createdBy: userId,
			matchType,
			caseSensitive,
			channels,
			excludeChannels,
			deleteOriginalMessage,
			...(matchType === TriggerMatchType.REGEX && {
				regexPattern: triggerText,
				...(regexFlags && { regexFlags })
			})
		})
	}

	async findByRegexDb (guildId: string, triggerText: string, regex: RegExp): Promise<ITrigger | null> {
		return await TriggerModel.findOne({
			guildId,
			trigger: new RegExp(`^${triggerText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
		})
	}
}
