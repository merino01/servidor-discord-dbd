import { BotInstance } from "@/core/bot-instance"
import { getConfig } from "@/core/config"
import { Injectable } from "@/core/container"
import { scheduleCronJob } from "@/core/schedule-cron-job"
import { IClan } from "@org/mongo"
import { Collection, GuildMember, Role } from "discord.js"
import { ClanRepository } from "../repositories/clan.repository"

@Injectable(ClanRepository)
export class AjusMemberRolesCron {
	constructor (private readonly repository: ClanRepository){}

	private async ajustMemberRolesCron () {
		const bot = BotInstance.getOrNull()
		if (!bot) {
			return
		}

		const config = getConfig()
		const guild = bot.guilds.cache.get(config.discord.guildId)
		if (!guild) {
			return
		}

		const members = await guild.members.fetch()
		const clanRoles = await this.repository.getAllClanRoles(guild.id)
		const clanConfig = await this.repository.getConfig(guild.id)
		const additionalRoles = clanConfig?.additionalRoleIds ?? []

		for (const member of members.values()) {
			const userRoles = member.roles.cache
			const dbClan = await this.repository.getClanByMember(guild.id, member.id)
			const hasClanRole = userRoles.some((role) => clanRoles.includes(role.id))

			await this.ajustRolesFromMember({ member, clanRoles, additionalRoles, dbClan, hasClanRole, userRoles })
		}
	}

	private async ajustRolesFromMember ({
		member,
		clanRoles,
		additionalRoles,
		dbClan,
		hasClanRole,
		userRoles
	}: {
	member: GuildMember,
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

	register () {
		scheduleCronJob("0 0 0 * * *", this.ajustMemberRolesCron, "AjustarMiembrosYRolesDeClan")
	}
}
