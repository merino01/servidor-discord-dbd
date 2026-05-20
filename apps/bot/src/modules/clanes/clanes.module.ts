import { Module } from "@/core/decorators/module.decorator"
import { ClanCommand } from "./slash-commands/clan.command"
import { ClanModCommand } from "./slash-commands/clan-mod.command"
import { ClanStatsCommand } from "./slash-commands/clan-stats.command"
import { ClanAdminCommand } from "./slash-commands/clan-admin.command"
import { ClanConfigCommand } from "./slash-commands/clan-config.command"
import { ClanMessageListener } from "./listeners/clan-message.listener"
import { ClanVoiceListener } from "./listeners/clan-voice.listener"
import { InvitationAcceptedListener } from "./listeners/invitation-accepted.listener"
import { InvitationRejectedListener } from "./listeners/invitation-rejected.listener"
import { MemberLeaveEvent } from "./events/member-leave"
import { ClanInvitationButton } from "./components/clan-invitation.button"
import { ClanSelectButton } from "./components/clan-select"
import { ClanStatsRefreshButton } from "./components/clan-stats-refresh.button"
import { AjusMemberRolesCron } from "./crons/ajust-member-roles.cron"
import { ClanStatsCron } from "./crons/clan-stats-cron"
import { CleanOldStatsCron } from "./crons/clean-old-stats.cron"

@Module({
	providers: [
		ClanMessageListener,
		ClanVoiceListener,
		InvitationAcceptedListener,
		InvitationRejectedListener,
		MemberLeaveEvent,
		ClanInvitationButton,
		ClanSelectButton,
		ClanStatsRefreshButton,
		AjusMemberRolesCron,
		ClanStatsCron,
		CleanOldStatsCron
	],
	commands: [ClanCommand, ClanModCommand, ClanStatsCommand, ClanAdminCommand, ClanConfigCommand]
})
export class ClanesModule {}
