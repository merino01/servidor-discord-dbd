import { CronJob } from "cron"
import { BotInstance } from "@/core/bot-instance"
import { ClanService } from "../services/clan.service"
import { getConfig } from "@/core/config"
import { botLogger } from "@/core/logger"

const cronLogger = botLogger.child("cron")

async function ajustMemberRolesCron () {
	cronLogger.info("Ejecutando cron: ajustMemberRolesCron")

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

	for (const member of members.values()) {
		const userRoles = member.roles.cache
		const dbClan = await clanService.getClanByMember(guild.id, member.id)
		const hasClanRole = userRoles.some((role) => clanRoles.includes(role.id))

		if (dbClan && !hasClanRole) {
			await clanService.addMember(dbClan._id.toString(), member.id, "system")
			continue
		} else if (!dbClan && hasClanRole) {
			await member.roles.remove(clanRoles, "El usuario no pertenece a ningún clan en la base de datos")
			continue
		}

	}

}

new CronJob("0 0 0 * * *", ajustMemberRolesCron, null, true, "Europe/Madrid")
