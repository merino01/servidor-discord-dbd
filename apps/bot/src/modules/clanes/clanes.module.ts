import { Module } from "@/core/decorators/module.decorator"
import { ClanCommand } from "./slash-commands/clan.command"
import { ClanModCommand } from "./slash-commands/clan-mod.command"
import { ClanStatsCommand } from "./slash-commands/clan-stats.command"
import { ClanAdminCommand } from "./slash-commands/clan-admin.command"

@Module({
	providers: [],
	commands: [ClanCommand, ClanModCommand, ClanStatsCommand, ClanAdminCommand]
})
export class ClanesModule {}
