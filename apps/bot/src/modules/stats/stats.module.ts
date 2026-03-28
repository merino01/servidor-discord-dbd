import { Module } from "@/core/decorators/module.decorator"
import { StatsCommand } from "./slash-commands/stats.command"
import { RankingButtonListener } from "./listeners/ranking-buttons.listener"
import { StatsTrakingListener } from "./listeners/stats-tracking.listener"

@Module({
	commands: [StatsCommand],
	providers: [RankingButtonListener, StatsTrakingListener]
})
export class StatsModule {}
