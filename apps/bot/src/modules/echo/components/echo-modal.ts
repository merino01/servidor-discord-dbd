import { registerModal } from "@/core/components/component-registry"
import { Injectable } from "@/core/container"
import { botLogger } from "@/core/logger"
import { CategoryChannel, MessageFlags, ModalSubmitInteraction, TextChannel } from "discord.js"
import { ChannelTypeOption, EchoService } from "../services/echo.service"
import { buildConfirmEmbed } from "../utils/embed"
import { sendMessage } from "../utils/send-message"

const echoLogger = botLogger.child("echo")

@Injectable(EchoService)
export class EchoModalComponent {

	constructor (private readonly service: EchoService) {}

	private async handleTextEcho (
		interaction: ModalSubmitInteraction,
		channelId: string,
		message: string): Promise<void> {
		const channel = await interaction.guild?.channels.fetch(channelId) as TextChannel
		const result = await sendMessage(
			channel,
			message ?? null,
			null
		)

		if (!result.success) {
			await interaction.editReply({
				content: result.error ?? "❌ Error desconocido"
			})
			return
		}

		const confirmEmbed = buildConfirmEmbed(
			channel.id,
			interaction.user.tag,
			false
		)
		await interaction.editReply({
			embeds: [confirmEmbed]
		})

		echoLogger.info(
			`User ${interaction.user.id} sent echo message to channel ${channel.id} in guild ${interaction.guildId}`
		)
	}

	private async handleCategoryEcho (
		interaction: ModalSubmitInteraction,
		categoryId: string,
		message: string): Promise<void> {
		const category = await interaction.guild?.channels.fetch(categoryId) as CategoryChannel
		const embeds = await this.service.sendMessageCategory(category, interaction.user.id, message)
		await interaction.editReply({
			embeds
		})
	}

	register (): void {
		registerModal("echo_modal", async (interaction: ModalSubmitInteraction) => {
			try {
				await interaction.deferReply({ flags: MessageFlags.Ephemeral })
				const message = interaction.fields.getTextInputValue("echo_modal_text")
				const [, ,channelType, channelId] = interaction.customId.split("_")

				switch (channelType as ChannelTypeOption) {
				case "text":
					await this.handleTextEcho(interaction, channelId, message)
					break
				case "category":
					await this.handleCategoryEcho(interaction, channelId, message)
					break
				}
			} catch (error) {
				echoLogger.error("Error en la modal del comando echo", error)
			}
		})
	}
}

