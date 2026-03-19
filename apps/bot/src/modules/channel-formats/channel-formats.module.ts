import { Module } from "@core/decorators/module.decorator"
import { FormatCommand } from "./slash-commands/format.command"
import { MessageFormatListener } from "./listeners/message-format.listener"
import { FormatSelectComponent } from "./components/format-select"

@Module({
	commands: [FormatCommand],
	providers: [MessageFormatListener, FormatSelectComponent]
})
export class ChannelFormatsModule {}
