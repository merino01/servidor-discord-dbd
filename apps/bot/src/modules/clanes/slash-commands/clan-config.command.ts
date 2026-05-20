import { Injectable } from "@/core/container"
import { SlashCommand, Subcommand } from "@/core/decorators/command.decorators"
import { CommandContext } from "@types"
import {
	ApplicationCommandOptionType,
	CategoryChannel,
	ChannelType,
	MessageFlags,
	PermissionFlagsBits
} from "discord.js"
import { ClanConfigService } from "../services/clan-config.service"

@Injectable(ClanConfigService)
@SlashCommand({
	name: "clan-config",
	description: "Configuración del sistema de clanes",
	permissions: PermissionFlagsBits.Administrator,
	guildOnly: true
})
export class ClanConfigCommand {
	constructor (private readonly service: ClanConfigService) {}

	@Subcommand({
		name: "configurar",
		description: "Configura el sistema de clanes del servidor",
		options: [
			{
				name: "categoria-voz",
				description: "Categoría donde se crearán los canales de voz de los clanes",
				type: ApplicationCommandOptionType.Channel,
				channelTypes:[ChannelType.GuildCategory],
				required: true
			},
			{
				name: "categoria-texto",
				description: "Categoría donde se crearán los canales de texto de los clanes",
				type: ApplicationCommandOptionType.Channel,
				channelTypes:[ChannelType.GuildCategory],
				required: true
			},
			{
				name: "rol-lider",
				description: "Rol que se asignará a los líderes de clan",
				type: ApplicationCommandOptionType.Role,
				required: true
			},
			{
				name: "max-miembros",
				description: "Máximo de miembros por clan (1-100, por defecto 50)",
				type: ApplicationCommandOptionType.Integer,
				required: false
			},
			{
				name: "max-canales-extra",
				description: "Máximo de canales de voz extra (0-10, por defecto 3)",
				type: ApplicationCommandOptionType.Integer,
				required: false
			},
			{
				name: "expiracion-invitacion",
				description: "Horas para que expire una invitación (1-168, por defecto 24)",
				type: ApplicationCommandOptionType.Integer,
				required: false
			},
			{
				name: "color",
				description: "Color en formato hexadecimal (ej: #FF5733)",
				type: ApplicationCommandOptionType.String
			}
		]
	})
	async configure ({ interaction }: CommandContext) {
		const voiceCategory = interaction.options.getChannel("categoria-voz", true) as CategoryChannel
		const textCategory = interaction.options.getChannel("categoria-texto", true) as CategoryChannel
		const leaderRole = interaction.options.getRole("rol-lider", true)
		const maxMembers = interaction.options.getInteger("max-miembros") ?? 50
		const maxExtraChannels = interaction.options.getInteger("max-canales-extra") ?? 2
		const expirationHours = interaction.options.getInteger("expiracion-invitacion") ?? 24
		const colorHex = interaction.options.getString("color")

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.configure({
			guildId: interaction.guild!.id,
			textCategory,
			voiceCategory,
			leaderRole,
			maxMembers,
			maxExtraChannels,
			expirationHours,
			colorHex
		})

		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "habilitar",
		description: "Habilita el sistema de clanes"
	})
	async enable ({ interaction }: CommandContext) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.toggleState(interaction.guild!.id, "ENABLE")
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "deshabilitar",
		description: "Deshabilita el sistema de clanes"
	})
	async disable ({ interaction }: CommandContext) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.toggleState(interaction.guild!.id, "DISABLE")
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "ver",
		description: "Muestra la configuración actual del sistema de clanes"
	})
	async view ({ interaction }: CommandContext) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.getConfig(interaction.guild!.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "agregar-rol",
		description: "Agrega un rol adicional que se asignará a todos los miembros de clanes",
		options: [
			{
				name: "rol",
				description: "Rol a agregar (ej: separadores, roles organizativos)",
				type: ApplicationCommandOptionType.Role,
				required: true
			}
		]
	})
	async addRole ({ interaction }: CommandContext) {
		const role = interaction.options.getRole("rol", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.addRole(interaction.guild!.id, role)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "quitar-rol",
		description: "Quita un rol adicional de la lista",
		options: [
			{
				name: "rol",
				description: "Rol a quitar",
				type: ApplicationCommandOptionType.Role,
				required: true
			}
		]
	})
	async removeRole ({ interaction }: CommandContext) {
		const role = interaction.options.getRole("rol", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.removeRole(interaction.guild!.id, role)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "editar-max-miembros",
		description: "Configurar el máximo de miembros de un clan específico",
		options: [
			{
				name: "clan",
				description: "Rol del clan a configurar",
				type: ApplicationCommandOptionType.Role,
				required: true
			},
			{
				name: "limite",
				description: "Nuevo límite de miembros (1-100)",
				type: ApplicationCommandOptionType.Integer,
				required: true
			}
		]
	})
	async editMaxMembers ({ interaction }: CommandContext) {
		const clanRole = interaction.options.getRole("clan", true)
		const limit = interaction.options.getInteger("limite", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.editMaxMembers(interaction.guild!.id, clanRole.id, limit)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "editar-max-canales-voz",
		description: "Configurar el máximo de canales de voz de un clan específico",
		options: [
			{
				name: "clan",
				description: "Rol del clan a configurar",
				type: ApplicationCommandOptionType.Role,
				required: true
			},
			{
				name: "limite",
				description: "Nuevo límite de canales de voz (1-10)",
				type: ApplicationCommandOptionType.Integer,
				required: true
			}
		]
	})
	async editMaxVoiceChannels ({ interaction }: CommandContext) {
		const clanRole = interaction.options.getRole("clan", true)
		const limit = interaction.options.getInteger("limite", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.editMaxVoiceChannels(interaction.guild!.id, clanRole.id, limit)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "editar-color-rol",
		description: "Configurar el color del rol de un clan específico",
		options: [
			{
				name: "clan",
				description: "Rol del clan a configurar",
				type: ApplicationCommandOptionType.Role,
				required: true
			},
			{
				name: "color",
				description: "Color en formato hexadecimal (ej: #FF5733)",
				type: ApplicationCommandOptionType.String,
				required: true
			}
		]
	})
	async editRoleColor ({ interaction }: CommandContext) {
		const clanRole = interaction.options.getRole("clan", true)
		const colorHex = interaction.options.getString("color", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.editClanRoleColor(interaction.guild!.id, clanRole.id, colorHex)
		await interaction.editReply(reply)
	}
}
