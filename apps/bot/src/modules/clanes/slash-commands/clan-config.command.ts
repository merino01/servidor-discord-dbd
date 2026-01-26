import { registerCommand, registerSubCommand } from "@core/decorators/command.decorators"
import { CommandContext, OptionType } from "@types"
import { PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType } from "discord.js"
import { botLogger } from "@/core/logger"
import { ClanConfigModel, IClanConfig } from "@org/mongo"
import { BaseCommand } from "@/core/base/base-command"

const clanLogger = botLogger.child("clanes-config")

export class ClanConfigCommand extends BaseCommand {
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

	private validateConfigParams (
		categoriaType: ChannelType,
		maxMiembros: number,
		maxCanalesExtra: number,
		expiracionHoras: number
	): string | null {
		if (categoriaType !== ChannelType.GuildCategory) {
			return "El canal especificado debe ser una categoría."
		}

		if (maxMiembros < 1 || maxMiembros > 100) {
			return "El máximo de miembros debe estar entre 1 y 100."
		}

		if (maxCanalesExtra < 0 || maxCanalesExtra > 10) {
			return "El máximo de canales extra debe estar entre 0 y 10."
		}

		if (expiracionHoras < 1 || expiracionHoras > 168) {
			return "La expiración de invitaciones debe estar entre 1 y 168 horas (7 días)."
		}

		return null
	}

	private buildConfigEmbed (params: {
		categoriaId: string
		rolLiderId: string
		maxMiembros: number
		maxCanalesExtra: number
		expiracionHoras: number
	}): EmbedBuilder {
		return this.buildSuccessEmbed(
			"Sistema de clanes configurado",
			"El sistema de clanes ha sido configurado correctamente.\n\n" +
			`**Categoría:** <#${params.categoriaId}>\n` +
			`**Rol de líder:** <@&${params.rolLiderId}>\n` +
			`**Máximo de miembros por clan:** ${params.maxMiembros}\n` +
			`**Máximo de canales de voz extra:** ${params.maxCanalesExtra}\n` +
			`**Expiración de invitaciones:** ${params.expiracionHoras} horas\n\n` +
			"✅ El sistema está **habilitado** y listo para usar."
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

		const categoria = interaction.options.getChannel("categoria", true)
		const rolLider = interaction.options.getRole("rol-lider", true)
		const maxMiembros = interaction.options.getInteger("max-miembros") ?? 50
		const maxCanalesExtra = interaction.options.getInteger("max-canales-extra") ?? 3
		const expiracionHoras = interaction.options.getInteger("expiracion-invitacion") ?? 24

		const validationError = this.validateConfigParams(
			categoria.type,
			maxMiembros,
			maxCanalesExtra,
			expiracionHoras
		)

		if (validationError) {
			await interaction.editReply({ embeds: [this.buildErrorEmbed(validationError)] })
			return
		}

		try {
			await ClanConfigModel.findOneAndUpdate(
				{ guildId: interaction.guild.id },
				{
					guildId: interaction.guild.id,
					enabled: true,
					leaderRoleId: rolLider.id,
					categoryId: categoria.id,
					maxMembers: maxMiembros,
					maxExtraVoiceChannels: maxCanalesExtra,
					invitationExpirationHours: expiracionHoras
				},
				{ upsert: true, new: true }
			)

			clanLogger.info(`Sistema de clanes configurado en guild ${interaction.guild.id}`)
			const embed = this.buildConfigEmbed({
				categoriaId: categoria.id,
				rolLiderId: rolLider.id,
				maxMiembros,
				maxCanalesExtra,
				expiracionHoras
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
				name: "Categoría",
				value: `<#${config.categoryId}>`,
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
}

registerSubCommand(ClanConfigCommand, "configurar", {
	name: "configurar",
	description: "Configura el sistema de clanes del servidor",
	options: [
		{
			name: "categoria",
			description: "Categoría donde se crearán los canales de los clanes",
			type: OptionType.CHANNEL,
			required: true
		},
		{
			name: "rol-lider",
			description: "Rol que se asignará a los líderes de clan",
			type: OptionType.ROLE,
			required: true
		},
		{
			name: "max-miembros",
			description: "Máximo de miembros por clan (1-100, por defecto 50)",
			type: OptionType.INTEGER,
			required: false
		},
		{
			name: "max-canales-extra",
			description: "Máximo de canales de voz extra (0-10, por defecto 3)",
			type: OptionType.INTEGER,
			required: false
		},
		{
			name: "expiracion-invitacion",
			description: "Horas para que expire una invitación (1-168, por defecto 24)",
			type: OptionType.INTEGER,
			required: false
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
			type: OptionType.ROLE,
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
			type: OptionType.ROLE,
			required: true
		}
	]
})
