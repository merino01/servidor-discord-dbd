import { Module } from "@/core/decorators/module.decorator"
import { NotificatorCommand } from "./slash-commands/user-mention.command"
import { NotificatorListener } from "./events/user-mention-detect"

@Module({
	commands: [NotificatorCommand],
	providers: [NotificatorListener]
})
export class NotificationModule {}
