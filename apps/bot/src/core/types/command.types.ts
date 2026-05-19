import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	ApplicationCommandOption,
	InteractionReplyOptions
} from "discord.js"

/**
 * Contexto de ejecución de un comando
 */
export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  // Puedes agregar más propiedades aquí (db, cache, etc.)
}

/**
 * Tipos de opciones para comandos
 */
export enum OptionType {
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
  NUMBER = 10
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
  options?: ApplicationCommandOption[];
}

/**
 * Opciones para definir un subcomando
 */
export interface SubCommandOptions {
  name: string;
  description: string;
  options?: ApplicationCommandOption[];
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

/**
 * Tipo para las respuestas de las funciones de los servicios
 */

export type CommandReply<T = Record<string, unknown>> = Omit<InteractionReplyOptions, "flags"> & T

