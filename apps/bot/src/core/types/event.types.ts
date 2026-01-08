import { ClientEvents } from "discord.js"

/**
 * Tipo genérico para handlers de eventos
 */
export type EventHandler<K extends keyof ClientEvents> = (
  ...args: ClientEvents[K]
) => Promise<void> | void;

/**
 * Metadata de un evento registrado
 */
export interface EventMetadata<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  handler: EventHandler<K>;
  once?: boolean;
  module?: string;
}
