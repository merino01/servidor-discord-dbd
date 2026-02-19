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
	clanService,
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
	if (dbClan && !hasClanRole) {
		await clanService.addMember(dbClan._id.toString(), member.id, "system")
	} else if (!dbClan && hasClanRole) {
		await member.roles.remove(clanRoles, "El usuario no pertenece a ningún clan en la base de datos")
	}

	if (dbClan) {
		const rolesToAdd = additionalRoles.filter((roleId) => !userRoles.has(roleId))
		const rolesToRemove = additionalRoles.filter((roleId) => userRoles.has(roleId))
		if (rolesToAdd.length > 0) {
			await member.roles.add(rolesToAdd, "Agregar roles adicionales de clan")
		}
		if (rolesToRemove.length > 0) {
			await member.roles.remove(rolesToRemove, "Eliminar roles adicionales de clan")
		}
	}
}

scheduleCronJob("0 0 0 * * *", ajustMemberRolesCron, "AjustarMiembrosYRolesDeClan")
