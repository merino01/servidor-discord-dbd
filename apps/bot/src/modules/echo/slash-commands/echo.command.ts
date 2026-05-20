import { BaseCommand } from "@/core/base/base-command"
import { CommandContext } from "@types"
import { ApplicationCommandOptionType, CategoryChannel, ChannelType, MessageFlags, TextChannel } from "discord.js"
import { ChannelTypeOption, EchoService } from "../services/echo.service"
import { SlashCommand } from "@/core/decorators/command.decorators"
import { Injectable } from "@/core/container"
import { MODAL_REPLY } from "../constans"

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

		if (!inputText) {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral })
		}

		const reply = await this.service.sendEcho({
			channel: inputChannel,
			message: inputMessage,
			embedJson: inputEmbedJson,
			text: inputText,
			category: inputCategory,
			user: interaction.user
		})

		const modalOptions = reply.content?.split("-")
		const type = modalOptions?.[1] as ChannelTypeOption
		if (modalOptions?.[0] === MODAL_REPLY) {
			const modal = this.service.createModal(type === "category" ? inputCategory.id : inputChannel.id, type)
			await interaction.showModal(modal)
			return
		}

		await interaction.editReply(reply)
	}
}

