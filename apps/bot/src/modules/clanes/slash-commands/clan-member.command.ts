import { registerSubCommand } from "@/core/command-register"
import { ClanCommand } from "./clan.command"

registerSubCommand(ClanCommand, "salir", {
	name: "salir",
	description: "Salir de tu clan actual"
})
