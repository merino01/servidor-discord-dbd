import { registerSubCommand } from "@/core/command-register"
import { ClanCommand } from "./clan.command"
import { OptionType } from "@/core/types"

registerSubCommand(ClanCommand, "salir", {
	name: "salir",
	description: "Salir de tu clan actual"
})

registerSubCommand(ClanCommand, "invitar", {
	name: "invitar",
	description: "Invitar a un miembro al clan",
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
	name: "expulsar",
	description: "Expulsar a un miembro del clan",
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
	name: "info",
	description: "Ver informacion del clan"
})

registerSubCommand(ClanCommand, "miembros", {
	name: "miembros",
	description: "Ver miembros del clan"
})
