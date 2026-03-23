import { Module } from "@/core/decorators/module.decorator"
import { TriggerCommand } from "./slash-commands/trigger.command"
import { TriggerListener } from "./events/chech-trigger"
import { triggerSelectComponent } from "./components/trigger-select"

@Module({
	commands: [TriggerCommand],
	providers: [TriggerListener, triggerSelectComponent]
})
export class TriggersModule {}
