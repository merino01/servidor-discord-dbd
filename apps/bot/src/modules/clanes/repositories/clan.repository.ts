import { BotInstance } from "@/core/bot-instance"
import { botLogger } from "@/core/logger"
import {
	Role,
	TextChannel,
	VoiceChannel,
	CategoryChannel,
	ChannelType,
	Guild
} from "discord.js"
import { botEvents } from "@/core/events/bot-events"
import { getChannelPermissions } from "../utils/get-channel-permissions"
import {
	ClanConfigModel,
	ClanInvitationModel,
	ClanModel,
	ClanInvitationStatus,
	IClan,
	IClanConfig,
	IClanInvitation,
	Document,
    Types
} from "@org/mongo"

const clanLogger = botLogger.child("clanes")

export class ClanRepository {
	private async cleanupClanCreation (
		role: Role | null,
		textChannel: TextChannel | null,
		voiceChannel: VoiceChannel | null
	): Promise<void> {
		if (voiceChannel) {
			await voiceChannel.delete().catch((e) => clanLogger.error("Error eliminando canal de voz:", e))
		}
		if (textChannel) {
			await textChannel.delete().catch((e) => clanLogger.error("Error eliminando canal de texto:", e))
		}
		if (role) {
			await role.delete().catch((e) => clanLogger.error("Error eliminando rol:", e))
		}
	}

	private async validateClanCreation (
		guildId: string,
		name: string
	): Promise<{ success: boolean; error?: string; guild?: Guild; config?: IClanConfig }> {
		const client = BotInstance.get()
		if (!client) {
			return { success: false, error: "Cliente de Discord no disponible" }
		}

		const guild = client.guilds.cache.get(guildId)
		if (!guild) {
			return { success: false, error: "Servidor no encontrado" }
		}

		const config = await ClanConfigModel.findOne({ guildId })
		if (!config || !config.enabled) {
			return { success: false, error: "El sistema de clanes no está configurado o está deshabilitado" }
		}

		const existingClan = await ClanModel.findOne({ guildId, name, isActive: true })
		if (existingClan) {
			return { success: false, error: "Ya existe un clan con ese nombre" }
		}

		return { success: true, guild, config }
	}

	private async createClanResources ({
		guild,
		config,
		clanName,
		icon,
		leaderId
	}: {
		guild: Guild,
		config: IClanConfig,
		clanName: string,
		icon: string,
		leaderId: string
	}): Promise<{ role: Role; textChannel: TextChannel; voiceChannel: VoiceChannel }> {
		const { color } = config
		const role = await guild.roles.create({
			name: `${icon} ${clanName}`,
			permissions: [],
			mentionable: true,
			colors: color !== null ? { primaryColor: color } : undefined
		})

		const categoryVoice = guild.channels.cache.get(config.categoryVoiceId) as CategoryChannel
		const categoryText = guild.channels.cache.get(config.categoryTextId) as CategoryChannel
		if (!categoryVoice || !categoryText) {
			throw new Error("Categoría de clanes no encontrada")
		}

		const channels = await this.createClanChannels({
			guild,
			categoryVoice,
			categoryText,
			clanName,
			icon,
			role,
			leaderRoleId: config.leaderRoleId
		})
		await this.assignLeaderRoles({
			guild,
			leaderId,
			clanRole: role,
			leaderRoleId: config.leaderRoleId,
			additionalRoleIds: config.additionalRoleIds
		})

		return { role, ...channels }
	}

	private async createClanChannels ({
		guild,
		categoryVoice,
		categoryText,
		clanName,
		icon,
		role,
		leaderRoleId
	}: {
		guild: Guild,
		categoryText: CategoryChannel,
		categoryVoice: CategoryChannel,
		clanName: string,
		icon: string,
		role: Role,
		leaderRoleId: string
	}): Promise<{ textChannel: TextChannel; voiceChannel: VoiceChannel }> {
		const textPerms = getChannelPermissions("text", leaderRoleId, guild.id, role.id)
		const textChannel = await guild.channels.create({
			name: `【${icon}】${clanName}`,
			type: ChannelType.GuildText,
			parent: categoryText.id,
			permissionOverwrites: textPerms
		})

		const voicePerms = getChannelPermissions("voice", leaderRoleId, guild.id, role.id)
		const voiceChannel = await guild.channels.create({
			name: `${icon} ${clanName}`,
			type: ChannelType.GuildVoice,
			parent: categoryVoice.id,
			permissionOverwrites: voicePerms
		})

		return { textChannel, voiceChannel }
	}

	private async assignLeaderRoles (params: {
		guild: Guild
		leaderId: string
		clanRole: Role
		leaderRoleId?: string
		additionalRoleIds?: string[]
	}): Promise<void> {
		const leader = await params.guild.members.fetch(params.leaderId)
		await leader.roles.add(params.clanRole)

		if (params.leaderRoleId) {
			await leader.roles.add(params.leaderRoleId)
		}

		if (params.additionalRoleIds && params.additionalRoleIds.length > 0) {
			for (const roleId of params.additionalRoleIds) {
				await leader.roles.add(roleId).catch(() => null)
			}
		}
	}

	async createClan (params: {
		guildId: string
		name: string
		icon: string
		leaderId: string
		createdBy: string
		roleId?: string
		textChannelIds?: string[]
		voiceChannelIds?: string[]
		maxMembers?: number
		maxVoiceChannels?: number
		roleColor?: number
		migracion?: boolean
	}): Promise<{ success: boolean; clan?: IClan; error?: string }> {
		const validation = await this.validateClanCreation(params.guildId, params.name)
		if (!validation.success || !validation.guild || !validation.config) {
			return { success: false, error: validation.error }
		}

		// Si es migración, usar recursos existentes
		if (params.migracion && params.roleId && params.textChannelIds && params.voiceChannelIds) {
			return await this.migrateClan(
				{
					guildId: params.guildId,
					name: params.name,
					icon: params.icon,
					leaderId: params.leaderId,
					createdBy: params.createdBy,
					roleId: params.roleId,
					textChannelIds: params.textChannelIds,
					voiceChannelIds: params.voiceChannelIds,
					maxMembers: params.maxMembers,
					maxVoiceChannels: params.maxVoiceChannels,
					roleColor: params.roleColor
				},
				validation.config
			)
		}

		// Si no es migración, crear recursos normalmente
		return await this.createNewClan(params, validation.guild, validation.config)
	}

	private async migrateClan (
		params: {
			guildId: string
			name: string
			icon: string
			leaderId: string
			createdBy: string
			roleId: string
			textChannelIds: string[]
			voiceChannelIds: string[]
			maxMembers?: number
			maxVoiceChannels?: number
			roleColor?: number
		},
		config: IClanConfig
	): Promise<{ success: boolean; clan?: IClan; error?: string }> {
		try {
			const clan = await ClanModel.create({
				guildId: params.guildId,
				name: params.name,
				icon: params.icon,
				leaderIds: [params.leaderId],
				roleId: params.roleId,
				textChannelIds: params.textChannelIds,
				voiceChannelIds: params.voiceChannelIds,
				members: [params.leaderId],
				createdBy: params.createdBy,
				isActive: true,
				maxMembers: params.maxMembers ?? config.maxMembers,
				maxVoiceChannels: params.maxVoiceChannels ?? config.maxExtraVoiceChannels + 1,
				roleColor: params.roleColor
			})

			clanLogger.info(`Clan migrado: ${params.name} en guild ${params.guildId}`)

			botEvents.emit("clan:created", {
				guildId: params.guildId,
				clanId: clan._id.toString(),
				clanName: params.name,
				leaderId: params.leaderId,
				createdBy: params.createdBy
			})

			return { success: true, clan }
		} catch (error) {
			clanLogger.error("Error migrando clan:", error)
			return { success: false, error: "Error al migrar el clan" }
		}
	}

	private async createNewClan (
		params: {
			guildId: string
			name: string
			icon: string
			leaderId: string
			createdBy: string
			roleColor?: number
		},
		guild: Guild,
		config: IClanConfig
	): Promise<{ success: boolean; clan?: IClan; error?: string }> {
		let role: Role | null = null
		let textChannel: TextChannel | null = null
		let voiceChannel: VoiceChannel | null = null

		try {
			const resources = await this.createClanResources({
				guild,
				config,
				clanName: params.name,
				icon: params.icon,
				leaderId: params.leaderId
			})
			role = resources.role
			textChannel = resources.textChannel
			voiceChannel = resources.voiceChannel

			const clan = await ClanModel.create({
				guildId: params.guildId,
				name: params.name,
				icon: params.icon,
				leaderIds: [params.leaderId],
				roleId: role.id,
				textChannelIds: [textChannel.id],
				voiceChannelIds: [voiceChannel.id],
				members: [params.leaderId],
				createdBy: params.createdBy,
				maxMembers: config.maxMembers,
				maxVoiceChannels: config.maxExtraVoiceChannels + 1,
				roleColor: params.roleColor
			})

			clanLogger.info(`Clan creado: ${params.name} en guild ${params.guildId}`)

			botEvents.emit("clan:created", {
				guildId: params.guildId,
				clanId: clan._id.toString(),
				clanName: params.name,
				leaderId: params.leaderId,
				createdBy: params.createdBy
			})

			return { success: true, clan }
		} catch (error) {
			clanLogger.error("Error creando clan:", error)
			await this.cleanupClanCreation(role, textChannel, voiceChannel)
			return { success: false, error: "Error al crear el clan" }
		}
	}

	private async deleteChannels (guildId: string, channelIds: string[]): Promise<void> {
		const client = BotInstance.get()
		const guild = client?.guilds.cache.get(guildId)
		if (!guild) {return}

		for (const channelId of channelIds) {
			const channel = guild.channels.cache.get(channelId)
			if (channel) {
				await channel.delete().catch(() => null)
			}
		}
	}

	private async removeLeaderRoles (guildId: string, leaderIds: string[], roleId: string): Promise<void> {
		const client = BotInstance.get()
		const guild = client?.guilds.cache.get(guildId)
		if (!guild) {return}

		for (const leaderId of leaderIds) {
			const member = await guild.members.fetch(leaderId).catch(() => null)
			if (member) {
				await member.roles.remove(roleId).catch(() => null)
			}
		}
	}

	private async removeAllMemberRoles (params: {
		guild: Guild
		memberIds: string[]
		additionalRoleIds: string[]
	}): Promise<void> {
		for (const memberId of params.memberIds) {
			for (const roleId of params.additionalRoleIds) {
				const member = await params.guild.members.fetch(memberId).catch(() => null)
				if (member) {
					await member.roles.remove(roleId).catch(() => null)
				}
			}
		}
	}

	private async cleanupClanResources (params: {
		guild: Guild
		clan: IClan
		config: IClanConfig | null
	}): Promise<void> {
		await this.deleteChannels(params.clan.guildId, params.clan.textChannelIds)
		await this.deleteChannels(params.clan.guildId, params.clan.voiceChannelIds)

		const role = params.guild.roles.cache.get(params.clan.roleId)
		if (role) {
			await role.delete()
		}

		if (params.config?.leaderRoleId) {
			await this.removeLeaderRoles(params.clan.guildId, params.clan.leaderIds, params.config.leaderRoleId)
		}

		if (params.config?.additionalRoleIds && params.config.additionalRoleIds.length > 0) {
			await this.removeAllMemberRoles({
				guild: params.guild,
				memberIds: params.clan.members,
				additionalRoleIds: params.config.additionalRoleIds
			})
		}
	}

	async deleteClan (clanId: string, deletedBy: string): Promise<{ success: boolean; error?: string }> {
		const client = BotInstance.get()
		if (!client) {
			return { success: false, error: "Cliente de Discord no disponible" }
		}

		const clan = await ClanModel.findById(new Types.ObjectId(clanId)
		if (!clan) {
			return { success: false, error: "Clan no encontrado" }
		}

		const guild = client.guilds.cache.get(clan.guildId)
		if (!guild) {
			return { success: false, error: "Servidor no encontrado" }
		}

		const config = await ClanConfigModel.findOne({ guildId: clan.guildId })

		try {
			await this.cleanupClanResources({ guild, clan, config })

			clan.isActive = false
			clan.deletedAt = new Date()
			clan.deletedBy = deletedBy
			clan.members = []
			clan.leaderIds = []
			await clan.save()
			await ClanInvitationModel.deleteMany({ clanId })

			clanLogger.info(`Clan eliminado: ${clan.name} (${clanId})`)

			botEvents.emit("clan:deleted", {
				guildId: clan.guildId,
				clanId,
				clanName: clan.name,
				deletedBy
			})

			return { success: true }
		} catch (error) {
			clanLogger.error("Error eliminando clan:", error)
			return { success: false, error: "Error al eliminar el clan" }
		}
	}
	async addLeader (clanId: string, userId: string, addedBy: string): Promise<{ success: boolean; error?: string }> {
		const client = BotInstance.get()
		if (!client) {
			return { success: false, error: "Cliente de Discord no disponible" }
		}

		const clan = await ClanModel.findById(clanId)
		if (!clan) {
			return { success: false, error: "Clan no encontrado" }
		}

		if (clan.leaderIds.includes(userId)) {
			return { success: false, error: "El usuario ya es líder del clan" }
		}

		if (!clan.members.includes(userId)) {
			return { success: false, error: "El usuario no es miembro del clan" }
		}

		const guild = client.guilds.cache.get(clan.guildId)
		if (!guild) {
			return { success: false, error: "Servidor no encontrado" }
		}

		const config = await ClanConfigModel.findOne({ guildId: clan.guildId })

		try {
			const member = await guild.members.fetch(userId)

			if (config?.leaderRoleId) {
				await member.roles.add(config.leaderRoleId)
			}

			clan.leaderIds.push(userId)
			await clan.save()

			clanLogger.info(`Líder añadido: ${userId} al clan ${clan.name}`)

			botEvents.emit("clan:leaderAdded", {
				guildId: clan.guildId,
				clanId,
				clanName: clan.name,
				leaderId: userId,
				addedBy
			})

			return { success: true }
		} catch (error) {
			clanLogger.error("Error añadiendo líder:", error)
			return { success: false, error: "Error al añadir líder" }
		}
	}

	async removeLeader (
		clanId: string,
		userId: string,
		removedBy: string
	): Promise<{ success: boolean; error?: string }> {
		const client = BotInstance.get()
		if (!client) {
			return { success: false, error: "Cliente de Discord no disponible" }
		}

		const clan = await ClanModel.findById(clanId)
		if (!clan) {
			return { success: false, error: "Clan no encontrado" }
		}

		if (!clan.leaderIds.includes(userId)) {
			return { success: false, error: "El usuario no es líder del clan" }
		}

		if (clan.leaderIds.length === 1) {
			return { success: false, error: "No puedes eliminar al único líder del clan" }
		}

		const guild = client.guilds.cache.get(clan.guildId)
		if (!guild) {
			return { success: false, error: "Servidor no encontrado" }
		}

		const config = await ClanConfigModel.findOne({ guildId: clan.guildId })

		try {
			const member = await guild.members.fetch(userId).catch(() => null)

			if (member && config?.leaderRoleId) {
				await member.roles.remove(config.leaderRoleId)
			}

			clan.leaderIds = clan.leaderIds.filter((id) => id !== userId)
			await clan.save()

			clanLogger.info(`Líder eliminado: ${userId} del clan ${clan.name}`)

			botEvents.emit("clan:leaderRemoved", {
				guildId: clan.guildId,
				clanId,
				clanName: clan.name,
				leaderId: userId,
				removedBy
			})

			return { success: true }
		} catch (error) {
			clanLogger.error("Error eliminando líder:", error)
			return { success: false, error: "Error al eliminar líder" }
		}
	}

	private async validateExtraVoiceChannel (
		clanId: string
	): Promise<{
		success: boolean
		error?: string
		clan?: IClan
		config?: IClanConfig
		guild?: Guild
	}> {
		const client = BotInstance.get()
		if (!client) {
			return { success: false, error: "Cliente de Discord no disponible" }
		}

		const clan = await ClanModel.findById(clanId)
		if (!clan) {
			return { success: false, error: "Clan no encontrado" }
		}

		const config = await ClanConfigModel.findOne({ guildId: clan.guildId })
		if (!config) {
			return { success: false, error: "Configuración de clanes no encontrada" }
		}

		const validationError = this.validateExtraChannel(clan)
		if (validationError) {
			return { success: false, error: validationError }
		}

		const guild = client.guilds.cache.get(clan.guildId)
		if (!guild) {
			return { success: false, error: "Servidor no encontrado" }
		}

		return { success: true, clan, config, guild }
	}

	private async createExtraVoiceChannel (
		guild: Guild,
		clan: IClan,
		config: IClanConfig
	): Promise<string> {
		const categoryVoice = guild.channels.cache.get(config.categoryVoiceId) as CategoryChannel
		if (!categoryVoice) {
			throw new Error("Categoría de clanes no encontrada")
		}

		const role = guild.roles.cache.get(clan.roleId)
		if (!role) {
			throw new Error("Rol del clan no encontrado")
		}

		const channelNumber = clan.voiceChannelIds.length + 1
		const channelName = `${clan.icon} ${clan.name} #${channelNumber}`
		const voicePerms = getChannelPermissions("voice", config.leaderRoleId, guild.id, role.id)
		const lastVoiceChannel = guild.channels.cache.get(
			clan.voiceChannelIds[clan.voiceChannelIds.length - 1]
		) as VoiceChannel | undefined

		const voiceChannel = await guild.channels.create({
			name: channelName,
			type: ChannelType.GuildVoice,
			parent: categoryVoice.id,
			permissionOverwrites: voicePerms
		})
		if (lastVoiceChannel) {
			voiceChannel.setPosition(lastVoiceChannel.position + 1)
		}

		return voiceChannel.id
	}

	private async validateAddMember (
		clan: IClan,
		userId: string
	): Promise<string | null> {
		if (clan.members.includes(userId)) {
			return "El usuario ya es miembro del clan"
		}

		if (clan.members.length >= clan.maxMembers) {
			return `El clan ha alcanzado el límite de ${clan.maxMembers} miembros`
		}

		const userClan = await ClanModel.findOne({ guildId: clan.guildId, members: userId, isActive: true })
		if (userClan) {
			return "El usuario ya pertenece a otro clan"
		}

		return null
	}

	private async assignMemberRoles (params: {
		guild: Guild
		userId: string
		roleId: string
		additionalRoleIds?: string[]
	}): Promise<void> {
		const member = await params.guild.members.fetch(params.userId)
		const role = params.guild.roles.cache.get(params.roleId)

		if (role) {
			await member.roles.add(role)
		}

		if (params.additionalRoleIds && params.additionalRoleIds.length > 0) {
			for (const roleId of params.additionalRoleIds) {
				await member.roles.add(roleId).catch(() => null)
			}
		}
	}

	async addMember (clanId: string, userId: string, addedBy: string): Promise<{ success: boolean; error?: string }> {
		const client = BotInstance.get()
		if (!client) {
			return { success: false, error: "Cliente de Discord no disponible" }
		}

		const clan = await ClanModel.findById(clanId)
		if (!clan) {
			return { success: false, error: "Clan no encontrado" }
		}

		const config = await ClanConfigModel.findOne({ guildId: clan.guildId })
		if (!config) {
			return { success: false, error: "Configuración de clanes no encontrada" }
		}

		const validationError = await this.validateAddMember(clan, userId)
		if (validationError) {
			return { success: false, error: validationError }
		}

		const guild = client.guilds.cache.get(clan.guildId)
		if (!guild) {
			return { success: false, error: "Servidor no encontrado" }
		}

		try {
			await this.assignMemberRoles({
				guild,
				userId,
				roleId: clan.roleId,
				additionalRoleIds: config.additionalRoleIds
			})

			clan.members.push(userId)
			await clan.save()

			clanLogger.info(`Miembro añadido: ${userId} al clan ${clan.name}`)

			botEvents.emit("clan:memberAdded", {
				guildId: clan.guildId,
				clanId,
				clanName: clan.name,
				memberId: userId,
				addedBy
			})

			return { success: true }
		} catch (error) {
			clanLogger.error("Error añadiendo miembro:", error)
			return { success: false, error: "Error al añadir miembro" }
		}
	}

	private async removeMemberRoles (params: {
		guildId: string
		userId: string
		roleId: string
		leaderRoleId?: string
		additionalRoleIds?: string[]
	}): Promise<void> {
		const client = BotInstance.get()
		const guild = client?.guilds.cache.get(params.guildId)
		if (!guild) {return}

		const member = await guild.members.fetch(params.userId).catch(() => null)
		if (!member) {return}

		const role = guild.roles.cache.get(params.roleId)
		if (role) {
			await member.roles.remove(role)
		}

		if (params.leaderRoleId) {
			await member.roles.remove(params.leaderRoleId)
		}

		if (params.additionalRoleIds && params.additionalRoleIds.length > 0) {
			for (const additionalRoleId of params.additionalRoleIds) {
				await member.roles.remove(additionalRoleId).catch(() => null)
			}
		}
	}

	private validateExtraChannel (
		clan: IClan
	): string | null {
		if (clan.voiceChannelIds.length >= clan.maxVoiceChannels) {
			return `El clan ha alcanzado el límite de ${clan.maxVoiceChannels} canales de voz`
		}
		return null
	}

	private async validateRemoveMember (
		clanId: string,
		userId: string
	): Promise<{
		success: boolean
		error?: string
		clan?: IClan
		config?: IClanConfig
	}> {
		const client = BotInstance.get()
		if (!client) {
			return { success: false, error: "Cliente de Discord no disponible" }
		}

		const clan = await ClanModel.findById(clanId)
		if (!clan) {
			return { success: false, error: "Clan no encontrado" }
		}

		if (!clan.members.includes(userId)) {
			return { success: false, error: "El usuario no es miembro del clan" }
		}

		if (clan.leaderIds.includes(userId) && clan.leaderIds.length === 1) {
			return { success: false, error: "No puedes expulsar al único líder del clan" }
		}

		const guild = client.guilds.cache.get(clan.guildId)
		if (!guild) {
			return { success: false, error: "Servidor no encontrado" }
		}

		const config = await ClanConfigModel.findOne({ guildId: clan.guildId })
		return { success: true, clan, config: config || undefined }
	}

	async removeMember (
		clanId: string,
		userId: string,
		removedBy: string,
		isKick = false
	): Promise<{ success: boolean; error?: string }> {
		const validation = await this.validateRemoveMember(clanId, userId)
		if (!validation.success) {
			return { success: false, error: validation.error }
		}

		try {
			const { clan, config } = validation
			if (!clan) {return { success: false, error: "Error interno" }}

			const isLeader = clan.leaderIds.includes(userId)
			await this.removeMemberRoles({
				guildId: clan.guildId,
				userId,
				roleId: clan.roleId,
				leaderRoleId: isLeader ? config?.leaderRoleId : undefined,
				additionalRoleIds: config?.additionalRoleIds
			})

			clan.members = clan.members.filter((id) => id !== userId)
			clan.leaderIds = clan.leaderIds.filter((id) => id !== userId)
			await clan.save()

			clanLogger.info(`Miembro eliminado: ${userId} del clan ${clan.name}`)

			botEvents.emit(isKick ? "clan:memberKicked" : "clan:memberLeft", {
				guildId: clan.guildId,
				clanId,
				clanName: clan.name,
				memberId: userId,
				removedBy: removedBy || userId
			})

			return { success: true }
		} catch (error) {
			clanLogger.error("Error eliminando miembro:", error)
			return { success: false, error: "Error al eliminar miembro" }
		}
	}

	async addExtraVoiceChannel (
		clanId: string,
		addedBy: string
	): Promise<{ success: boolean; channelId?: string; error?: string }> {
		const validation = await this.validateExtraVoiceChannel(clanId)
		if (!validation.success) {
			return { success: false, error: validation.error }
		}

		try {
			const { clan, config, guild } = validation
			if (!clan || !config || !guild) {return { success: false, error: "Error interno" }}

			const channelId = await this.createExtraVoiceChannel(guild, clan, config)

			clan.voiceChannelIds.push(channelId)
			await clan.save()

			clanLogger.info(`Canal de voz extra creado para clan ${clan.name}`)

			botEvents.emit("clan:extraChannelAdded", {
				guildId: clan.guildId,
				clanId,
				clanName: clan.name,
				channelId,
				addedBy
			})

			return { success: true, channelId }
		} catch (error) {
			clanLogger.error("Error creando canal de voz extra:", error)
			const errorMessage = error instanceof Error ? error.message : "Error al crear canal de voz extra"
			return { success: false, error: errorMessage }
		}
	}

	async removeExtraVoiceChannel (
		clanId: string,
		channelId: string,
		removedBy: string
	): Promise<{ success: boolean; error?: string }> {
		const client = BotInstance.get()
		if (!client) {
			return { success: false, error: "Cliente de Discord no disponible" }
		}

		const clan = await ClanModel.findById(clanId)
		if (!clan) {
			return { success: false, error: "Clan no encontrado" }
		}

		if (!clan.voiceChannelIds.includes(channelId)) {
			return { success: false, error: "El canal no pertenece al clan" }
		}

		if (clan.voiceChannelIds.length === 1) {
			return { success: false, error: "No puedes eliminar el único canal de voz del clan" }
		}

		const guild = client.guilds.cache.get(clan.guildId)
		if (!guild) {
			return { success: false, error: "Servidor no encontrado" }
		}

		try {
			const channel = guild.channels.cache.get(channelId)
			if (channel) {
				await channel.delete()
			}

			clan.voiceChannelIds = clan.voiceChannelIds.filter((id) => id !== channelId)
			await clan.save()

			clanLogger.info(`Canal de voz extra eliminado del clan ${clan.name}`)

			botEvents.emit("clan:extraChannelRemoved", {
				guildId: clan.guildId,
				clanId,
				clanName: clan.name,
				channelId,
				removedBy
			})

			return { success: true }
		} catch (error) {
			clanLogger.error("Error eliminando canal de voz extra:", error)
			return { success: false, error: "Error al eliminar canal de voz extra" }
		}
	}

	async removeLastExtraVoiceChannel (
		clanId: string,
		removedBy: string
	): Promise<{ success: boolean; error?: string }> {
		const client = BotInstance.get()
		if (!client) {
			return { success: false, error: "Cliente de Discord no disponible" }
		}

		const clan = await ClanModel.findById(clanId)
		if (!clan) {
			return { success: false, error: "Clan no encontrado" }
		}

		if (clan.voiceChannelIds.length === 1) {
			return { success: false, error: "No puedes eliminar el único canal de voz del clan" }
		}

		const lastChannelId = clan.voiceChannelIds[clan.voiceChannelIds.length - 1]

		return this.removeExtraVoiceChannel(clanId, lastChannelId, removedBy)
	}

	private async validateInvitation (
		clan: IClan,
		userId: string,
		clanId: string
	): Promise<string | null> {
		if (clan.members.includes(userId)) {
			return "El usuario ya es miembro del clan"
		}

		if (clan.members.length >= clan.maxMembers) {
			return `El clan ha alcanzado el límite de ${clan.maxMembers} miembros`
		}

		const userClan = await ClanModel.findOne({ guildId: clan.guildId, members: userId, isActive: true })
		if (userClan) {
			return "El usuario ya pertenece a otro clan"
		}

		const existingInvitation = await ClanInvitationModel.findOne({
			clanId,
			invitedUserId: userId,
			status: ClanInvitationStatus.PENDING
		})

		if (existingInvitation) {
			return "Ya existe una invitación pendiente para este usuario"
		}

		return null
	}

	async createInvitation (params: {
		clanId: string
		userId: string
		invitedBy: string
	}): Promise<{ success: boolean; invitation?: IClanInvitation; error?: string }> {
		const clan = await ClanModel.findById(params.clanId)
		if (!clan) {
			return { success: false, error: "Clan no encontrado" }
		}

		const config = await ClanConfigModel.findOne({ guildId: clan.guildId })
		if (!config) {
			return { success: false, error: "Configuración de clanes no encontrada" }
		}

		const validationError = await this.validateInvitation(clan, params.userId, params.clanId)
		if (validationError) {
			return { success: false, error: validationError }
		}

		try {
			const expiresAt = new Date()
			expiresAt.setHours(expiresAt.getHours() + config.invitationExpirationHours)

			const invitation = await ClanInvitationModel.create({
				clanId: params.clanId,
				guildId: clan.guildId,
				invitedUserId: params.userId,
				invitedBy: params.invitedBy,
				status: ClanInvitationStatus.PENDING,
				expiresAt
			})

			clanLogger.info(`Invitación creada: usuario ${params.userId} al clan ${clan.name}`)

			botEvents.emit("clan:invitationCreated", {
				guildId: clan.guildId,
				clanId: params.clanId,
				clanName: clan.name,
				invitedUserId: params.userId,
				invitedBy: params.invitedBy,
				invitationId: invitation._id.toString()
			})

			return { success: true, invitation }
		} catch (error) {
			clanLogger.error("Error creando invitación:", error)
			return { success: false, error: "Error al crear la invitación" }
		}
	}

	async acceptInvitation (invitationId: string): Promise<{ success: boolean; error?: string }> {
		const invitation = await ClanInvitationModel.findById(invitationId)
		if (!invitation) {
			return { success: false, error: "Invitación no encontrada" }
		}

		if (invitation.status !== ClanInvitationStatus.PENDING) {
			return { success: false, error: "La invitación ya ha sido respondida" }
		}

		if (new Date() > invitation.expiresAt) {
			invitation.status = ClanInvitationStatus.EXPIRED
			await invitation.save()
			return { success: false, error: "La invitación ha expirado" }
		}

		const result = await this.addMember(
			invitation.clanId.toString(),
			invitation.invitedUserId,
			invitation.invitedBy
		)

		if (result.success) {
			invitation.status = ClanInvitationStatus.ACCEPTED
			invitation.respondedAt = new Date()
			await invitation.save()

			const clan = await ClanModel.findById(invitation.clanId)
			if (!clan) {
				return { success: false, error: "Clan no encontrado después de aceptar la invitación" }
			}

			botEvents.emit("clan:invitationAccepted", {
				guildId: invitation.guildId,
				clanId: invitation.clanId.toString(),
				clanName: clan.name,
				invitedUserId: invitation.invitedUserId,
				invitedBy: invitation.invitedBy,
				invitationId
			})
		}

		return result
	}

	async rejectInvitation (invitationId: string): Promise<{ success: boolean; error?: string }> {
		const invitation = await ClanInvitationModel.findById(invitationId)
		if (!invitation) {
			return { success: false, error: "Invitación no encontrada" }
		}

		if (invitation.status !== ClanInvitationStatus.PENDING) {
			return { success: false, error: "La invitación ya ha sido respondida" }
		}

		invitation.status = ClanInvitationStatus.REJECTED
		invitation.respondedAt = new Date()
		await invitation.save()

		const clan = await ClanModel.findById(invitation.clanId)
		if (!clan) {
			return { success: false, error: "Clan no encontrado después de rechazar la invitación" }
		}

		clanLogger.info(`Invitación rechazada: ${invitationId}`)

		botEvents.emit("clan:invitationRejected", {
			guildId: invitation.guildId,
			clanId: invitation.clanId.toString(),
			clanName: clan.name,
			invitedUserId: invitation.invitedUserId,
			invitedBy: invitation.invitedBy,
			invitationId
		})

		return { success: true }
	}

	async cancelInvitation (invitationId: string): Promise<void> {
		const invitation = await ClanInvitationModel.findById(invitationId)
		if (!invitation) {
			return
		}

		invitation.status = ClanInvitationStatus.CANCELED
		invitation.respondedAt = new Date()
		await invitation.save()
	}

	async getClanByMember (guildId: string, userId: string): Promise<IClan | null> {
		return await ClanModel.findOne({ guildId, members: userId, isActive: true })
	}

	async getClanById (clanId: string): Promise<IClan | null> {
		return await ClanModel.findById(clanId)
	}

	async getClanByRole (guildId: string, roleId: string): Promise<IClan | null> {
		return await ClanModel.findOne({ guildId, roleId, isActive: true })
	}

	async getGuildClans (guildId: string): Promise<IClan[]> {
		return await ClanModel.find({ guildId, isActive: true }).sort({ createdAt: -1 })
	}

	async getAllClanRoles (guildId: string): Promise<string[]> {
		const clans = await ClanModel.find({ guildId }, { roleId: 1 })
		return clans.map((clan) => clan.roleId)
	}

	async getConfig (guildId: string) {
		return await ClanConfigModel.findOne({ guildId })
	}

	async updateClanConfig (params: {
		clanId: string
		maxMembers?: number
		maxVoiceChannels?: number
		roleColor?: number
	}): Promise<{ success: boolean; clan?: IClan; error?: string }> {
		try {
			const clan = await ClanModel.findById(params.clanId)
			if (!clan) {
				return { success: false, error: "Clan no encontrado" }
			}

			if (params.maxMembers !== undefined) {
				clan.maxMembers = params.maxMembers
			}
			if (params.maxVoiceChannels !== undefined) {
				clan.maxVoiceChannels = params.maxVoiceChannels
			}
			if (params.roleColor !== undefined) {
				clan.roleColor = params.roleColor

				const client = BotInstance.get()
				const guild = client?.guilds.cache.get(clan.guildId)
				if (guild) {
					const role = guild.roles.cache.get(clan.roleId)
					if (role && params.roleColor !== null) {
						await role.setColors({ primaryColor: params.roleColor }).catch((e) => {
							clanLogger.error("Error actualizando color del rol:", e)
						})
					}
				}
			}

			await clan.save()

			clanLogger.info(`Configuración actualizada para clan ${clan.name}`)

			return { success: true, clan }
		} catch (error) {
			clanLogger.error("Error actualizando configuración del clan:", error)
			return { success: false, error: "Error al actualizar la configuración del clan" }
		}
	}

	async setClanConfig (params: Omit<IClanConfig,
		keyof Document |"color" | "createdAt" | "enabled" | "additionalRoleIds" | "updatedAt">
		& {colorHex?: string | null}): Promise<IClanConfig> {
		const {
			guildId,
			categoryTextId,
			categoryVoiceId,
			leaderRoleId,
			invitationExpirationHours,
			maxExtraVoiceChannels,
			maxMembers,
			colorHex } = params
		return await ClanConfigModel.findOneAndUpdate(
			{ guildId: params.guildId },
			{
				guildId,
				enabled: true,
				leaderRoleId,
				categoryVoiceId,
				categoryTextId,
				color: colorHex ? parseInt(colorHex, 16) : null,
				maxMembers,
				maxExtraVoiceChannels,
				invitationExpirationHours
			},
			{ upsert: true, new: true }
		)
	}

	async getAllClans (guildId: string, deleted = false): Promise<IClan[]> {
		return ClanModel.find({
			guildId,
			isActive: !deleted
		}).sort({ createdAt: -1 })
	}

	async getClanByChannelId (guildId: string, channelId:string): Promise<IClan | null> {
		return ClanModel.findOne({
			guildId,
			textChannelIds: channelId,
			isActive: true
		})
	}
}
