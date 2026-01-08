import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@core/decorators/command.decorators"
import { CommandContext } from "@types"
import { PermissionFlagsBits } from "discord.js"

/**
 * Comando /trigger con subcomandos: crear, listar, eliminar
 * Ejemplo de uso:
 * - /trigger crear
 * - /trigger listar
 * - /trigger eliminar
 */
export class TriggerCommand extends BaseCommand {

	async crear (context: CommandContext): Promise<void> {
		const { interaction } = context

		// Aquí irá tu lógica de creación de triggers
		await interaction.reply({
			content: "✅ **Creando trigger...**\nEsta es la funcionalidad de crear trigger.",
			ephemeral: true
		})
	}

	async listar (context: CommandContext): Promise<void> {
		const { interaction } = context

		// Aquí irá tu lógica de listado de triggers
		await interaction.reply({
			content: "📋 **Lista de triggers:**\n• Trigger 1\n• Trigger 2\n• Trigger 3",
			ephemeral: true
		})
	}

	async eliminar (context: CommandContext): Promise<void> {
		const { interaction } = context

		// Aquí irá tu lógica de eliminación de triggers
		await interaction.reply({
			content: "🗑️ **Eliminando trigger...**\nTrigger eliminado correctamente.",
			ephemeral: true
		})
	}
}

// Registrar el comando
registerCommand(TriggerCommand, {
	name: "trigger",
	description: "Gestiona los triggers del servidor",
	permissions: PermissionFlagsBits.ManageGuild,
	guildOnly: true
})

// Registrar subcomandos
const proto = TriggerCommand.prototype
registerSubCommand(proto, "crear", { name: "crear", description: "Crea un nuevo trigger" })
registerSubCommand(proto, "listar", { name: "listar", description: "Lista todos los triggers del servidor" })
registerSubCommand(proto, "eliminar", { name: "eliminar", description: "Elimina un trigger existente" })
