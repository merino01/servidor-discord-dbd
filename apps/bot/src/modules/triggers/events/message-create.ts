import { Events, Message } from "discord.js"
import { registerEvent } from "@/core/event-registry"
import { logger } from "@org/logger"
import { TriggerModel, TriggerMatchType } from "@org/mongo"

const triggersLogger = logger.child("triggers")

function matchExact (content: string, triggerText: string, caseSensitive: boolean): boolean {
	const testContent = caseSensitive ? content : content.toLowerCase()
	const testTrigger = caseSensitive ? triggerText : triggerText.toLowerCase()
	return testContent.trim() === testTrigger.trim()
}

function matchContains (content: string, triggerText: string, caseSensitive: boolean): boolean {
	const testContent = caseSensitive ? content : content.toLowerCase()
	const testTrigger = caseSensitive ? triggerText : triggerText.toLowerCase()
	return testContent.includes(testTrigger)
}

function matchStartsWith (content: string, triggerText: string, caseSensitive: boolean): boolean {
	const testContent = caseSensitive ? content : content.toLowerCase()
	const testTrigger = caseSensitive ? triggerText : triggerText.toLowerCase()
	return testContent.startsWith(testTrigger)
}

function matchEndsWith (content: string, triggerText: string, caseSensitive: boolean): boolean {
	const testContent = caseSensitive ? content : content.toLowerCase()
	const testTrigger = caseSensitive ? triggerText : triggerText.toLowerCase()
	return testContent.endsWith(testTrigger)
}

function matchWord (content: string, triggerText: string, caseSensitive: boolean): boolean {
	const testTrigger = caseSensitive ? triggerText : triggerText.toLowerCase()
	const escaped = testTrigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const flags = caseSensitive ? "" : "i"
	const regex = new RegExp(`\\b${escaped}\\b`, flags)
	return regex.test(content)
}

function matchRegex (content: string, trigger: any): boolean {
	try {
		const flags = trigger.regexFlags || (trigger.caseSensitive ? "" : "i")
		const regex = new RegExp(trigger.regexPattern || trigger.trigger, flags)
		return regex.test(content)
	} catch (error) {
		triggersLogger.error(`Regex inválida en trigger ${trigger._id}:`, error)
		return false
	}
}

function matchesTrigger (content: string, trigger: any): boolean {
	const { matchType, trigger: triggerText, caseSensitive } = trigger

	switch (matchType) {
	case TriggerMatchType.EXACT:
		return matchExact(content, triggerText, caseSensitive)
	case TriggerMatchType.CONTAINS:
		return matchContains(content, triggerText, caseSensitive)
	case TriggerMatchType.STARTS_WITH:
		return matchStartsWith(content, triggerText, caseSensitive)
	case TriggerMatchType.ENDS_WITH:
		return matchEndsWith(content, triggerText, caseSensitive)
	case TriggerMatchType.WORD:
		return matchWord(content, triggerText, caseSensitive)
	case TriggerMatchType.REGEX:
		return matchRegex(content, trigger)
	default:
		return false
	}
}

function filterTriggersByChannel (triggers: any[], channelId: string): any[] {
	return triggers.filter((trigger) => {
		if (trigger.channels.length === 0) {return true}
		const isInList = trigger.channels.includes(channelId)
		return trigger.excludeChannels ? !isInList : isInList
	})
}

async function deleteOriginalMessage (message: Message): Promise<void> {
	try {
		await message.delete()
	} catch (error) {
		triggersLogger.warn(`No se pudo eliminar el mensaje: ${error}`)
	}
}

async function handleTriggerActivation (message: Message, trigger: any): Promise<void> {
	await message.reply(trigger.response)

	trigger.usageCount++
	await trigger.save()

	if (trigger.deleteOriginalMessage) {
		await deleteOriginalMessage(message)
	}

	const serverLog = `Servidor: ${message.guild?.name} (${message.guildId})`
	const userLog = `Usuario: ${message.author.tag}`
	const canalLog = `Canal: ${message.channel.id}`
	triggersLogger.info(
		`Trigger activado: "${trigger.trigger}" | ${serverLog} | ${userLog} | ${canalLog}`
	)
}

async function processMessageTriggers (message: Message): Promise<void> {
	const triggers = await TriggerModel.find({
		guildId: message.guildId,
		isActive: true
	})

	if (triggers.length === 0) {return}

	const validTriggers = filterTriggersByChannel(triggers, message.channelId)

	for (const trigger of validTriggers) {
		if (matchesTrigger(message.content, trigger)) {
			await handleTriggerActivation(message, trigger)
			break
		}
	}
}

registerEvent(
	Events.MessageCreate,
	async (message: Message) => {
		if (message.author.bot || !message.guildId) {return}

		try {
			await processMessageTriggers(message)
		} catch (error) {
			triggersLogger.error("Error verificando triggers:", error)
		}
	},
	{
		module: "triggers"
	}
)

