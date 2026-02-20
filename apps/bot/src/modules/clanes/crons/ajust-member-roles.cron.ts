import { BotInstance } from "@/core/bot-instance"
import { ClanService } from "../services/clan.service"
import { getConfig } from "@/core/config"
import { scheduleCronJob } from "@/core/schedule-cron-job"
import { Collection, GuildMember, Role } from "discord.js"
import { IClan } from "@org/mongo"

async function ajustMemberRolesCron () {
	const bot = BotInstance.getOrNull()
	if (!bot) {
		return
	}

	const config = getConfig()
	const guild = bot.guilds.cache.get(config.discord.guildId)
	if (!guild) {
		return
	}

	const clanService = ClanService.getInstance()
	const members = await guild.members.fetch()
	const clanRoles = await clanService.getAllClanRoles(guild.id)
	const clanConfig = await clanService.getConfig(guild.id)
	const additionalRoles = clanConfig?.additionalRoleIds ?? []

	for (const member of members.values()) {
		const userRoles = member.roles.cache
		const dbClan = await clanService.getClanByMember(guild.id, member.id)
		const hasClanRole = userRoles.some((role) => clanRoles.includes(role.id))

		await ajustRolesFromMember({ member, clanService, clanRoles, additionalRoles, dbClan, hasClanRole, userRoles })
	}
}

async function ajustRolesFromMember ({
	member,
	clanRoles,
	additionalRoles,
	dbClan,
	hasClanRole,
	userRoles
}: {
	member: GuildMember,
	clanService: ClanService,
	clanRoles: string[],
	additionalRoles: string[],
	dbClan: IClan | null,
	hasClanRole: boolean,
	userRoles: Collection<string, Role>
}) {
	// Si está en la BD pero no tiene el rol del clan, se le pone el rol del clan
	if (dbClan && !hasClanRole) {
		await member.roles.add(dbClan.roleId, "Agregar rol de clan porque está en la BD")
	}
	// Si tiene el rol de clan pero no está en la BD, se le quita el rol de clan
	if (!dbClan && hasClanRole) {
		await member.roles.remove(clanRoles, "Quitar rol de clan porque no está en la BD")
	}

	// Roles adicionales
	if (dbClan) {
		// Si está en algún clan y no tiene los roles adicionales, se le ponen
		const rolesToAdd = additionalRoles.filter((roleId) => !userRoles.has(roleId))
		if (rolesToAdd.length > 0) {
			await member.roles.add(rolesToAdd, "Agregar roles adicionales porque está en clan")
		}
	} else {
		// Si no está en ningún clan pero tiene algún rol adicional, se le quita
		const rolesToRemove = additionalRoles.filter((roleId) => userRoles.has(roleId))
		if (rolesToRemove.length > 0) {
			await member.roles.remove(rolesToRemove, "Quitar roles adicionales porque no está en clan")
		}
	}
}

scheduleCronJob("0 0 0 * * *", ajustMemberRolesCron, "AjustarMiembrosYRolesDeClan")
