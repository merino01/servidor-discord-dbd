import { Module } from "@/core/decorators/module.decorator"
import { EchoCommand } from "./slash-commands/echo.command"
import { EchoModalComponent } from "./components/echo-modal"

@Module({
	commands: [EchoCommand],
	providers: [EchoModalComponent]
})
export class EchoModule{}
