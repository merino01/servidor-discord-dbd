import { Message, PartialMessage } from "discord.js"
import { logger } from "@org/logger"
import { TriggerModel, TriggerMatchType } from "@org/mongo"
import { botEvents } from "@/core/events/bot-events"

const triggersLogger = logger.child("triggers")

export class TriggerListener {
	private matchExact (content: string, triggerText: string, caseSensitive: boolean): boolean {
		const testContent = caseSensitive ? content : content.toLowerCase()
		const testTrigger = caseSensitive ? triggerText : triggerText.toLowerCase()
		return testContent.trim() === testTrigger.trim()
	}

	private matchContains (content: string, triggerText: string, caseSensitive: boolean): boolean {
		const testContent = caseSensitive ? content : content.toLowerCase()
		const testTrigger = caseSensitive ? triggerText : triggerText.toLowerCase()
		return testContent.includes(testTrigger)
	}

	private matchStartsWith (content: string, triggerText: string, caseSensitive: boolean): boolean {
		const testContent = caseSensitive ? content : content.toLowerCase()
		const testTrigger = caseSensitive ? triggerText : triggerText.toLowerCase()
		return testContent.startsWith(testTrigger)
	}

	private matchEndsWith (content: string, triggerText: string, caseSensitive: boolean): boolean {
		const testContent = caseSensitive ? content : content.toLowerCase()
		const testTrigger = caseSensitive ? triggerText : triggerText.toLowerCase()
		return testContent.endsWith(testTrigger)
	}

	private matchWord (content: string, triggerText: string, caseSensitive: boolean): boolean {
		const testTrigger = caseSensitive ? triggerText : triggerText.toLowerCase()
		const escaped = testTrigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		const flags = caseSensitive ? "" : "i"
		const regex = new RegExp(`\\b${escaped}\\b`, flags)
		return regex.test(content)
	}

	private matchRegex (content: string, trigger: any): boolean {
		try {
			const flags = trigger.regexFlags || (trigger.caseSensitive ? "" : "i")
			const regex = new RegExp(trigger.regexPattern || trigger.trigger, flags)
			return regex.test(content)
		} catch (error) {
			triggersLogger.error(`Regex inválida en trigger ${trigger._id}:`, error)
			return false
		}
	}

	private matchesTrigger (content: string, trigger: any): boolean {
		const { matchType, trigger: triggerText, caseSensitive } = trigger

		switch (matchType) {
		case TriggerMatchType.EXACT:
			return this.matchExact(content, triggerText, caseSensitive)
		case TriggerMatchType.CONTAINS:
			return this.matchContains(content, triggerText, caseSensitive)
		case TriggerMatchType.STARTS_WITH:
			return this.matchStartsWith(content, triggerText, caseSensitive)
		case TriggerMatchType.ENDS_WITH:
			return this.matchEndsWith(content, triggerText, caseSensitive)
		case TriggerMatchType.WORD:
			return this.matchWord(content, triggerText, caseSensitive)
		case TriggerMatchType.REGEX:
			return this.matchRegex(content, trigger)
		default:
			return false
		}
	}

	private filterTriggersByChannel (triggers: any[], channelId: string): any[] {
		return triggers.filter((trigger) => {
			if (trigger.channels.length === 0) {return true}
			const isInList = trigger.channels.includes(channelId)
			return trigger.excludeChannels ? !isInList : isInList
		})
	}

	private async deleteOriginalMessage (message: Message): Promise<void> {
		try {
			await message.delete()
		} catch (error) {
			triggersLogger.warn(`No se pudo eliminar el mensaje: ${error}`)
		}
	}

	private async handleTriggerActivation (message: Message, trigger: any): Promise<void> {
		await message.reply(trigger.response)

		trigger.usageCount++
		await trigger.save()

		if (trigger.deleteOriginalMessage) {
			await this.deleteOriginalMessage(message)
		}

		const serverLog = `Servidor: ${message.guild?.name} (${message.guildId})`
		const userLog = `Usuario: ${message.author.tag}`
		const canalLog = `Canal: ${message.channel.id}`
		triggersLogger.info(
			`Trigger activado: "${trigger.trigger}" | ${serverLog} | ${userLog} | ${canalLog}`
		)
	}

	private async processMessageTriggers (message: Message): Promise<void> {
		const triggers = await TriggerModel.find({
			guildId: message.guildId,
			isActive: true
		})

		if (triggers.length === 0) { return }

		const validTriggers = this.filterTriggersByChannel(triggers, message.channelId)

		for (const trigger of validTriggers) {
			if (this.matchesTrigger(message.content, trigger)) {
				await this.handleTriggerActivation(message, trigger)
				break
			}
		}
	}

	register (): void {
		botEvents.on("message:created", async (message: Message) => {
			if (message.author.bot || !message.guildId) { return }
			try {
				await this.processMessageTriggers(message)
			} catch (error) {
				triggersLogger.error("Error verificando triggers:", error)
			}
		})

		botEvents.on("message:edited", async (
			oldMessage: Message | PartialMessage,
			newMessage: Message | PartialMessage) => {
			if (newMessage.author?.bot || !newMessage.guildId) { return }
			try {
				await this.processMessageTriggers(newMessage as Message)
			} catch (error) {
				triggersLogger.error("Error verificando triggers en mensaje editado:", error)
			}
		})
	}
}
