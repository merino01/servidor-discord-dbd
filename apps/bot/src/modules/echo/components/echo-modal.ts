import { registerModal } from "@/core/components/component-registry"
import { MessageFlags, ModalSubmitInteraction, TextChannel } from "discord.js"
import { sendMessage } from "../utils/send-message"
import { buildConfirmEmbed } from "../utils/embed"
import { botLogger } from "@/core/logger"

const echoLogger = botLogger.child("echo")

export class EchoModalComponent {

	register (): void {
		registerModal("echo_modal", async (interaction: ModalSubmitInteraction) => {
			const message = interaction.fields.getTextInputValue("echo_modal_text")
			const channelId = interaction.customId.split("_")[2]
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
		})
	}
}

