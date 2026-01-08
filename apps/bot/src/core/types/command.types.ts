import {
	SlashCommandBuilder,
	ChatInputCommandInteraction
} from "discord.js"

/**
 * Contexto de ejecución de un comando
 */
export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  // Puedes agregar más propiedades aquí (db, cache, etc.)
}

/**
 * Opciones para definir un comando slash
 */
export interface SlashCommandOptions {
  name: string;
  description: string;
  permissions?: bigint | number | null;
  guildOnly?: boolean;
  ownerOnly?: boolean;
}

/**
 * Opciones para definir un subcomando
 */
export interface SubCommandOptions {
  name: string;
  description: string;
}

/**
 * Opciones para definir un grupo de subcomandos
 */
export interface SubCommandGroupOptions {
  name: string;
  description: string;
}

/**
 * Interfaz que debe implementar cualquier comando
 */
export interface ICommand {
  data: SlashCommandBuilder;
  execute(context: CommandContext): Promise<void>;
}

/**
 * Metadata de un subcomando
 */
export interface SubCommandMetadata {
  name: string;
  description: string;
  group?: string;
  handler: (context: CommandContext) => Promise<void>;
  methodName: string | symbol;
}

/**
 * Metadata de un grupo de subcomandos
 */
export interface SubCommandGroupMetadata {
  name: string;
  description: string;
}
