import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { CommandContext, OptionType } from "@types"
import {
	PermissionFlagsBits,
	EmbedBuilder,
	MessageFlags,
	ChannelType,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	GuildBasedChannel,
	APIInteractionDataResolvedChannel,
	ChatInputCommandInteraction
} from "discord.js"
import { AutoMessageModel, AutoMessageTargetType, IAutoMessage } from "@org/mongo"
import { botLogger } from "@/core/logger"
import { AutoMessageService } from "../services/auto-message.service"
import { getVariablesList } from "../allowed-variables"
import { buildAutoMessageInfoEmbed } from "../utils/embed-builder"

const autoMessageLogger = botLogger.child("auto-messages")

export class AutoMessageCommand extends BaseCommand {

	private validateCronExpression (expression: string): boolean {
		// eslint-disable-next-line max-len
		const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/
		return cronRegex.test(expression)
	}

	private validateChannelOrCategory (
		channel: GuildBasedChannel | APIInteractionDataResolvedChannel | null,
		category: GuildBasedChannel | APIInteractionDataResolvedChannel | null
	): string | null {
		if (!channel && !category) {
			return "❌ Debes especificar un canal o una categoría."
		}

		if (channel && category) {
			return "❌ Solo puedes especificar un canal O una categoría, no ambos."
		}

		return null
	}

	private validateCronRequirements (
		channel: GuildBasedChannel | APIInteractionDataResolvedChannel | null,
		category: GuildBasedChannel | APIInteractionDataResolvedChannel | null,
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

	private validateCategoryType (
		category: GuildBasedChannel | APIInteractionDataResolvedChannel | null
	): string | null {
		if (category && category.type !== ChannelType.GuildCategory) {
			return "❌ El canal especificado no es una categoría."
		}
		return null
	}

	private validateTargetSelection (
		channel: GuildBasedChannel | APIInteractionDataResolvedChannel | null,
		category: GuildBasedChannel | APIInteractionDataResolvedChannel | null,
		cronExpression: string | null
	): string | null {
		const channelCategoryError = this.validateChannelOrCategory(channel, category)
		if (channelCategoryError) {return channelCategoryError}

		const cronRequirementsError = this.validateCronRequirements(channel, category, cronExpression)
		if (cronRequirementsError) {return cronRequirementsError}

		const categoryTypeError = this.validateCategoryType(category)
		if (categoryTypeError) {return categoryTypeError}

		if (cronExpression && !this.validateCronExpression(cronExpression)) {
			return "❌ Expresión cron inválida. Formato: `segundo minuto hora día mes díaSemana`" +
			"\nEjemplo: `0 0 9 * * *` (todos los días a las 9:00:00)"
		}

		if (!channel && !category) {
			return "❌ Debes especificar un canal o una categoría."
		}

		return null
	}

	private buildCreatedEmbed (autoMessage: IAutoMessage): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle("✅ Mensaje automático creado")
			.addFields(
				{ name: "Nombre", value: autoMessage.name, inline: true },
				{
					name: "Tipo",
					value: autoMessage.cronExpression
						? "⏰ Programado (cron)"
						: "📁 Al crear canal",
					inline: true
				}
			)

		if (autoMessage.cronExpression) {
			embed.addFields({ name: "Cron", value: `\`${autoMessage.cronExpression}\``, inline: true })
		}

		embed.addFields(
			{
				name: "Destino",
				value: autoMessage.targetType === AutoMessageTargetType.CHANNEL
					? `Canal: <#${autoMessage.targetId}>`
					: `Categoría: <#${autoMessage.targetId}>`,
				inline: false
			},
			{
				name: "Mensaje",
				value: autoMessage.message ? autoMessage.message.substring(0, 1000) : "Embed solo",
				inline: false
			}
		)
		embed.setFooter({ text: `ID: ${autoMessage._id}` })

		return embed
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
	}): Promise<IAutoMessage> {
		const messageEmbedParsed = params.messageEmbed ? JSON.parse(params.messageEmbed) : null

		const autoMessage = await AutoMessageModel.create({
			guildId: params.guildId,
			name: params.name,
			message: params.message,
			embed: messageEmbedParsed,
			cronExpression: params.cronExpression,
			targetType: params.targetType,
			targetId: params.targetId,
			createdBy: params.userId
		})

		if (params.cronExpression) {
			const service = AutoMessageService.getInstance()
			service.scheduleJob(autoMessage)
		}

		return autoMessage
	}

	async crear (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const name = interaction.options.getString("nombre", true)
		const message = interaction.options.getString("mensaje")
		const messageEmbed = interaction.options.getString("embed")
		const cronExpression = interaction.options.getString("cron")
		const channel = interaction.options.getChannel("canal")
		const category = interaction.options.getChannel("categoria")

		const validationError = this.validateTargetSelection(channel, category, cronExpression)
		if (validationError) {
			await interaction.reply({
				content: validationError,
				flags: MessageFlags.Ephemeral
			})
			return
		}

		try {
			const targetType = channel ? AutoMessageTargetType.CHANNEL : AutoMessageTargetType.CATEGORY
			const targetId = channel ? channel.id : (category?.id as string)

			const autoMessage = await this.createAutoMessage({
				guildId: interaction.guildId,
				name,
				message,
				messageEmbed,
				cronExpression,
				targetType,
				targetId,
				userId: interaction.user.id
			})

			const embed = this.buildCreatedEmbed(autoMessage)

			autoMessageLogger.info(`Mensaje automático creado: ${name} en guild ${interaction.guildId}`)

			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
		} catch (error) {
			autoMessageLogger.error("Error al crear mensaje automático:", error)
			await interaction.reply({
				content: "❌ Error al crear el mensaje automático. Inténtalo de nuevo.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	private buildListEmbed (autoMessages: IAutoMessage[], verEliminados: boolean): EmbedBuilder {
		const titulo = verEliminados
			? `🗑️ Mensajes automáticos eliminados (${autoMessages.length})`
			: `📋 Mensajes automáticos (${autoMessages.length})`

		const embed = new EmbedBuilder()
			.setColor(verEliminados ? 0xff0000 : 0x0099ff)
			.setTitle(titulo)
			.setDescription("Selecciona un mensaje del menú para ver sus detalles")

		if (autoMessages.length > 25) {
			embed.setFooter({ text: `Mostrando 25 de ${autoMessages.length}` })
		}

		return embed
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
			} else {
				if (!am.isActive) {
					label = `⏸️ ${am.name.substring(0, 78)}`
					statusText = "Pausado"
				} else {
					label = `${am.name.substring(0, 80)}`
					statusText = "Activo"
				}
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

	private async showAutoMessageInfo (
		interaction: ChatInputCommandInteraction,
		messageId: string,
		guildId: string
	): Promise<void> {
		try {
			const autoMessage = await AutoMessageModel.findOne({
				_id: messageId,
				guildId
			})

			if (!autoMessage) {
				await interaction.reply({
					content: `❌ No se encontró un mensaje automático con el ID \`${messageId}\``,
					flags: MessageFlags.Ephemeral
				})
				return
			}

			const embed = buildAutoMessageInfoEmbed(autoMessage)
			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
		} catch (error) {
			autoMessageLogger.error("Error al obtener info del mensaje automático:", error)
			await interaction.reply({
				content: "❌ Error al obtener la información del mensaje automático.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	private async showAutoMessageList (
		interaction: ChatInputCommandInteraction,
		guildId: string,
		verEliminados: boolean
	): Promise<void> {
		try {
			const filter: Record<string, unknown> = { guildId }

			if (verEliminados) {
				filter.deletedAt = { $ne: null }
			} else {
				filter.deletedAt = null
			}

			const autoMessages = await AutoMessageModel.find(filter).sort({ createdAt: -1 })

			if (autoMessages.length === 0) {
				const mensaje = verEliminados
					? "🗑️ No hay mensajes automáticos eliminados en este servidor."
					: "📋 No hay mensajes automáticos configurados en este servidor."
				await interaction.reply({ content: mensaje, flags: MessageFlags.Ephemeral })
				return
			}

			const embed = this.buildListEmbed(autoMessages, verEliminados)
			const row = this.buildSelectMenuRow(autoMessages, verEliminados)

			await interaction.reply({
				embeds: [embed],
				components: [row],
				flags: MessageFlags.Ephemeral
			})
		} catch (error) {
			autoMessageLogger.error("Error al listar mensajes automáticos:", error)
			await interaction.reply({
				content: "❌ Error al listar los mensajes automáticos.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	async info (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const messageId = interaction.options.getString("id")

		if (messageId) {
			await this.showAutoMessageInfo(interaction, messageId, interaction.guildId)
		} else {
			const verEliminados = interaction.options.getBoolean("ver-eliminados") ?? false
			await this.showAutoMessageList(interaction, interaction.guildId, verEliminados)
		}
	}

	async eliminar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const messageId = interaction.options.getString("id", true)

		try {
			const autoMessage = await AutoMessageModel.findOneAndUpdate(
				{
					_id: messageId,
					guildId: interaction.guildId,
					isActive: true
				},
				{
					isActive: false,
					deletedBy: interaction.user.id,
					deletedAt: new Date()
				},
				{ new: false }
			)

			if (!autoMessage) {
				await interaction.reply({
					content: `❌ No se encontró un mensaje automático activo con el ID \`${messageId}\``,
					flags: MessageFlags.Ephemeral
				})
				return
			}

			const service = AutoMessageService.getInstance()
			service.cancelJob(messageId)

			autoMessageLogger.info(
				`Mensaje automático eliminado: ${autoMessage.name} (${messageId}) por ${interaction.user.tag}`
			)

			await interaction.reply({
				content: `✅ Mensaje automático \`${autoMessage.name}\` eliminado correctamente.`,
				flags: MessageFlags.Ephemeral
			})
		} catch (error) {
			autoMessageLogger.error("Error al eliminar mensaje automático:", error)
			await interaction.reply({
				content: "❌ Error al eliminar el mensaje automático.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	private async toggleAutoMessageState (
		messageId: string,
		guildId: string,
		newState: boolean
	): Promise<{ success: boolean; autoMessage?: IAutoMessage; message?: string }> {
		try {
			const autoMessage = await AutoMessageModel.findOne({
				_id: messageId,
				guildId,
				deletedAt: null
			})

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

			const service = AutoMessageService.getInstance()
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

	async pausar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const messageId = interaction.options.getString("id", true)
		const result = await this.toggleAutoMessageState(messageId, interaction.guildId, false)

		if (!result.success || !result.autoMessage) {
			await interaction.reply({ content: result.message ?? "❌ Error desconocido", flags: MessageFlags.Ephemeral })
			return
		}

		const embed = new EmbedBuilder()
			.setColor(0xffa500)
			.setTitle("⏸️ Mensaje automático pausado")
			.addFields(
				{ name: "Nombre", value: result.autoMessage.name, inline: true },
				{ name: "ID", value: messageId, inline: true }
			)
			.setDescription("Puedes reactivarlo cuando quieras usando `/automensaje reanudar`")
			.setFooter({ text: `Pausado por ${interaction.user.tag}` })

		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
	}

	async reanudar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const messageId = interaction.options.getString("id", true)
		const result = await this.toggleAutoMessageState(messageId, interaction.guildId, true)

		if (!result.success || !result.autoMessage) {
			await interaction.reply({ content: result.message ?? "❌ Error desconocido", flags: MessageFlags.Ephemeral })
			return
		}

		const embed = new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle("▶️ Mensaje automático reanudado")
			.addFields(
				{ name: "Nombre", value: result.autoMessage.name, inline: true },
				{ name: "ID", value: messageId, inline: true }
			)
			.setDescription("El mensaje automático está activo nuevamente.")
			.setFooter({ text: `Reanudado por ${interaction.user.tag}` })

		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
	}

	async variables (context: CommandContext): Promise<void> {
		const { interaction } = context

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

		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
	}
}

registerCommand(AutoMessageCommand, {
	name: "automensaje",
	description: "Gestiona los mensajes automáticos del servidor",
	permissions: PermissionFlagsBits.ManageGuild,
	guildOnly: true
})

registerSubCommand(AutoMessageCommand, "crear", {
	name: "crear",
	description: "Crea un nuevo mensaje automático",
	options: [
		{
			name: "nombre",
			description: "Nombre identificador del mensaje automático",
			type: OptionType.STRING,
			required: true
		},
		{
			name: "mensaje",
			description: "El mensaje que se enviará",
			type: OptionType.STRING,
			required: false
		},
		{
			name: "embed",
			description: "El embed en formato JSON que se enviará",
			type: OptionType.STRING,
			required: false
		},
		{
			name: "cron",
			description: "Expresión cron (solo para canales, ej: '0 0 9 * * *' = 9:00 AM)",
			type: OptionType.STRING,
			required: false
		},
		{
			name: "canal",
			description: "Canal donde enviar el mensaje",
			type: OptionType.CHANNEL,
			required: false
		},
		{
			name: "categoria",
			description: "Categoría donde enviar el mensaje (a todos los canales de texto)",
			type: OptionType.CHANNEL,
			required: false
		}
	]
})

registerSubCommand(AutoMessageCommand, "eliminar", {
	name: "eliminar",
	description: "Elimina un mensaje automático",
	options: [
		{
			name: "id",
			description: "ID del mensaje automático a eliminar",
			type: OptionType.STRING,
			required: true
		}
	]
})

registerSubCommand(AutoMessageCommand, "info", {
	name: "info",
	description: "Muestra info de un mensaje o lista todos con un menú",
	options: [
		{
			name: "id",
			description: "ID del mensaje automático (opcional, sin ID muestra lista)",
			type: OptionType.STRING,
			required: false
		},
		{
			name: "ver-eliminados",
			description: "Mostrar mensajes automáticos eliminados (solo si no se proporciona ID)",
			type: OptionType.BOOLEAN,
			required: false
		}
	]
})

registerSubCommand(AutoMessageCommand, "pausar", {
	name: "pausar",
	description: "Pausa un mensaje automático sin eliminarlo",
	options: [
		{
			name: "id",
			description: "ID del mensaje automático a pausar",
			type: OptionType.STRING,
			required: true
		}
	]
})

registerSubCommand(AutoMessageCommand, "reanudar", {
	name: "reanudar",
	description: "Reanuda un mensaje automático pausado",
	options: [
		{
			name: "id",
			description: "ID del mensaje automático a reanudar",
			type: OptionType.STRING,
			required: true
		}
	]
})

registerSubCommand(AutoMessageCommand, "variables", {
	name: "variables",
	description: "Muestra la lista de variables disponibles para usar en mensajes"
})
