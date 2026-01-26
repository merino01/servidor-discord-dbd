/* import { BaseCommand } from "@/core/base/base-command"
import { registerSubCommand } from "@core/decorators/command.decorators"
import { CommandContext, OptionType } from "@types"
import { EmbedBuilder, MessageFlags } from "discord.js"
import { botLogger } from "@/core/logger"
import { ClanService } from "../services/clan.service"
import { ClanCommand } from "./clan.command"

const clanLogger = botLogger.child("clanes")

export class ClanLeaderCommand extends ClanCommand {
	private service = ClanService.getInstance()

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

	// Aquí irán los comandos de líder:
	// - invitar
	// - expulsar (diferente del mod, solo para su clan)
	// - info (solo para su clan)
	// - miembros
	// Aquí irán los registerSubCommand(ClanCommand, ...)
}
*/
