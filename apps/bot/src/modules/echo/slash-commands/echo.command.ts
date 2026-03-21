import { BaseCommand } from "@/core/base/base-command"
import { CommandContext } from "@types"
import { ApplicationCommandOptionType, CategoryChannel, ChannelType, MessageFlags, TextChannel } from "discord.js"
import { botLogger } from "@/core/logger"
import { sendMessage } from "../utils/send-message"
import { buildConfirmEmbed, buildErrorEmbed } from "../utils/embed"
import { EchoService } from "../services/echo.service"
import { SlashCommand } from "@/core/decorators/command.decorators"
import { Injectable } from "@/core/container"

const echoLogger = botLogger.child("echo")

@Injectable(EchoService)
@SlashCommand({
	name: "echo",
	description: "Envía un mensaje a través del bot",
	options: [
		{
			name: "mensaje",
			description: "El mensaje que quieres enviar",
			type: ApplicationCommandOptionType.String,
			required: false
		},
		{
			name: "canal",
			description: "Canal donde quieres enviar el mensaje",
			type: ApplicationCommandOptionType.Channel,
			channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
			required: false
		},
		{
			name: "embed",
			description: "Contenido del embed en formato JSON",
			type: ApplicationCommandOptionType.String,
			required: false
		},
		{
			name: "texto",
			description: "Se abrirá un formulario para enviar un mensaje de texto",
			type: ApplicationCommandOptionType.Boolean,
			required: false
		},
		{
			name: "categoría",
			description: "Se enviará el mensaje a todos los canales de texto de la categoría",
			type: ApplicationCommandOptionType.Channel,
			channelTypes: [ChannelType.GuildCategory],
			required: false
		}
	]
})
export class EchoCommand extends BaseCommand {
	constructor (private readonly service: EchoService) {
		super()
	}

	protected override async run ({ interaction }: CommandContext): Promise<void> {
		const inputChannel = interaction.options.getChannel("canal") as TextChannel ??
			interaction.channel as TextChannel
		const inputMessage = interaction.options.getString("mensaje")
		const inputEmbedJson = interaction.options.getString("embed")
		const inputText = interaction.options.getBoolean("texto")
		const inputCategory = interaction.options.getChannel("categoría") as CategoryChannel

		const validation = await this.service.validateAndGetInputs({
			channel: inputChannel,
			message: inputMessage,
			embedJson: inputEmbedJson,
			text: inputText,
			category: inputCategory
		})

		if (!validation.success || !validation.channel) {
			await interaction.reply({
				content: validation.error ?? "❌ Error de validación",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const { channel, message, embedJson, text, category } = validation

		if (text) {
			const modal = this.service.createModal(channel.id)
			await interaction.showModal(modal)
			return
		}

		if (category) {
			const embed = await this.service.sendMessageCategory(category, interaction.user.id, message, embedJson)
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const result = await sendMessage(
			channel,
			message,
			embedJson
		)

		if (!result.success) {
			await interaction.reply({
				embeds: [buildErrorEmbed(channel.id)],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const confirmEmbed = buildConfirmEmbed(
			channel.id,
			interaction.user.tag,
			embedJson !== null && embedJson !== undefined
		)
		await interaction.reply({
			embeds: [confirmEmbed],
			flags: MessageFlags.Ephemeral
		})
		echoLogger.info(
			`User ${interaction.user.id} sent echo message to channel ${channel.id} in guild ${interaction.guildId}`
		)
	}
}

