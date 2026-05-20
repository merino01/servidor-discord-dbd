import { Module } from "@/core/decorators/module.decorator"
import { CommandLogsListener } from "./listeners/command-logs.listener"
import { MemberLogsListener } from "./listeners/member-logs.listener"
import { MessageLogsListener } from "./listeners/message-logs.listener"
import { VoiceLogsListener } from "./listeners/voice-logs.listener"
import { LogsCommand } from "./slash-commands/logs.command"
import { ClanLogsListener } from "./listeners/clan-logs.listener"

@Module({
	commands: [LogsCommand],
	providers: [MemberLogsListener, VoiceLogsListener, MessageLogsListener, CommandLogsListener, ClanLogsListener]
})
export class LogsModule {}
