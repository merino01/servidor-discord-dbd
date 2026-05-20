import { Module } from "@/core/decorators/module.decorator"
import { RandomChannelCommand } from "./slash-command/random-channel.command"
import { RandomChannelListener } from "./listeners/channel-join"

@Module({
	commands:[RandomChannelCommand],
	providers:[RandomChannelListener]
})
export class RandomChannelModule{}
