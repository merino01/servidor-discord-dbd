import {
	ButtonInteraction,
	StringSelectMenuInteraction,
	ModalSubmitInteraction
} from "discord.js"

/**
 * Handler para botones
 */
export type ButtonHandler = (interaction: ButtonInteraction) => Promise<void>

/**
 * Handler para select menus
 */
export type SelectMenuHandler = (interaction: StringSelectMenuInteraction) => Promise<void>

/**
 * Handler para modales
 */
export type ModalHandler = (interaction: ModalSubmitInteraction) => Promise<void>

/**
 * Contexto de componente (puede extenderse en el futuro)
 */
export interface ComponentContext {
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction;
}
