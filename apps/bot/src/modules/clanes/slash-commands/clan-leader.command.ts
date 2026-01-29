import { registerSubCommand, registerSubCommandGroup } from "@/core/command-register"
import { ClanCommand } from "./clan.command"

registerSubCommandGroup(ClanCommand, {
	name: "lider",
	description: "Comandos para líderes de clan"
})

registerSubCommand(ClanCommand, "invitar", {
	group: "lider",
	name: "invitar",
	description: "Invitar a un mimebro al clan"
})

registerSubCommand(ClanCommand, "expulsar", {
	group: "lider",
	name: "expulsar",
	description: "Expulsar a un mimebro del clan"
})

registerSubCommand(ClanCommand, "info", {
	group: "lider",
	name: "info",
	description: "Ver informacion del clan"
})

registerSubCommand(ClanCommand, "miembros", {
	group: "lider",
	name: "miembros",
	description: "Ver miembros del clan"
})
