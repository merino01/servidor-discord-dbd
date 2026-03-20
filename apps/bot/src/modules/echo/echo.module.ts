import { Module } from "@/core/decorators/module.decorator"
import { EchoCommand } from "./slash-commands/echo.command"
import "./components/echo-modal"

@Module({
	commands: [EchoCommand]
})
export class EchoModule{}
