import { Module } from "@/core/decorators/module.decorator"
import { WelcomeMessageListener } from "./listeners/join-server.listener"
import { WelcomeMessageCommand } from "./slash-commands/welcome-message.command"

@Module({
	commands:[WelcomeMessageCommand],
	providers: [WelcomeMessageListener]
})
export class WelcomeMessageModule{}
