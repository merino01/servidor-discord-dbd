import { Injectable } from "@/core/container"
import { SlashCommand, Subcommand } from "@/core/decorators/command.decorators"
import { CommandContext } from "@types"
import {
	ApplicationCommandOptionType,
	MessageFlags,
	PermissionFlagsBits
} from "discord.js"
import { ClanModService } from "../services/clan-mod.service"

@Injectable(ClanModService)
@SlashCommand({
	name: "clan-mod",
	description: "Comandos de moderación de clanes",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles
})
export class ClanModCommand {
	constructor (private readonly service: ClanModService) {}

	@Subcommand({
		name: "crear",
		description: "Crea un nuevo clan",
		options: [
			{
				name: "nombre",
				description: "Nombre del clan",
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: "icono",
				description: "Emoji o icono del clan",
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: "lider",
				description: "Usuario que será el líder del clan",
				type: ApplicationCommandOptionType.User,
				required: true
			}
		]
	})
	async create ({ interaction }: CommandContext): Promise<void> {
		const nombre = interaction.options.getString("nombre", true)
		const icono = interaction.options.getString("icono", true)
		const lider = interaction.options.getUser("lider", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.create({
			guildId: interaction.guild!.id,
			name: nombre,
			icon: icono,
			leader: lider,
			user: interaction.user
		})
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "eliminar",
		description: "Elimina un clan existente",
		options: [
			{
				name: "rol",
				description: "Rol del clan a eliminar",
				type: ApplicationCommandOptionType.Role,
				required: true
			}
		]
	})
	async delete ({ interaction }: CommandContext): Promise<void> {
		const rol = interaction.options.getRole("rol", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.deleteClan(interaction.guild!.id, rol)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "añadir-lider",
		description: "Añade un líder a un clan",
		options: [
			{
				name: "rol",
				description: "Rol del clan",
				type: ApplicationCommandOptionType.Role,
				required: true
			},
			{
				name: "usuario",
				description: "Usuario a añadir como líder",
				type: ApplicationCommandOptionType.User,
				required: true
			}
		]
	})
	async addLeader ({ interaction }: CommandContext): Promise<void> {
		const targetUser = interaction.options.getUser("usuario", true)
		const role = interaction.options.getRole("rol", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })
		const reply = await this.service.addLeader(
			interaction.guild!.id,
			role,
			targetUser,
			interaction.user.id
		)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "eliminar-lider",
		description: "Elimina un líder de un clan",
		options: [
			{
				name: "rol",
				description: "Rol del clan",
				type: ApplicationCommandOptionType.Role,
				required: true
			},
			{
				name: "usuario",
				description: "Líder a eliminar",
				type: ApplicationCommandOptionType.User,
				required: true
			}
		]
	})
	async removeLeader ({ interaction }: CommandContext): Promise<void> {
		const targetUser = interaction.options.getUser("usuario", true)
		const role = interaction.options.getRole("rol", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })
		const reply = await this.service.removeLeader(
			interaction.guild!.id,
			role,
			targetUser,
			interaction.user.id
		)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "añadir-miembro",
		description: "Añade un miembro a un clan",
		options: [
			{
				name: "rol",
				description: "Rol del clan",
				type: ApplicationCommandOptionType.Role,
				required: true
			},
			{
				name: "usuario",
				description: "Usuario a añadir",
				type: ApplicationCommandOptionType.User,
				required: true
			}
		]
	})
	async addMember ({ interaction }: CommandContext): Promise<void> {
		const targetUser = interaction.options.getUser("usuario", true)
		const role = interaction.options.getRole("rol", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.addMember(interaction.guild!.id, role, targetUser, interaction.user.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "expulsar",
		description: "Expulsa un miembro de un clan",
		options: [
			{
				name: "rol",
				description: "Rol del clan",
				type: ApplicationCommandOptionType.Role,
				required: true
			},
			{
				name: "usuario",
				description: "Miembro a expulsar",
				type: ApplicationCommandOptionType.User,
				required: true
			}
		]
	})
	async kick ({ interaction }: CommandContext): Promise<void> {
		const targetUser = interaction.options.getUser("usuario", true)
		const role = interaction.options.getRole("rol", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.kickUser(interaction.guild!.id, role, targetUser, interaction.user.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "añadir-canal",
		description: "Añade un canal de voz extra al clan",
		options: [
			{
				name: "rol",
				description: "Rol del clan",
				type: ApplicationCommandOptionType.Role,
				required: true
			}
		]
	})
	async addChannel ({ interaction }: CommandContext): Promise<void> {
		const role = interaction.options.getRole("rol", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.addChannel(interaction.guild!.id, role, interaction.user.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "eliminar-canal",
		description: "Elimina el último canal de voz extra del clan",
		options: [
			{
				name: "rol",
				description: "Rol del clan",
				type: ApplicationCommandOptionType.Role,
				required: true
			}
		]
	})
	async removeChannel ({ interaction }: CommandContext): Promise<void> {
		const role = interaction.options.getRole("rol", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.removeChannel(interaction.guild!.id, role, interaction.user.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "info",
		description: "Muestra información de los clanes del servidor",
		options: [
			{
				name: "ver-eliminados",
				description: "Incluir clanes eliminados en la información",
				type: ApplicationCommandOptionType.Boolean,
				required: false
			}
		]
	})
	async info ({ interaction }: CommandContext): Promise<void> {
		const verEliminados = interaction.options.getBoolean("ver-eliminados") ?? false

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.getClanInfo(interaction.guild!.id, verEliminados)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "miembros",
		description: "Muestra los miembros de un clan",
		options: [
			{
				name: "rol",
				description: "Rol del clan",
				type: ApplicationCommandOptionType.Role,
				required: true
			}
		]
	})
	async members ({ interaction }: CommandContext): Promise<void> {
		const role = interaction.options.getRole("rol", true)

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.getClanMembers(interaction.guild!, role)
		const response = await interaction.editReply(reply)

		if (!reply.chunks || reply.chunks.length === 1) {
			return
		}

		await this.service.handleModPaginationCollector({
			response,
			userId: interaction.user.id,
			chunks: reply.chunks,
			clan: reply.clan!,
			interaction
		})

	}
}
