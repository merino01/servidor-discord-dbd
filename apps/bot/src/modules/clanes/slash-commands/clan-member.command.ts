import { registerSubCommand } from "@core/decorators/command.decorators"
import { ClanCommand } from "./clan.command"

registerSubCommand(ClanCommand, "salir", {
	name: "salir",
	description: "Salir de tu clan actual"
})
