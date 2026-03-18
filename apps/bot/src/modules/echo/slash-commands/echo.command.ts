import { BaseCommand } from "@/core/base/base-command"
import { registerCommand } from "@/core/command-register"
import { CommandContext } from "@types"
import {
	MessageFlags,
	TextChannel,
	ChannelType,
	GuildBasedChannel,
	APIInteractionDataResolvedChannel,
	ChatInputCommandInteraction,
	ModalBuilder,
	LabelBuilder,
	TextInputStyle,
	TextInputBuilder,
	ApplicationCommandOptionType,
	PermissionFlagsBits,
	CategoryChannel,
	EmbedBuilder
} from "discord.js"
import { botLogger } from "@/core/logger"
import { sendMessage } from "../utils/send-message"
import { buildConfirmEmbed, buildErrorEmbed } from "../utils/embed"

const echoLogger = botLogger.child("echo")

export class EchoCommand extends BaseCommand {
	private validateChannel (
		channel: GuildBasedChannel | APIInteractionDataResolvedChannel | null
	): string | null {
		if (!channel) {
			return "❌ Debes especificar un canal válido."
		}
		return null
	}

	private validateMessageContent (message: string | null, embed: string | null, text: boolean | null): string | null {
		if (!message && !embed && !text) {
			return "❌ Debes proporcionar al menos un mensaje de texto o un embed."
		}

		return null
	}

	private async validateAndGetInputs (
		interaction: ChatInputCommandInteraction
	): Promise<{
		success: boolean
		channel?: TextChannel
		message?: string | null
		text?: boolean | null
		embedJson?: string | null
		category?: CategoryChannel | null
		error?: string
	}> {
		if (!interaction.guildId) {
			return {
				success: false,
				error: "❌ Este comando solo funciona en servidores."
			}
		}

		const targetChannel = interaction.options.getChannel("canal") ?? interaction.channel as TextChannel
		const message = interaction.options.getString("mensaje")
		const embedJson = interaction.options.getString("embed")
		const text = interaction.options.getBoolean("texto")
		const category = interaction.options.getChannel("categoría")

		const channelError = this.validateChannel(targetChannel)
		if (channelError) {
			return { success: false, error: channelError }
		}

		const contentError = this.validateMessageContent(message, embedJson, text)
		if (contentError) {
			return { success: false, error: contentError }
		}

		return {
			success: true,
			channel: targetChannel as TextChannel,
			category: category as CategoryChannel,
			message,
			text,
			embedJson
		}
	}

	private createModal (channelId: string): ModalBuilder {
		const modal = new ModalBuilder().setCustomId(`echo_modal_${channelId}`).setTitle("Echo")
		const textInput = new TextInputBuilder()
			.setCustomId("echo_modal_text")
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph)

		const title = new LabelBuilder()
			.setLabel("Texto a enviar")
			.setTextInputComponent(textInput)

		modal.addLabelComponents(title)

		return modal
	}

	private async sendMessageCategory (
		category: CategoryChannel,
		userId: string,
		message?: string | null,
		embedJson?: string | null
	): Promise<EmbedBuilder> {
		const channels = category.children
		const embed = new EmbedBuilder()
			.setTitle("✅ Mensaje enviado")
			.setColor(0x00ff00)
			.setTimestamp()
		let emoji = "❌"
		for (const channel of channels.cache) {
			if (channel[1].type !== ChannelType.GuildText) {
				continue
			}

			const result = await sendMessage(
				channel[1],
				message ?? null,
				embedJson ?? null
			)

			if (result.success) {
				echoLogger.info(
					`User ${userId} sent echo message to channel ${channel[1].id} in guild ${channel[1].guildId}`
				)
				emoji = "✅"
			}

			embed.addFields({
				name: "",
				value: `<#${channel[1].id}> **-->** ${emoji}`
			})
		}

		return embed
	}

	override async run (context: CommandContext): Promise<void> {
		const { interaction } = context

		const validation = await this.validateAndGetInputs(interaction)
		if (!validation.success || !validation.channel) {
			await interaction.reply({
				content: validation.error ?? "❌ Error de validación",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const { channel, message, embedJson, text, category } = validation

		if (text) {
			const modal = this.createModal(channel.id)
			await interaction.showModal(modal)
			return
		}

		if ( category ) {
			const embed = await this.sendMessageCategory(category, interaction.user.id, message, embedJson)

			await interaction.reply({
				embeds: [ embed ],
				flags: MessageFlags.Ephemeral
			})
			return
		}
		const result = await sendMessage(
			channel,
			message ?? null,
			embedJson ?? null
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

registerCommand(EchoCommand, {
	name: "echo",
	description: "Envía un mensaje a través del bot en cualquier canal",
	permissions: PermissionFlagsBits.ManageMessages,
	guildOnly: true,
	options: [
		{
			name: "mensaje",
			description: "El texto del mensaje a enviar",
			type: ApplicationCommandOptionType.String,
			required: false
		},
		{
			name: "canal",
			description: "Canal donde enviar el mensaje",
			type: ApplicationCommandOptionType.Channel,
			channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
			required: false
		},
		{
			name: "embed",
			description: "El embed en formato JSON a enviar",
			type: ApplicationCommandOptionType.String,
			required: false
		},
		{
			name: "texto",
			description: "Se abrirá un formulario donde poder enviar un texto",
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

