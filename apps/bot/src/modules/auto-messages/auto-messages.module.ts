import { Module } from "@/core/decorators/module.decorator"
import { AutoMessageCommand } from "./slash-commands/auto-message.command"
import { AutoMessageRepository } from "./repositories/auto-messages.repository"
import { ChannelCreateListener } from "./listeners/channel-create.listener"

// TODO: Cambiarlo a su archivo específico
class InitializeAutoMessages {
	register (): void {
		const service = AutoMessageRepository.getInstance()
		service.initialize().catch((error) => {
			console.error("Error al inicializar servicio de mensajes automáticos: ", error)
		})
	}
}
@Module({
	commands: [AutoMessageCommand],
	providers: [InitializeAutoMessages, ChannelCreateListener]
})
export class AutomessagesModule{
}

