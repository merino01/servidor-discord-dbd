import { BaseCommand } from "@/core/base/base-command"
import { registerCommand } from "@/core/command-register"
import { CommandContext, OptionType } from "@types"
import {
	PermissionFlagsBits,
	EmbedBuilder,
	MessageFlags,
	TextChannel,
	ChannelType,
	GuildBasedChannel,
	APIInteractionDataResolvedChannel,
	ChatInputCommandInteraction
} from "discord.js"
import { botLogger } from "@/core/logger"

const echoLogger = botLogger.child("echo")

export class EchoCommand extends BaseCommand {
	private validateChannel (
		channel: GuildBasedChannel | APIInteractionDataResolvedChannel | null
	): string | null {
		if (!channel) {
			return "❌ Debes especificar un canal válido."
		}

		if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
			return "❌ El canal debe ser un canal de texto o de anuncios."
		}

		return null
	}

	private validateMessageContent (message: string | null, embed: string | null): string | null {
		if (!message && !embed) {
			return "❌ Debes proporcionar al menos un mensaje de texto o un embed."
		}

		return null
	}

	private parseEmbed (embedJson: string): { embed: EmbedBuilder; error: string | null } {
		try {
			const parsed = JSON.parse(embedJson)
			const embed = new EmbedBuilder(parsed)
			return { embed, error: null }
		} catch {
			return {
				embed: new EmbedBuilder(),
				error: "❌ El JSON del embed es inválido. Asegúrate de que sea un JSON válido."
			}
		}
	}

	private async sendMessage (
		channel: TextChannel,
		message: string | null,
		embedJson: string | null
	): Promise<{ success: boolean; error?: string }> {
		const messagePayload: { content?: string; embeds?: EmbedBuilder[] } = {}

		if (message) {
			messagePayload.content = message
		}

		if (embedJson) {
			const { embed, error } = this.parseEmbed(embedJson)
			if (error) {
				return { success: false, error }
			}
			messagePayload.embeds = [embed]
		}

		try {
			await channel.send(messagePayload)
			return { success: true }
		} catch {
			return {
				success: false,
				error: "❌ Error al enviar el mensaje. Verifica los permisos del bot en ese canal."
			}
		}
	}

	private buildConfirmEmbed (
		channelId: string,
		username: string,
		hasEmbed: boolean
	): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle("✅ Mensaje enviado")
			.addFields(
				{ name: "Canal", value: `<#${channelId}>`, inline: true },
				{ name: "Tipo", value: hasEmbed ? "Embed" : "Texto", inline: true }
			)
			.setFooter({ text: `Enviado por ${username}` })
			.setTimestamp()
	}

	private async validateAndGetInputs (
		interaction: ChatInputCommandInteraction
	): Promise<{
		success: boolean
		channel?: TextChannel
		message?: string | null
		embedJson?: string | null
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

		const channelError = this.validateChannel(targetChannel)
		if (channelError) {
			return { success: false, error: channelError }
		}

		const contentError = this.validateMessageContent(message, embedJson)
		if (contentError) {
			return { success: false, error: contentError }
		}

		return {
			success: true,
			channel: targetChannel as TextChannel,
			message,
			embedJson
		}
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

		const { channel, message, embedJson } = validation
		const result = await this.sendMessage(
			channel,
			message ?? null,
			embedJson ?? null
		)

		if (!result.success) {
			await interaction.reply({
				content: result.error ?? "❌ Error desconocido",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const confirmEmbed = this.buildConfirmEmbed(
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
			name: "canal",
			description: "Canal donde enviar el mensaje",
			type: OptionType.CHANNEL,
			required: false
		},
		{
			name: "mensaje",
			description: "El texto del mensaje a enviar",
			type: OptionType.STRING,
			required: false
		},
		{
			name: "embed",
			description: "El embed en formato JSON a enviar",
			type: OptionType.STRING,
			required: false
		}
	]
})
