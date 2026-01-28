import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { CommandContext, OptionType } from "@types"
import {
	PermissionFlagsBits,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ChatInputCommandInteraction,
	MessageFlags
} from "discord.js"
import { TriggerModel, TriggerMatchType, ITrigger } from "@org/mongo"
import { botLogger } from "@/core/logger"

const triggerLogger = botLogger.child("triggers")

export class TriggerCommand extends BaseCommand {

	private getChannelsFromOptions (interaction: ChatInputCommandInteraction): string[] {
		const channels: string[] = []
		for (let i = 1; i <= 5; i++) {
			const channel = interaction.options.getChannel(`canal${i}`)
			if (channel) {
				channels.push(channel.id)
			}
		}
		return channels
	}

	private async checkDuplicateTrigger (
		guildId: string,
		triggerText: string,
		caseSensitive: boolean
	): Promise<string | null> {
		if (caseSensitive) {return null}

		const existing = await TriggerModel.findOne({
			guildId,
			trigger: new RegExp(`^${triggerText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
		})

		return existing ? existing.trigger : null
	}

	private buildTriggerEmbed (options: {
		trigger: ITrigger
		matchType: string
		caseSensitive: boolean
		channels: string[]
		excludeChannels: boolean
	}): EmbedBuilder {
		const { trigger, matchType, caseSensitive, channels, excludeChannels } = options

		const embed = new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle("✅ Trigger creado")
			.addFields(
				{ name: "Texto", value: `\`${trigger.trigger}\``, inline: true },
				{ name: "Tipo", value: matchType, inline: true },
				{ name: "Case Sensitive", value: caseSensitive ? "Sí" : "No", inline: true },
				{ name: "Respuesta", value: trigger.response.substring(0, 100), inline: false }
			)

		if (channels.length > 0) {
			const channelText = channels.map((c) => `<#${c}>`).join(", ")
			const label = excludeChannels ? "Excluir canales" : "Solo en canales"
			embed.addFields({ name: label, value: channelText, inline: false })
		}

		embed.setFooter({ text: `ID: ${trigger._id}` })
		return embed
	}

	private extractCrearOptions (interaction: ChatInputCommandInteraction) {
		return {
			triggerText: interaction.options.getString("texto", true),
			response: interaction.options.getString("respuesta", true),
			matchType: (interaction.options.getString("tipo") as TriggerMatchType) || TriggerMatchType.WORD,
			caseSensitive: interaction.options.getBoolean("case-sensitive") ?? false,
			excludeChannels: interaction.options.getBoolean("excluir-canales") ?? false,
			deleteOriginalMessage: interaction.options.getBoolean("eliminar-mensaje") ?? false,
			regexFlags: interaction.options.getString("regex-flags"),
			channels: this.getChannelsFromOptions(interaction)
		}
	}

	private async createTriggerRecord (guildId: string, userId: string, options: any): Promise<ITrigger> {
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

	async crear (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const options = this.extractCrearOptions(interaction)

		try {
			const duplicate = await this.checkDuplicateTrigger(
				interaction.guildId,
				options.triggerText,
				options.caseSensitive
			)
			if (duplicate) {
				await interaction.reply({
					content: `❌ Ya existe un trigger similar: \`${duplicate}\``,
					flags: MessageFlags.Ephemeral
				})
				return
			}

			const trigger = await this.createTriggerRecord(interaction.guildId, interaction.user.id, options)

			triggerLogger.info(`Trigger creado: ${options.triggerText} en guild ${interaction.guildId}`)

			const embed = this.buildTriggerEmbed({
				trigger,
				matchType: options.matchType,
				caseSensitive: options.caseSensitive,
				channels: options.channels,
				excludeChannels: options.excludeChannels
			})

			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
		} catch (error) {
			triggerLogger.error("Error al crear trigger:", error)
			await interaction.reply({
				content: "❌ Error al crear el trigger. Inténtalo de nuevo.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	private buildListEmbed (triggers: ITrigger[], verEliminados: boolean): EmbedBuilder {
		const titulo = verEliminados
			? `🗁️ Triggers eliminados (${triggers.length})`
			: `📋 Triggers del servidor (${triggers.length})`

		const embed = new EmbedBuilder()
			.setColor(verEliminados ? 0xff0000 : 0x0099ff)
			.setTitle(titulo)
			.setDescription("Selecciona un trigger del menú para ver sus detalles")

		if (triggers.length > 25) {
			embed.setFooter({ text: `Mostrando 25 de ${triggers.length}` })
		}

		return embed
	}

	private buildSelectMenuOptions (triggers: ITrigger[], verEliminados: boolean): StringSelectMenuOptionBuilder[] {
		return triggers.slice(0, 25).map((t) => {
			const triggerId = t._id.toString().slice(-6)
			const channelInfo = t.channels.length > 0
				? `📍${t.channels.length} canal${t.channels.length > 1 ? "es" : ""}`
				: "🌐 Todos"

			let label: string
			if (verEliminados && t.deletedAt) {
				const fecha = new Date(t.deletedAt).toLocaleDateString("es-ES")
				label = `[${fecha}] ${t.trigger.substring(0, 60)}`
			} else {
				label = `${t.trigger.substring(0, 80)}`
			}

			return new StringSelectMenuOptionBuilder()
				.setLabel(label)
				.setDescription(`${channelInfo} | ID: ${triggerId} | ${t.response.substring(0, 60)}`)
				.setValue(t._id.toString())
		})
	}

	private buildSelectMenuRow (
		triggers: ITrigger[],
		verEliminados: boolean
	): ActionRowBuilder<StringSelectMenuBuilder> {
		const options = this.buildSelectMenuOptions(triggers, verEliminados)
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId("trigger_select")
			.setPlaceholder("Selecciona un trigger...")
			.addOptions(options)

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)
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

		const verEliminados = interaction.options.getBoolean("ver-eliminados") ?? false

		try {
			const triggers = await TriggerModel.find({
				guildId: interaction.guildId,
				isActive: !verEliminados
			}).sort({ createdAt: -1 })

			if (triggers.length === 0) {
				const mensaje = verEliminados
					? "🗁️ No hay triggers eliminados en este servidor."
					: "📋 No hay triggers configurados en este servidor."
				await interaction.reply({ content: mensaje, flags: MessageFlags.Ephemeral })
				return
			}

			const embed = this.buildListEmbed(triggers, verEliminados)
			const row = this.buildSelectMenuRow(triggers, verEliminados)

			await interaction.reply({
				embeds: [embed],
				components: [row],
				flags: MessageFlags.Ephemeral
			})
		} catch (error) {
			triggerLogger.error("Error al listar triggers:", error)
			await interaction.reply({
				content: "❌ Error al listar los triggers.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	private async softDeleteTrigger (triggerId: string, guildId: string, userId: string): Promise<ITrigger | null> {
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

	async eliminar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const triggerId = interaction.options.getString("id", true)

		try {
			const trigger = await this.softDeleteTrigger(triggerId, interaction.guildId, interaction.user.id)

			if (!trigger) {
				await interaction.reply({
					content: `❌ No se encontró un trigger activo con el ID \`${triggerId}\``,
					flags: MessageFlags.Ephemeral
				})
				return
			}

			const log = `Trigger eliminado (soft): ${trigger.trigger}` +
			` (${triggerId}) por ${interaction.user.tag}` +
			` en guild ${interaction.guildId}`
			triggerLogger.info(log)

			await interaction.reply({
				content: `✅ Trigger \`${trigger.trigger}\` eliminado correctamente.`,
				flags: MessageFlags.Ephemeral
			})
		} catch (error) {
			triggerLogger.error("Error al eliminar trigger:", error)
			await interaction.reply({
				content: "❌ Error al eliminar el trigger.",
				flags: MessageFlags.Ephemeral
			})
		}
	}
}

// Registrar el comando
registerCommand(TriggerCommand, {
	name: "trigger",
	description: "Gestiona los triggers del servidor",
	permissions: PermissionFlagsBits.ManageGuild,
	guildOnly: true
})

// Registrar subcomandos
registerSubCommand(TriggerCommand, "crear", {
	name: "crear",
	description: "Crea un nuevo trigger",
	options: [
		{
			name: "texto",
			description: "El texto que activará el trigger",
			type: OptionType.STRING,
			required: true
		},
		{
			name: "respuesta",
			description: "La respuesta que dará el bot",
			type: OptionType.STRING,
			required: true
		},
		{
			name: "tipo",
			description: "Tipo de coincidencia",
			type: OptionType.STRING,
			required: false,
			choices: [
				{ name: "Palabra completa (recomendado)", value: TriggerMatchType.WORD },
				{ name: "Contiene el texto", value: TriggerMatchType.CONTAINS },
				{ name: "Empieza con el texto", value: TriggerMatchType.STARTS_WITH },
				{ name: "Termina con el texto", value: TriggerMatchType.ENDS_WITH },
				{ name: "Exacto (mensaje completo)", value: TriggerMatchType.EXACT },
				{ name: "Expresión regular", value: TriggerMatchType.REGEX }
			]
		},
		{
			name: "case-sensitive",
			description: "¿Diferenciar mayúsculas/minúsculas?",
			type: OptionType.BOOLEAN,
			required: false
		},
		{
			name: "canal1",
			description: "Canal donde aplicar (vacío = todos)",
			type: OptionType.CHANNEL,
			required: false
		},
		{
			name: "canal2",
			description: "Canal adicional (opcional)",
			type: OptionType.CHANNEL,
			required: false
		},
		{
			name: "canal3",
			description: "Canal adicional (opcional)",
			type: OptionType.CHANNEL,
			required: false
		},
		{
			name: "canal4",
			description: "Canal adicional (opcional)",
			type: OptionType.CHANNEL,
			required: false
		},
		{
			name: "canal5",
			description: "Canal adicional (opcional)",
			type: OptionType.CHANNEL,
			required: false
		},
		{
			name: "excluir-canales",
			description: "Si es true, excluye los canales especificados",
			type: OptionType.BOOLEAN,
			required: false
		},
		{
			name: "eliminar-mensaje",
			description: "Eliminar el mensaje original del usuario",
			type: OptionType.BOOLEAN,
			required: false
		},
		{
			name: "regex-flags",
			description: "Flags para regex (ej: 'gi', 'i')",
			type: OptionType.STRING,
			required: false
		}
	]
})
registerSubCommand(TriggerCommand, "info", {
	name: "info",
	description: "Lista todos los triggers del servidor",
	options: [
		{
			name: "ver-eliminados",
			description: "Mostrar triggers eliminados en lugar de activos",
			type: OptionType.BOOLEAN,
			required: false
		}
	]
})
registerSubCommand(TriggerCommand, "eliminar", {
	name: "eliminar",
	description: "Elimina un trigger existente",
	options: [
		{
			name: "id",
			description: "El ID del trigger a eliminar (usa /trigger listar para ver los IDs)",
			type: OptionType.STRING,
			required: true
		}
	]
})
