import {
	APIInteractionDataResolvedChannel,
	CategoryChannel,
	ChannelType,
	EmbedBuilder,
	GuildBasedChannel,
	LabelBuilder,
	ModalBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle
} from "discord.js"
import { sendMessage } from "../utils/send-message"
import { botLogger } from "@/core/logger"

interface EchoInput {
	channel: TextChannel
	message: string | null
	text: boolean | null
	embedJson: string | null
	category?: CategoryChannel | null
}

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
			return "❌ Debes proporcionar al menos un mensaje de texto o un embed."
		}

		return null
	}

	async validateAndGetInputs (
		{ channel, message, embedJson, text, category }: EchoInput
	): Promise< Partial<EchoInput> & { success: boolean; error?: string } > {
		const channelError = this.validateChannel(channel)
		if (channelError) {
			return { success: false, error: channelError }
		}

		const contentError = this.validateMessageContent(message, embedJson, text)
		if (contentError) {
			return { success: false, error: contentError }
		}

		return {
			success: true,
			channel: channel as TextChannel,
			category: category as CategoryChannel,
			message,
			text,
			embedJson
		}
	}

	createModal (channelId: string): ModalBuilder {
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

	async sendMessageCategory (
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

}
