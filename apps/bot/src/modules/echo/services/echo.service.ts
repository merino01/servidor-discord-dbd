import { botLogger } from "@/core/logger"
import { CommandReply } from "@/core/types"
import {
	APIEmbedField,
	APIInteractionDataResolvedChannel,
	CategoryChannel,
	ChannelType,
	EmbedBuilder,
	GuildBasedChannel,
	LabelBuilder,
	ModalBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
	User
} from "discord.js"
import { MODAL_REPLY } from "../constans"
import { buildConfirmEmbed } from "../utils/embed"
import { sendMessage } from "../utils/send-message"
import { chunkArray } from "@/util/arrays"
import { buildErrorEmbed } from "@/util/embeds"

interface EchoInput {
	channel: TextChannel
	message: string | null
	text: boolean | null
	embedJson: string | null
	category?: CategoryChannel | null
}

export type ChannelTypeOption = "text" | "category"

const echoLogger = botLogger.child("echo")

export class EchoService {

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
			return "❌ Debes proporcionar al menos un mensaje de texto, un embed o seleccionar la opción de texto."
		}

		return null
	}

	private async validateInputs (
		{ channel, message, embedJson, text }: EchoInput
	): Promise<{ success: boolean; error?: string } > {
		const channelError = this.validateChannel(channel)
		if (channelError) {
			return { success: false, error: channelError }
		}

		const contentError = this.validateMessageContent(message, embedJson, text)
		if (contentError) {
			return { success: false, error: contentError }
		}

		return {
			success: true
		}
	}

	createModal (channelId: string, type: ChannelTypeOption): ModalBuilder {
		const modal = new ModalBuilder().setCustomId(`echo_modal_${type}_${channelId}`).setTitle("Echo")
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

	private buildMessageField (channel: TextChannel, success: boolean): APIEmbedField {
		return {
			name: "",
			value: `<#${channel.id}> **-->** ${success ? "✅" : "❌"}`
		}
	}

	private buildResultEmbeds (fields: APIEmbedField[]): EmbedBuilder[] {
		if (fields.length === 0) {
			return [
				buildErrorEmbed("La categoría seleccionada no contiene canales de texto")
			]
		}

		return chunkArray(fields, 25).map((chunk, index, chunks) => {
			const embed = new EmbedBuilder()
				.setTitle(index === 0 ? "✅ Mensaje enviado" : " ")
				.setColor(0x00ff00)
				.setTimestamp()
				.addFields(chunk)

			if (chunks.length > 1) {
				embed.setFooter({ text: `Página ${index + 1} de ${chunks.length}` })
			}

			return embed
		})
	}

	async sendMessageCategory (
		category: CategoryChannel,
		userId: string,
		message?: string | null,
		embedJson?: string | null
	): Promise<EmbedBuilder[]> {
		const channels = category.children
		const fields: APIEmbedField[] = []

		for (const [, channel] of channels.cache) {
			if (channel.type !== ChannelType.GuildText) {
				continue
			}

			const result = await sendMessage(
				channel,
				message ?? null,
				embedJson ?? null
			)

			if (result.success) {
				echoLogger.info(
					`User ${userId} sent echo message to channel ${channel.id} in guild ${channel.guildId}`
				)
			} else {
				echoLogger.error(
					`Error al intentar enviar echo en el canal ${channel.id}`,
					result.error
				)
			}

			fields.push(this.buildMessageField(channel, result.success))
		}

		return this.buildResultEmbeds(fields)
	}

	async sendEcho (options: EchoInput & { user: User }): Promise<CommandReply> {
		const { channel, message, embedJson, text, category } = options

		const validation = await this.validateInputs({
			channel,
			message,
			embedJson,
			text
		})

		if (!validation.success || !channel) {
			return { content: validation.error ?? "❌ Error de validación" }
		}

		if (text && category) {
			return { content: `${MODAL_REPLY}-category` }
		}

		if (text) {
			return { content: `${MODAL_REPLY}-text` }
		}

		if (category) {
			const embeds = await this.sendMessageCategory(category, options.user.id, message, embedJson)
			return { embeds }
		}

		const result = await sendMessage(
			channel,
			message,
			embedJson
		)

		if (!result.success) {
			return { embeds: [buildErrorEmbed(channel.id)] }
		}

		const confirmEmbed = buildConfirmEmbed(
			channel.id,
			options.user.tag,
			embedJson !== null && embedJson !== undefined
		)

		echoLogger.info(
			`User ${options.user.id} sent echo message to channel ${channel.id} in guild ${channel.guildId}`
		)
		return { embeds: [confirmEmbed] }
	}
}

