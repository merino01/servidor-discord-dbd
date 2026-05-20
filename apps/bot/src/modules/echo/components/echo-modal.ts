import { registerModal } from "@/core/components/component-registry"
import { CategoryChannel, MessageFlags, ModalSubmitInteraction, TextChannel } from "discord.js"
import { sendMessage } from "../utils/send-message"
import { buildConfirmEmbed } from "../utils/embed"
import { botLogger } from "@/core/logger"
import { ChannelTypeOption, EchoService } from "../services/echo.service"
import { Injectable } from "@/core/container"

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
			await interaction.reply({
				content: result.error ?? "❌ Error desconocido",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const confirmEmbed = buildConfirmEmbed(
			channel.id,
			interaction.user.tag,
			false
		)
		await interaction.reply({
			embeds: [confirmEmbed],
			flags: MessageFlags.Ephemeral
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
		const embed = await this.service.sendMessageCategory(category, interaction.user.id, message)
		await interaction.reply({
			embeds: [embed],
			flags: MessageFlags.Ephemeral
		})
	}

	register (): void {
		registerModal("echo_modal", async (interaction: ModalSubmitInteraction) => {
			const message = interaction.fields.getTextInputValue("echo_modal_text")
			const [, ,channelType, channelId] = interaction.customId.split("_")
			console.log(channelId, channelType)

			switch (channelType as ChannelTypeOption) {
			case "text":
				await this.handleTextEcho(interaction, channelId, message)
				break
			case "category":
				await this.handleCategoryEcho(interaction, channelId, message)
				break
			}
		})
	}
}

