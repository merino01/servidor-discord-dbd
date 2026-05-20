import { Injectable } from "@/core/container"
import { CommandContext, CommandReply } from "@/core/types"
import { buildErrorEmbed } from "@/modules/echo/utils/embed"
import { APIRole, CategoryChannel, EmbedBuilder, Role } from "discord.js"
import { ClanRepository } from "../repositories/clan.repository"
import { botLogger } from "@/core/logger"
import { buildSuccessEmbed } from "../utils/embeds"
import { IClanConfig } from "@org/mongo"

interface IConfigureParams{
voiceCategory: CategoryChannel,
textCategory: CategoryChannel,
leaderRole: Role | APIRole,
maxMembers: number,
maxExtraChannels: number,
expirationHours: number,
colorHex: string | null
}

const clanLogger = botLogger.child("clanes-config")

@Injectable(ClanRepository)
export class ClanConfigService {
	constructor (private readonly repository: ClanRepository) {}

	private validateConfigParams (params: {
		maxMiembros: number
		maxCanalesExtra: number
		expiracionHoras: number
	}): string | null {

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
		return buildSuccessEmbed(
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

	getConfigOptions (context: CommandContext) {
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

	// Función directa al comando
	async configure (params: IConfigureParams & {guildId: string}): Promise<CommandReply> {
		const {
			colorHex,
			expirationHours,
			guildId,
			leaderRole,
			maxExtraChannels,
			maxMembers,
			textCategory,
			voiceCategory
		} = params

		const validationError = this.validateConfigParams({
			maxMiembros: maxMembers,
			maxCanalesExtra: maxExtraChannels,
			expiracionHoras: expirationHours
		})

		if (validationError) {
			return { embeds: [buildErrorEmbed(validationError)] }
		}

		try {
			await this.repository.setClanConfig({
				guildId,
				categoryTextId: textCategory.id,
				categoryVoiceId: voiceCategory.id,
				invitationExpirationHours: expirationHours,
				leaderRoleId: leaderRole.id,
				maxExtraVoiceChannels: maxExtraChannels,
				maxMembers,
				colorHex
			})

			clanLogger.info(`Sistema de clanes configurado en guild ${guildId}`)
			const embed = this.buildConfigEmbed({
				categoriaVozId: voiceCategory.id,
				categoriaTextoId: textCategory.id,
				rolLiderId: leaderRole.id,
				color: colorHex || undefined,
				maxMiembros: maxMembers,
				maxCanalesExtra: maxExtraChannels,
				expiracionHoras: expirationHours
			})

			return { embeds: [embed] }
		} catch (error) {
			clanLogger.error("Error configurando sistema de clanes:", error)
			const errorEmbed =  buildErrorEmbed("Error al configurar el sistema de clanes.")
			return { embeds: [errorEmbed] }
		}
	}

	// Sirve tanto para habilitar como para deshabilitar
	async toggleState (guildId: string, newState: "ENABLE" | "DISABLE"): Promise<CommandReply> {
		const shouldEnable = newState === "ENABLE"

		try {
			const config = await this.repository.getConfig(guildId)

			if (!config) {
				const errorMsg = "El sistema de clanes no está configurado. " +
					"Usa `/clan-config configurar` primero."
				return { embeds: [buildErrorEmbed(errorMsg)] }
			}

			const statusText = shouldEnable ? "habilitado" : "deshabilitado"

			if (config.enabled === shouldEnable) {
				return { embeds: [buildErrorEmbed(`El sistema de clanes ya está ${statusText}.`)] }
			}

			config.enabled = shouldEnable
			await config.save()

			clanLogger.info(`Sistema de clanes ${statusText} en guild ${guildId}`)

			const successEmbed = buildSuccessEmbed(
				`Sistema ${statusText}`,
				"El sistema de clanes ha sido habilitado correctamente."
			)
			return { embeds: [successEmbed] }

		} catch (error) {
			clanLogger.error(`Error ${shouldEnable ? "habilitando" : "deshabilitando"} sistema de clanes:`, error)
			return { embeds: [buildErrorEmbed("Error al habilitar el sistema de clanes.")] }
		}
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

	//
	async getConfig (guildId: string): Promise<CommandReply> {
		try {
			const config = await this.repository.getConfig(guildId)

			if (!config) {
				const errorMsg = "El sistema de clanes no está configurado. " +
					"Usa `/clan-config configurar` primero."
				return { embeds: [buildErrorEmbed(errorMsg)] }
			}

			const embed = this.buildViewConfigEmbed(config)
			return { embeds: [embed] }
		} catch (error) {
			clanLogger.error("Error obteniendo configuración de clanes:", error)
			return { embeds: [buildErrorEmbed("Error al obtener la configuración.")] }
		}

	}

	//
	async addRole (guildId: string, role: Role | APIRole): Promise<CommandReply> {
		try {
			const config = await this.repository.getConfig(guildId)

			if (!config) {
				const errorMsg = "El sistema de clanes no está configurado. " +
					"Usa `/clan-config configurar` primero."
				return { embeds: [buildErrorEmbed(errorMsg)] }
			}

			if (config.additionalRoleIds.includes(role.id)) {
				return { embeds: [buildErrorEmbed(`El rol ${role.name} ya está en la lista de roles adicionales.`)] }
			}

			config.additionalRoleIds.push(role.id)
			await config.save()

			clanLogger.info(`Rol adicional agregado: ${role.name} (${role.id})`)

			const successEmbed = buildSuccessEmbed(
				"Rol adicional agregado",
				`El rol <@&${role.id}> se asignará automáticamente a todos los miembros de clanes.`
			)
			return { embeds: [successEmbed] }

		} catch (error) {
			clanLogger.error("Error agregando rol adicional:", error)
			return { embeds: [buildErrorEmbed("Error al obtener la configuración.")] }
		}
	}

	//
	async removeRole (guildId: string, role: Role | APIRole): Promise<CommandReply> {
		try {
			const config = await this.repository.getConfig(guildId)

			if (!config) {
				const errorMsg = "El sistema de clanes no está configurado. " +
					"Usa `/clan-config configurar` primero."
				return { embeds: [buildErrorEmbed(errorMsg)] }
			}

			if (!config.additionalRoleIds.includes(role.id)) {
				return { embeds: [buildErrorEmbed(`El rol ${role.name} no está en la lista de roles adicionales.`)] }
			}

			config.additionalRoleIds = config.additionalRoleIds.filter((id) => id !== role.id)
			await config.save()

			clanLogger.info(`Rol adicional eliminado: ${role.name} (${role.id})`)

			const successEmbed = buildSuccessEmbed(
				"Rol adicional eliminado",
				`El rol <@&${role.id}> ya no se asignará automáticamente a los miembros de clanes.`
			)
			return { embeds: [successEmbed] }

		} catch (error) {
			clanLogger.error("Error quitando rol adicional:", error)
			return { embeds: [buildErrorEmbed("Error al obtener la configuración.")] }
		}
	}

	//
	async editMaxMembers (guildId: string, roleId: string, limit: number): Promise<CommandReply> {
		const clan = await this.repository.getClanByRole(guildId, roleId)
		if (!clan) {
			return { embeds: [buildErrorEmbed("No se encontró ningún clan con ese rol.")] }
		}

		if (limit < 1 || limit > 100) {
			return { embeds: [buildErrorEmbed("El límite debe estar entre 1 y 100.")] }
		}

		const result = await this.repository.updateClanConfig({
			clanId: clan._id.toString(),
			maxMembers: limit
		})

		if (!result.success) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}

		const embed = buildSuccessEmbed(
			"Configuración actualizada",
			`El límite de miembros del clan **${clan.name}** ahora es **${limit}**.`
		)
		return { embeds: [embed] }
	}

	//
	async editMaxVoiceChannels (guildId: string, roleId: string, limit: number): Promise<CommandReply> {
		const clan = await this.repository.getClanByRole(guildId, roleId)
		if (!clan) {
			return { embeds: [buildErrorEmbed("No se encontró ningún clan con ese rol.")] }
		}

		if (limit < 1 || limit > 10) {
			return { embeds: [buildErrorEmbed("El límite debe estar entre 1 y 10.")] }
		}

		const result = await this.repository.updateClanConfig({
			clanId: clan._id.toString(),
			maxVoiceChannels: limit
		})

		if (!result.success) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}

		const embed = buildSuccessEmbed(
			"Configuración actualizada",
			`El límite de canales de voz del clan **${clan.name}** ahora es **${limit}**.`
		)
		return { embeds: [embed] }
	}

	private validateHexColor (colorHex: string): boolean {
		const hexRegex = /^#?([0-9A-Fa-f]{6})$/
		return colorHex.match(hexRegex) !== null
	}

	//
	async editClanRoleColor (guildId: string, roleId: string, colorHex: string): Promise<CommandReply>{
		const clan = await this.repository.getClanByRole(guildId, roleId)
		if (!clan) {
			return { embeds: [buildErrorEmbed("No se encontró ningún clan con ese rol.")] }
		}

		if (!this.validateHexColor(colorHex)) {
			return { embeds: [buildErrorEmbed("El color debe estar en formato hexadecimal (ej: #FF5733).")] }
		}

		const colorNumber = parseInt(colorHex, 16)

		const result = await this.repository.updateClanConfig({
			clanId: clan._id.toString(),
			roleColor: colorNumber
		})

		if (!result.success) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}

		const embed = buildSuccessEmbed(
			"Configuración actualizada",
			`El color del rol del clan **${clan.name}** ha sido actualizado a \`${colorHex}\`.`
		)
		return { embeds: [embed] }
	}
}

