import { CommandContext } from "@types"
import { PermissionFlagsBits, MessageFlags, ApplicationCommandOptionType, ChannelType } from "discord.js"
import { SlashCommand, Subcommand } from "@/core/decorators/command.decorators"
import { Injectable } from "@/core/container"
import { ClanAdminService } from "../services/clan-admin.service"

@Injectable(ClanAdminService)
@SlashCommand({
	name: "clan-admin",
	description: "Comandos administrativos para clanes",
	permissions: PermissionFlagsBits.Administrator
})
export class ClanAdminCommand {
	constructor (private readonly service: ClanAdminService) {}

	@Subcommand({
		name: "migrar",
		description: "Migrar un clan existente al sistema",
		options: [
			{
				name: "nombre",
				description: "Nombre del clan",
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: "icono",
				description: "Icono del clan (emoji)",
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: "rol",
				description: "Rol del clan",
				type: ApplicationCommandOptionType.Role,
				required: true
			},
			{
				name: "canal_texto",
				description: "Canal de texto del clan",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildText],
				required: true
			},
			{
				name: "canal_voz",
				description: "Canal de voz del clan",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildVoice],
				required: true
			},
			{
				name: "limite",
				description: "Límite de miembros",
				type: ApplicationCommandOptionType.Integer,
				required: true
			},
			{
				name: "lider",
				description: "Usuario líder del clan",
				type: ApplicationCommandOptionType.User,
				required: true
			}
		]
	})
	async migrar ({ interaction }: CommandContext) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const nombre = interaction.options.getString("nombre", true)
		const icono = interaction.options.getString("icono", true)
		const rol = interaction.options.getRole("rol", true)
		const canalesTexto = interaction.options.getChannel("canal_texto", true)
		const canalesVoz = interaction.options.getChannel("canal_voz", true)
		const limite = interaction.options.getInteger("limite", true)
		const lider = interaction.options.getUser("lider", true)

		const reply = await this.service.migrate({
			guildId: interaction.guildId!,
			name: nombre,
			icon: icono,
			leaderId: lider.id,
			createdBy: interaction.user.id,
			roleId: rol.id,
			textChannelIds: canalesTexto.id,
			voiceChannelIds: canalesVoz.id,
			maxMembers: limite,
			migracion: true
		})

		await interaction.editReply(reply)
	}
}
