import "./slash-commands/auto-message.command"
import "./listeners/channel-create.listener"
import "./components/auto-message-select"
import { AutoMessageService } from "./services/auto-message.service"

const service = AutoMessageService.getInstance()
service.initialize().catch((error) => {
	console.error("Error al inicializar servicio de mensajes automáticos:", error)
})
