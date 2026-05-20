import { CommandReply } from "@/core/types"
import { AutoMessageTargetType, IAutoMessage } from "@org/mongo"
import {
	ActionRowBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	User
} from "discord.js"
import { CreateOptions, TargetChannel } from "../types/automessages.types"
import { AutoMessagesDbRepository } from "../repositories/auto-messagesdb.repository"
import { Injectable } from "@/core/container"
import { AutoMessageRepository } from "../repositories/auto-messages.repository"
import {
	buildAutoMessageInfoEmbed,
	buildCreatedEmbed,
	buildListEmbed,
	pauseEmbed,
	resumeEmbed
} from "../utils/embed-builder"
import { botLogger } from "@/core/logger"
import { getVariablesList } from "../allowed-variables"

const autoMessageLogger = botLogger.child("auto-messages")

@Injectable(AutoMessagesDbRepository)
export class AutoMessageService {
	constructor (private readonly repository: AutoMessagesDbRepository) {}

	public getCrearOptions (interaction: ChatInputCommandInteraction): CreateOptions {
		return {
			name: interaction.options.getString("nombre", true),
			message: interaction.options.getString("mensaje"),
			messageEmbed: interaction.options.getString("embed"),
			cronExpression: interaction.options.getString("cron"),
			channel: interaction.options.getChannel("canal"),
			category: interaction.options.getChannel("categoria"),
			waitTime: interaction.options.getInteger("tiempo"),
			pin: interaction.options.getBoolean("anclar") ?? false
		}
	}

	// VALIDACIONES
	private validateCronField (field: string): boolean {
		return /^(\*|\d{1,2}|\*\/\d{1,2})$/.test(field)
	}

	private validateChannelOrCategory (
		channel: TargetChannel,
		category: TargetChannel
	): string | null {
		if (!channel && !category) {
			return "❌ Debes especificar un canal o una categoría."
		}

		if (channel && category) {
			return "❌ Solo puedes especificar un canal O una categoría, no ambos."
		}

		return null
	}

	private validateCronExpression (expression: string): boolean {
		const parts = expression.split(" ")
		return parts.length === 6 && parts.every((part) => this.validateCronField(part))
	}

	private validateCronRequirements (
		channel: TargetChannel,
		category: TargetChannel,
		cronExpression: string | null
	): string | null {
		if (channel && !cronExpression) {
			return "❌ Los mensajes a canales específicos requieren una expresión cron."
		}

		if (category && cronExpression) {
			return "❌ Los mensajes de categoría se envían al crear canales, no uses expresión cron."
		}

		return null
	}

	private validateMessage (
		message: string | null,
		embed: string | null
	): string | null {
		if (!message && !embed) {
			return "❌ Tienes que especificar un mensaje o un embed."
		}
		return null
	}

	private validateTargetSelection ({
		channel,
		category,
		cronExpression,
		message,
		messageEmbed
	}: Omit<CreateOptions, "waitTime" | "pin" | "name" >): string | null {
		const channelCategoryError = this.validateChannelOrCategory(channel, category)
		if (channelCategoryError) { return channelCategoryError }

		const cronRequirementsError = this.validateCronRequirements(channel, category, cronExpression)
		if (cronRequirementsError) { return cronRequirementsError }

		const messageError = this.validateMessage(message, messageEmbed)
		if (messageError) { return messageError }

		if (cronExpression && !this.validateCronExpression(cronExpression)) {
			return "❌ Expresión cron inválida. Formato: `segundo minuto hora día mes díaSemana`" +
			"\nEjemplo: `0 0 9 * * *` (todos los días a las 9:00:00)"
		}

		if (!channel && !category) {
			return "❌ Debes especificar un canal o una categoría."
		}

		return null
	}

	private async createAutoMessage (params: {
		guildId: string;
		name: string;
		message: string | null;
		messageEmbed: string | null;
		cronExpression: string | null;
		targetType: AutoMessageTargetType;
		targetId: string;
		userId: string;
		waitTime: number | null;
		pin: boolean
	}): Promise<IAutoMessage> {
		const messageEmbedParsed = params.messageEmbed ? JSON.parse(params.messageEmbed) : null

		const autoMessage = await this.repository.create({
			guildId: params.guildId,
			name: params.name,
			message: params.message,
			embed: messageEmbedParsed,
			cronExpression: params.cronExpression,
			targetType: params.targetType,
			waitTime: params?.targetType === AutoMessageTargetType.CATEGORY ? params.waitTime ?? 0 : null,
			pin: params.pin,
			targetId: params.targetId,
			createdBy: params.userId
		})

		if (params.cronExpression) {
			const service = AutoMessageRepository.getInstance()
			service.scheduleJob(autoMessage)
		}

		return autoMessage
	}

	// Funcion directa al comando
	async crear (options: CreateOptions, guildId: string, user: User): Promise<CommandReply> {
		const validationError = this.validateTargetSelection({
			channel: options.channel,
			category: options.category,
			cronExpression: options.cronExpression,
			message: options.message,
			messageEmbed: options.messageEmbed
		})

		if (validationError) {
			return { content: validationError }
		}

		try {
			const targetType = options.channel ? AutoMessageTargetType.CHANNEL : AutoMessageTargetType.CATEGORY
			const targetId = (options.channel ? options.channel.id : options.category?.id) as string
			const autoMessage = await this.createAutoMessage({
				guildId,
				name: options.name,
				message: options.message,
				messageEmbed: options.messageEmbed,
				cronExpression: options.cronExpression,
				targetType,
				targetId,
				waitTime: options.waitTime,
				pin: options.pin,
				userId: user.id
			})

			autoMessageLogger.info(`Mensaje automático creado: ${options.name} en guild ${guildId}`)
			return { embeds: [ buildCreatedEmbed(autoMessage) ] }
		} catch (error) {
			autoMessageLogger.error("Error al crear mensaje automático:", error)
			return { content: "❌ Error al crear el mensaje automático. Inténtalo de nuevo." }
		}
	}

	private async showAutoMessageInfo (
		messageId: string,
		guildId: string
	): Promise<CommandReply> {
		try {
			const autoMessage = await this.repository.findById(messageId, guildId)

			if (!autoMessage) {
				return { content: `❌ No se encontró un mensaje automático con el ID \`${messageId}\`` }
			}

			const embed = buildAutoMessageInfoEmbed(autoMessage)
			return { embeds: [embed] }
		} catch (error) {
			autoMessageLogger.error("Error al obtener info del mensaje automático:", error)
			return { content: "❌ Error al obtener la información del mensaje automático." }
		}
	}

	private buildSelectMenuOptions (
		autoMessages: IAutoMessage[],
		verEliminados: boolean
	): StringSelectMenuOptionBuilder[] {
		return autoMessages.slice(0, 25).map((am) => {
			const amId = am._id.toString().slice(-6)
			const targetInfo = am.targetType === AutoMessageTargetType.CHANNEL
				? "📍 Canal"
				: "📁 Categoría"

			const tipoInfo = am.cronExpression
				? "⏰ Cron"
				: "📝 On create"

			let label: string
			let statusText: string

			if (verEliminados && am.deletedAt) {
				const fecha = new Date(am.deletedAt).toLocaleDateString("es-ES")
				label = `🗑️ [${fecha}] ${am.name.substring(0, 60)}`
				statusText = "Eliminado"
			} else if (am.isActive) {
				label = `${am.name.substring(0, 80)}`
				statusText = "Activo"
			} else {
				label = `⏸️ ${am.name.substring(0, 78)}`
				statusText = "Pausado"
			}

			return new StringSelectMenuOptionBuilder()
				.setLabel(label)
				.setDescription(`${statusText} | ${targetInfo} | ${tipoInfo} | ID: ${amId}`)
				.setValue(am._id.toString())
		})
	}

	private buildSelectMenuRow (
		autoMessages: IAutoMessage[],
		verEliminados: boolean
	): ActionRowBuilder<StringSelectMenuBuilder> {
		const options = this.buildSelectMenuOptions(autoMessages, verEliminados)
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId("auto_message_select")
			.setPlaceholder("Selecciona un mensaje automático...")
			.addOptions(options)

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)
	}

	private async showAutoMessageList (
		guildId: string,
		verEliminados: boolean
	): Promise<CommandReply> {
		try {
			const filter: Record<string, unknown> = { guildId }

			if (verEliminados) {
				filter.deletedAt = { $ne: null }
			} else {
				filter.deletedAt = null
			}

			const autoMessages = await this.repository.find(filter, { createdAt: -1 } )

			if (autoMessages.length === 0) {
				const mensaje = verEliminados
					? "🗑️ No hay mensajes automáticos eliminados en este servidor."
					: "📋 No hay mensajes automáticos configurados en este servidor."
				return { content: mensaje }
			}

			const embed = buildListEmbed(autoMessages, verEliminados)
			const row = this.buildSelectMenuRow(autoMessages, verEliminados)

			return{
				embeds: [embed],
				components: [row]
			}

		} catch (error) {
			autoMessageLogger.error("Error al listar mensajes automáticos:", error)
			return { content: "❌ Error al listar los mensajes automáticos." }
		}
	}

	// Funcion directa al comando
	async info (options: {
		messageId?: string | null,
		showDeleted: boolean,
		guildId: string
	}): Promise<CommandReply> {
		if (options.messageId) {
			return await this.showAutoMessageInfo(options.messageId, options.guildId)
		} else {
			return await this.showAutoMessageList(options.guildId, options.showDeleted)
		}
	}

	// Funcion directa al comando
	async delete (messageId: string, guildId: string, user: User): Promise<CommandReply> {
		try {
			const autoMessage = await this.repository.softDelete(messageId, guildId, user.id)

			if (!autoMessage) {
				return { content: `❌ No se encontró un mensaje automático activo con el ID \`${messageId}\`` }
			}

			const service = AutoMessageRepository.getInstance()
			service.cancelJob(messageId)

			autoMessageLogger.info(
				`Mensaje automático eliminado: ${autoMessage.name} (${messageId}) por ${user.tag}`
			)

			return { content: `✅ Mensaje automático \`${autoMessage.name}\` eliminado correctamente.` }
		} catch (error) {
			autoMessageLogger.error("Error al eliminar mensaje automático:", error)
			return { content: "❌ Error al eliminar el mensaje automático." }
		}
	}

	private async toggleAutoMessageState (
		messageId: string,
		guildId: string,
		newState: boolean
	): Promise<{ success: boolean; autoMessage?: IAutoMessage; message?: string }> {
		try {
			const autoMessage = await this.repository.findById(messageId, guildId)

			if (!autoMessage) {
				return {
					success: false,
					message: `❌ No se encontró un mensaje automático activo con el ID \`${messageId}\``
				}
			}

			if (autoMessage.isActive === newState) {
				const action = newState ? "activo" : "pausado"
				return {
					success: false,
					message: `⚠️ El mensaje automático "${autoMessage.name}" ya está ${action}.`
				}
			}

			autoMessage.isActive = newState
			await autoMessage.save()

			const service = AutoMessageRepository.getInstance()
			if (autoMessage.cronExpression) {
				if (newState) {
					service.scheduleJob(autoMessage)
				} else {
					service.cancelJob(messageId)
				}
			}

			const action = newState ? "reanudado" : "pausado"
			autoMessageLogger.info(`Mensaje automático ${action}: ${autoMessage.name} (${messageId})`)

			return { success: true, autoMessage }
		} catch (error) {
			autoMessageLogger.error("Error al cambiar estado del mensaje automático:", error)
			return {
				success: false,
				message: "❌ Error al cambiar el estado del mensaje automático."
			}
		}
	}

	// Funcion directa al comando
	async toggle (messageId: string, guildId: string, user: User, newState: boolean): Promise<CommandReply> {
		const result = await this.toggleAutoMessageState(messageId, guildId, newState)

		if (!result.success || !result.autoMessage) {
			return { content: result.message ?? "❌ Error desconocido" }
		}

		const embed = newState ? resumeEmbed(result.autoMessage, user.tag) : pauseEmbed(result.autoMessage, user.tag)
		return { embeds: [embed] }
	}

	variables (): CommandReply {
		const variablesList = getVariablesList()

		const embed = new EmbedBuilder()
			.setColor(0x0099ff)
			.setTitle("📝 Variables disponibles para mensajes automáticos")
			.setDescription(
				"Puedes usar estas variables en tus mensajes automáticos y se reemplazarán por sus valores:\n\n" +
				variablesList
			)
			.addFields({
				name: "Ejemplo",
				value: "```Hola @@creator_name@@, bienvenido a @@channel_mention@@```",
				inline: false
			})
			.setFooter({ text: "Las variables distinguen entre mayúsculas y minúsculas" })

		return { embeds: [embed] }
	}
}
