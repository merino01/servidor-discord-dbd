import { registerSubCommand, registerSubCommandGroup } from "@/core/command-register"
import { ClanCommand } from "./clan.command"
import { OptionType } from "@/core/types"

registerSubCommandGroup(ClanCommand, {
	name: "lider",
	description: "Comandos para líderes de clan"
})

registerSubCommand(ClanCommand, "invitar", {
	group: "lider",
	name: "invitar",
	description: "Invitar a un mimebro al clan",
	options: [
		{
			name: "usuario",
			description: "Usuario a invitar al clan",
			type: OptionType.USER,
			required: true
		}
	]
})

registerSubCommand(ClanCommand, "expulsar", {
	group: "lider",
	name: "expulsar",
	description: "Expulsar a un mimebro del clan",
	options: [
		{
			name: "usuario",
			description: "Usuario a expulsar del clan",
			type: OptionType.USER,
			required: true
		}
	]
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
