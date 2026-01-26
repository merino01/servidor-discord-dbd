import { registerCommand, registerSubCommand } from "@core/decorators/command.decorators"
import { CommandContext, OptionType } from "@types"
import { BaseCommand } from "@/core/base/base-command"
import { ClanService } from "../services/clan.service"
import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js"

export class ClanModCommand extends BaseCommand {
	protected service = ClanService.getInstance()
	private buildSuccessEmbed (title: string, description: string): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle(`✅ ${title}`)
			.setDescription(description)
			.setTimestamp()
	}

	private buildErrorEmbed (error: string): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(0xff0000)
			.setTitle("❌ Error")
			.setDescription(error)
			.setTimestamp()
	}

	private validateClanName (nombre: string): string | null {
		if (nombre.length < 2 || nombre.length > 32) {
			return "El nombre del clan debe tener entre 2 y 32 caracteres."
		}
		return null
	}

	private validateClanIcon (icono: string): string | null {
		const emojiRegex = /\p{Emoji}/u
		const isEmoji = emojiRegex.test(icono)

		if (!isEmoji && icono.length > 4) {
			return "El icono del clan debe ser un emoji o tener máximo 4 caracteres."
		}

		if (icono.length === 0) {
			return "Debes proporcionar un icono para el clan."
		}

		return null
	}

	async crear (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const nombre = interaction.options.getString("nombre", true)
		const icono = interaction.options.getString("icono", true)
		const lider = interaction.options.getUser("lider", true)

		const nameError = this.validateClanName(nombre)
		if (nameError) {
			await interaction.editReply({ embeds: [this.buildErrorEmbed(nameError)] })
			return
		}

		const iconError = this.validateClanIcon(icono)
		if (iconError) {
			await interaction.editReply({ embeds: [this.buildErrorEmbed(iconError)] })
			return
		}

		const result = await this.service.createClan({
			guildId: interaction.guild.id,
			name: nombre,
			icon: icono,
			leaderId: lider.id,
			createdBy: interaction.user.id
		})

		if (!result.success || !result.clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido al crear el clan.")]
			})
			return
		}

		const embed = this.buildSuccessEmbed(
			"Clan creado",
			`Se ha creado el clan **${icono} ${nombre}**\n\n` +
			`**Líder:** <@${lider.id}>\n` +
			`**Canal de texto:** <#${result.clan.textChannelIds[0]}>\n` +
			`**Canal de voz:** <#${result.clan.voiceChannelIds[0]}>`
		)

		await interaction.editReply({ embeds: [embed] })
	}

	async eliminar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rol = interaction.options.getRole("rol", true)

		const clan = await this.service.getClanByRole(interaction.guild.id, rol.id)

		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(`No se encontró ningún clan asociado al rol ${rol.name}.`)]
			})
			return
		}

		const result = await this.service.deleteClan(clan._id.toString(), interaction.user.id)

		if (!result.success) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido al eliminar el clan.")]
			})
			return
		}

		const embed = this.buildSuccessEmbed(
			"Clan eliminado",
			`El clan **${clan.icon} ${clan.name}** ha sido eliminado correctamente.\n\n` +
			"Se han eliminado todos sus canales y roles asociados."
		)

		await interaction.editReply({ embeds: [embed] })
	}

	async añadirLider (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rol = interaction.options.getRole("rol", true)
		const usuario = interaction.options.getUser("usuario", true)

		const clan = await this.service.getClanByRole(interaction.guild.id, rol.id)
		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No se encontró un clan con ese rol.")]
			})
			return
		}

		const result = await this.service.addLeader(clan._id.toString(), usuario.id, interaction.user.id)

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Líder añadido",
				`${usuario.tag} ahora es líder del clan **${clan.name}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}

	async eliminarLider (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rol = interaction.options.getRole("rol", true)
		const usuario = interaction.options.getUser("usuario", true)

		const clan = await this.service.getClanByRole(interaction.guild.id, rol.id)
		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No se encontró un clan con ese rol.")]
			})
			return
		}

		const result = await this.service.removeLeader(
			clan._id.toString(),
			usuario.id,
			interaction.user.id
		)

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Líder removido",
				`${usuario.tag} ya no es líder del clan **${clan.name}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}

	async añadirMiembro (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rol = interaction.options.getRole("rol", true)
		const usuario = interaction.options.getUser("usuario", true)

		const clan = await this.service.getClanByRole(interaction.guild.id, rol.id)
		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No se encontró un clan con ese rol.")]
			})
			return
		}

		const result = await this.service.addMember(clan._id.toString(), usuario.id, interaction.user.id)

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Miembro añadido",
				`${usuario.tag} se ha unido al clan **${clan.name}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}

	async expulsar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rol = interaction.options.getRole("rol", true)
		const usuario = interaction.options.getUser("usuario", true)

		const clan = await this.service.getClanByRole(interaction.guild.id, rol.id)
		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No se encontró un clan con ese rol.")]
			})
			return
		}

		const result = await this.service.removeMember(
			clan._id.toString(),
			usuario.id,
			interaction.user.id,
			true
		)

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Miembro expulsado",
				`${usuario.tag} ha sido expulsado del clan **${clan.name}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}

	async añadirCanal (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rol = interaction.options.getRole("rol", true)

		const clan = await this.service.getClanByRole(interaction.guild.id, rol.id)
		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No se encontró un clan con ese rol.")]
			})
			return
		}

		const result = await this.service.addExtraVoiceChannel(
			clan._id.toString(),
			interaction.user.id
		)

		if (result.success && result.channelId) {
			const channelNumber = clan.voiceChannelIds.length + 1
			const embed = this.buildSuccessEmbed(
				"Canal añadido",
				`Canal de voz **${clan.icon} ${clan.name} #${channelNumber}** creado exitosamente.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}

	async eliminarCanal (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rol = interaction.options.getRole("rol", true)

		const clan = await this.service.getClanByRole(interaction.guild.id, rol.id)
		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No se encontró un clan con ese rol.")]
			})
			return
		}

		const result = await this.service.removeLastExtraVoiceChannel(
			clan._id.toString(),
			interaction.user.id
		)

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Canal eliminado",
				`El canal ha sido eliminado del clan **${clan.name}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}
}

registerCommand(ClanModCommand, {
	name: "clan-mod",
	description: "Comandos de moderación de clanes",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles
})

registerSubCommand(ClanModCommand, "crear", {
	name: "crear",
	description: "Crea un nuevo clan",
	options: [
		{
			name: "nombre",
			description: "Nombre del clan",
			type: OptionType.STRING,
			required: true
		},
		{
			name: "icono",
			description: "Emoji o icono del clan",
			type: OptionType.STRING,
			required: true
		},
		{
			name: "lider",
			description: "Usuario que será el líder del clan",
			type: OptionType.USER,
			required: true
		}
	]
})

registerSubCommand(ClanModCommand, "eliminar", {
	name: "eliminar",
	description: "Elimina un clan existente",
	options: [
		{
			name: "rol",
			description: "Rol del clan a eliminar",
			type: OptionType.ROLE,
			required: true
		}
	]
})

registerSubCommand(ClanModCommand, "añadirLider", {
	name: "añadir-lider",
	description: "Añade un líder a un clan",
	options: [
		{
			name: "rol",
			description: "Rol del clan",
			type: OptionType.ROLE,
			required: true
		},
		{
			name: "usuario",
			description: "Usuario a añadir como líder",
			type: OptionType.USER,
			required: true
		}
	]
})

registerSubCommand(ClanModCommand, "eliminarLider", {
	name: "eliminar-lider",
	description: "Elimina un líder de un clan",
	options: [
		{
			name: "rol",
			description: "Rol del clan",
			type: OptionType.ROLE,
			required: true
		},
		{
			name: "usuario",
			description: "Líder a eliminar",
			type: OptionType.USER,
			required: true
		}
	]
})

registerSubCommand(ClanModCommand, "añadirMiembro", {
	name: "añadir-miembro",
	description: "Añade un miembro a un clan",
	options: [
		{
			name: "rol",
			description: "Rol del clan",
			type: OptionType.ROLE,
			required: true
		},
		{
			name: "usuario",
			description: "Usuario a añadir",
			type: OptionType.USER,
			required: true
		}
	]
})

registerSubCommand(ClanModCommand, "expulsar", {
	name: "expulsar",
	description: "Expulsa un miembro de un clan",
	options: [
		{
			name: "rol",
			description: "Rol del clan",
			type: OptionType.ROLE,
			required: true
		},
		{
			name: "usuario",
			description: "Miembro a expulsar",
			type: OptionType.USER,
			required: true
		}
	]
})

registerSubCommand(ClanModCommand, "añadirCanal", {
	name: "añadir-canal",
	description: "Añade un canal de voz extra al clan",
	options: [
		{
			name: "rol",
			description: "Rol del clan",
			type: OptionType.ROLE,
			required: true
		}
	]
})

registerSubCommand(ClanModCommand, "eliminarCanal", {
	name: "eliminar-canal",
	description: "Elimina el último canal de voz extra del clan",
	options: [
		{
			name: "rol",
			description: "Rol del clan",
			type: OptionType.ROLE,
			required: true
		}
	]
})
