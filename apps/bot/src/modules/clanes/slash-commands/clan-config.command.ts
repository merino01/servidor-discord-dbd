import { registerCommand, registerSubCommand } from "@/core/command-register"
import { CommandContext } from "@types"
import { PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType, ApplicationCommandOptionType } from "discord.js"
import { botLogger } from "@/core/logger"
import { ClanConfigModel, IClanConfig, ClanModel } from "@org/mongo"
import { BaseCommand } from "@/core/base/base-command"
import { ClanService } from "../services/clan.service"

const clanLogger = botLogger.child("clanes-config")

export class ClanConfigCommand extends BaseCommand {
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

	private buildInfoEmbed (
		title: string,
		fields: Array<{ name: string; value: string; inline?: boolean }>
	): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setColor(0x3498db)
			.setTitle(title)
			.setTimestamp()

		for (const field of fields) {
			embed.addFields(field)
		}

		return embed
	}

	private validateConfigParams (params: {
		categoriaVozType: ChannelType
		categoriaTextoType: ChannelType
		maxMiembros: number
		maxCanalesExtra: number
		expiracionHoras: number
	}): string | null {
		const isValidCategory = params.categoriaVozType === ChannelType.GuildCategory &&
			params.categoriaTextoType === ChannelType.GuildCategory

		if (!isValidCategory) {
			return "El canal especificado debe ser una categoría."
		}

		if (params.maxMiembros < 1 || params.maxMiembros > 100) {
			return "El máximo de miembros debe estar entre 1 y 100."
		}

		if (params.maxCanalesExtra < 0 || params.maxCanalesExtra > 10) {
			return "El máximo de canales extra debe estar entre 0 y 10."
		}

		if (params.expiracionHoras < 1 || params.expiracionHoras > 168) {
			return "La expiración de invitaciones debe estar entre 1 y 168 horas (7 días)."
		}

		return null
	}

	private buildConfigEmbed (params: {
		categoriaVozId: string
		categoriaTextoId: string
		color?: string
		rolLiderId: string
		maxMiembros: number
		maxCanalesExtra: number
		expiracionHoras: number
	}): EmbedBuilder {
		return this.buildSuccessEmbed(
			"Sistema de clanes configurado",
			"El sistema de clanes ha sido configurado correctamente.\n\n" +
			`**Categoría de voz:** <#${params.categoriaVozId}>\n` +
			`**Categoría de texto:** <#${params.categoriaTextoId}>\n` +
			`**Color:** ${params.color ? `#${params.color}` : "Predeterminado"}\n` +
			`**Rol de líder:** <@&${params.rolLiderId}>\n` +
			`**Máximo de miembros por clan:** ${params.maxMiembros}\n` +
			`**Máximo de canales de voz extra:** ${params.maxCanalesExtra}\n` +
			`**Expiración de invitaciones:** ${params.expiracionHoras} horas\n\n` +
			"✅ El sistema está **habilitado** y listo para usar."
		)
	}

	private validateHexColor (colorHex: string): boolean {
		const hexRegex = /^#?([0-9A-Fa-f]{6})$/
		return colorHex.match(hexRegex) !== null
	}

	private getConfigOptions (context: CommandContext) {
		const { interaction } = context
		return {
			categoriaVoz: interaction.options.getChannel("categoria-voz", true),
			categoriaTexto: interaction.options.getChannel("categoria-texto", true),
			rolLider: interaction.options.getRole("rol-lider", true),
			maxMiembros: interaction.options.getInteger("max-miembros") ?? 50,
			maxCanalesExtra: interaction.options.getInteger("max-canales-extra") ?? 2,
			expiracionHoras: interaction.options.getInteger("expiracion-invitacion") ?? 24,
			colorHex: interaction.options.getString("color")
		}
	}

	private async saveConfiguration (params: {
		guildId: string
		rolLiderId: string
		categoriaVozId: string
		categoriaTextoId: string
		colorHex: string | null
		maxMiembros: number
		maxCanalesExtra: number
		expiracionHoras: number
	}): Promise<void> {
		await ClanConfigModel.findOneAndUpdate(
			{ guildId: params.guildId },
			{
				guildId: params.guildId,
				enabled: true,
				leaderRoleId: params.rolLiderId,
				categoryVoiceId: params.categoriaVozId,
				categoryTextId: params.categoriaTextoId,
				color: params.colorHex ? parseInt(params.colorHex, 16) : null,
				maxMembers: params.maxMiembros,
				maxExtraVoiceChannels: params.maxCanalesExtra,
				invitationExpirationHours: params.expiracionHoras
			},
			{ upsert: true, new: true }
		)
	}

	async configurar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			const errorEmbed = this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")
			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral })
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const options = this.getConfigOptions(context)

		const validationError = this.validateConfigParams({
			categoriaVozType: options.categoriaVoz.type,
			categoriaTextoType: options.categoriaTexto.type,
			maxMiembros: options.maxMiembros,
			maxCanalesExtra: options.maxCanalesExtra,
			expiracionHoras: options.expiracionHoras
		})

		if (validationError) {
			await interaction.editReply({ embeds: [this.buildErrorEmbed(validationError)] })
			return
		}

		try {
			await this.saveConfiguration({
				guildId: interaction.guild.id,
				rolLiderId: options.rolLider.id,
				categoriaVozId: options.categoriaVoz.id,
				categoriaTextoId: options.categoriaTexto.id,
				colorHex: options.colorHex,
				maxMiembros: options.maxMiembros,
				maxCanalesExtra: options.maxCanalesExtra,
				expiracionHoras: options.expiracionHoras
			})

			clanLogger.info(`Sistema de clanes configurado en guild ${interaction.guild.id}`)
			const embed = this.buildConfigEmbed({
				categoriaVozId: options.categoriaVoz.id,
				categoriaTextoId: options.categoriaTexto.id,
				rolLiderId: options.rolLider.id,
				color: options.colorHex || undefined,
				maxMiembros: options.maxMiembros,
				maxCanalesExtra: options.maxCanalesExtra,
				expiracionHoras: options.expiracionHoras
			})

			await interaction.editReply({ embeds: [embed] })
		} catch (error) {
			clanLogger.error("Error configurando sistema de clanes:", error)
			const errorEmbed = this.buildErrorEmbed("Error al configurar el sistema de clanes.")
			await interaction.editReply({ embeds: [errorEmbed] })
		}
	}

	async habilitar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		try {
			const config = await ClanConfigModel.findOne({ guildId: interaction.guild.id })

			if (!config) {
				const errorMsg = "El sistema de clanes no está configurado. " +
					"Usa `/clan-config configurar` primero."
				await interaction.editReply({ embeds: [this.buildErrorEmbed(errorMsg)] })
				return
			}

			if (config.enabled) {
				await interaction.editReply({
					embeds: [this.buildErrorEmbed("El sistema de clanes ya está habilitado.")]
				})
				return
			}

			config.enabled = true
			await config.save()

			clanLogger.info(`Sistema de clanes habilitado en guild ${interaction.guild.id}`)

			const successEmbed = this.buildSuccessEmbed(
				"Sistema habilitado",
				"El sistema de clanes ha sido habilitado correctamente."
			)
			await interaction.editReply({ embeds: [successEmbed] })
		} catch (error) {
			clanLogger.error("Error habilitando sistema de clanes:", error)
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("Error al habilitar el sistema de clanes.")]
			})
		}
	}

	async deshabilitar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		try {
			const config = await ClanConfigModel.findOne({ guildId: interaction.guild.id })

			if (!config) {
				await interaction.editReply({
					embeds: [this.buildErrorEmbed("El sistema de clanes no está configurado.")]
				})
				return
			}

			if (!config.enabled) {
				await interaction.editReply({
					embeds: [this.buildErrorEmbed("El sistema de clanes ya está deshabilitado.")]
				})
				return
			}

			config.enabled = false
			await config.save()

			clanLogger.info(`Sistema de clanes deshabilitado en guild ${interaction.guild.id}`)

			await interaction.editReply({
				embeds: [this.buildSuccessEmbed(
					"Sistema deshabilitado",
					"El sistema de clanes ha sido deshabilitado. Los clanes existentes no se han eliminado."
				)]
			})
		} catch (error) {
			clanLogger.error("Error deshabilitando sistema de clanes:", error)
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("Error al deshabilitar el sistema de clanes.")]
			})
		}
	}

	private buildViewConfigEmbed (config: IClanConfig): EmbedBuilder {
		const additionalRolesText = config.additionalRoleIds.length > 0
			? config.additionalRoleIds.map((id) => `<@&${id}>`).join(", ")
			: "Ninguno"

		return this.buildInfoEmbed("⚙️ Configuración del sistema de clanes", [
			{
				name: "Estado",
				value: config.enabled ? "✅ Habilitado" : "❌ Deshabilitado",
				inline: true
			},
			{
				name: "Categoría de voz",
				value: `<#${config.categoryVoiceId}>`,
				inline: true
			},
			{
				name: "Categoría de texto",
				value: `<#${config.categoryTextId}>`,
				inline: true
			},
			{
				name: "Color",
				value: config.color ? `#${config.color}` : "Predeterminado",
				inline: true
			},
			{
				name: "Rol de líder",
				value: `<@&${config.leaderRoleId}>`,
				inline: true
			},
			{
				name: "Máximo de miembros",
				value: config.maxMembers.toString(),
				inline: true
			},
			{
				name: "Canales de voz extra",
				value: config.maxExtraVoiceChannels.toString(),
				inline: true
			},
			{
				name: "Expiración de invitaciones",
				value: `${config.invitationExpirationHours} horas`,
				inline: true
			},
			{
				name: "Roles adicionales",
				value: additionalRolesText,
				inline: false
			}
		])
	}

	async ver (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		try {
			const config = await ClanConfigModel.findOne({ guildId: interaction.guild.id })

			if (!config) {
				const errorMsg = "El sistema de clanes no está configurado. " +
					"Usa `/clan-config configurar` para empezar."
				await interaction.editReply({ embeds: [this.buildErrorEmbed(errorMsg)] })
				return
			}

			const embed = this.buildViewConfigEmbed(config)
			await interaction.editReply({ embeds: [embed] })
		} catch (error) {
			clanLogger.error("Error obteniendo configuración de clanes:", error)
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("Error al obtener la configuración.")]
			})
		}
	}

	async agregarRol (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			const errorEmbed = this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")
			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral })
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rol = interaction.options.getRole("rol", true)

		try {
			const config = await ClanConfigModel.findOne({ guildId: interaction.guild.id })

			if (!config) {
				const errorMsg = "El sistema de clanes no está configurado. " +
					"Usa `/clan-config configurar` primero."
				await interaction.editReply({ embeds: [this.buildErrorEmbed(errorMsg)] })
				return
			}

			if (config.additionalRoleIds.includes(rol.id)) {
				await interaction.editReply({
					embeds: [this.buildErrorEmbed(`El rol ${rol.name} ya está en la lista de roles adicionales.`)]
				})
				return
			}

			config.additionalRoleIds.push(rol.id)
			await config.save()

			clanLogger.info(`Rol adicional agregado: ${rol.name} (${rol.id})`)

			const successEmbed = this.buildSuccessEmbed(
				"Rol adicional agregado",
				`El rol <@&${rol.id}> se asignará automáticamente a todos los miembros de clanes.`
			)
			await interaction.editReply({ embeds: [successEmbed] })
		} catch (error) {
			clanLogger.error("Error agregando rol adicional:", error)
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("Error al agregar el rol adicional.")]
			})
		}
	}

	async quitarRol (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			const errorEmbed = this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")
			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral })
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rol = interaction.options.getRole("rol", true)

		try {
			const config = await ClanConfigModel.findOne({ guildId: interaction.guild.id })

			if (!config) {
				const errorMsg = "El sistema de clanes no está configurado."
				await interaction.editReply({ embeds: [this.buildErrorEmbed(errorMsg)] })
				return
			}

			if (!config.additionalRoleIds.includes(rol.id)) {
				await interaction.editReply({
					embeds: [this.buildErrorEmbed(`El rol ${rol.name} no está en la lista de roles adicionales.`)]
				})
				return
			}

			config.additionalRoleIds = config.additionalRoleIds.filter((id) => id !== rol.id)
			await config.save()

			clanLogger.info(`Rol adicional eliminado: ${rol.name} (${rol.id})`)

			const successEmbed = this.buildSuccessEmbed(
				"Rol adicional eliminado",
				`El rol <@&${rol.id}> ya no se asignará a los miembros de clanes.`
			)
			await interaction.editReply({ embeds: [successEmbed] })
		} catch (error) {
			clanLogger.error("Error quitando rol adicional:", error)
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("Error al quitar el rol adicional.")]
			})
		}
	}

	async editarMaxMiembros (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rolClan = interaction.options.getRole("clan", true)
		const limite = interaction.options.getInteger("limite", true)

		const clan = await ClanModel.findOne({ guildId: interaction.guild.id, roleId: rolClan.id, isActive: true })

		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No se encontró ningún clan con ese rol.")]
			})
			return
		}

		if (limite < 1 || limite > 100) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("El límite debe estar entre 1 y 100.")]
			})
			return
		}

		const result = await this.service.updateClanConfig({
			clanId: clan._id.toString(),
			maxMembers: limite
		})

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Configuración actualizada",
				`El límite de miembros del clan **${clan.name}** ahora es **${limite}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}

	async editarMaxCanalesVoz (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rolClan = interaction.options.getRole("clan", true)
		const limite = interaction.options.getInteger("limite", true)

		const clan = await ClanModel.findOne({ guildId: interaction.guild.id, roleId: rolClan.id, isActive: true })

		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No se encontró ningún clan con ese rol.")]
			})
			return
		}

		if (limite < 1 || limite > 10) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("El límite debe estar entre 1 y 10.")]
			})
			return
		}

		const result = await this.service.updateClanConfig({
			clanId: clan._id.toString(),
			maxVoiceChannels: limite
		})

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Configuración actualizada",
				`El límite de canales de voz del clan **${clan.name}** ahora es **${limite}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}

	async editarColorRol (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const rolClan = interaction.options.getRole("clan", true)
		const colorHex = interaction.options.getString("color", true)

		const clan = await ClanModel.findOne({ guildId: interaction.guild.id, roleId: rolClan.id, isActive: true })

		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No se encontró ningún clan con ese rol.")]
			})
			return
		}

		// Validar formato hexadecimal
		if (!this.validateHexColor(colorHex)) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("El color debe estar en formato hexadecimal (ej: #FF5733).")]
			})
			return
		}

		const colorNumber = parseInt(colorHex, 16)

		const result = await this.service.updateClanConfig({
			clanId: clan._id.toString(),
			roleColor: colorNumber
		})

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Configuración actualizada",
				`El color del rol del clan **${clan.name}** ha sido actualizado a \`${colorHex}\`.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}
}

registerSubCommand(ClanConfigCommand, "configurar", {
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

registerCommand(ClanConfigCommand, {
	name: "clan-config",
	description: "Configuración del sistema de clanes",
	permissions: PermissionFlagsBits.Administrator,
	guildOnly: true
})

registerSubCommand(ClanConfigCommand, "habilitar", {
	name: "habilitar",
	description: "Habilita el sistema de clanes"
})

registerSubCommand(ClanConfigCommand, "deshabilitar", {
	name: "deshabilitar",
	description: "Deshabilita el sistema de clanes"
})

registerSubCommand(ClanConfigCommand, "ver", {
	name: "ver",
	description: "Muestra la configuración actual del sistema de clanes"
})

registerSubCommand(ClanConfigCommand, "agregarRol", {
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

registerSubCommand(ClanConfigCommand, "quitarRol", {
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

registerSubCommand(ClanConfigCommand, "editarMaxMiembros", {
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

registerSubCommand(ClanConfigCommand, "editarMaxCanalesVoz", {
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

registerSubCommand(ClanConfigCommand, "editarColorRol", {
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
