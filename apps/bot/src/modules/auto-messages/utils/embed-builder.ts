import { EmbedBuilder } from "discord.js"
import { IAutoMessage, AutoMessageTargetType } from "@org/mongo"

function getStatusInfo (
	autoMessage: IAutoMessage
): { statusText: string; statusColor: number } {
	let statusText = "✅ Activo"
	let statusColor = 0x00ff00

	if (autoMessage.deletedAt) {
		statusText = "🗑️ Eliminado"
		statusColor = 0xff0000
	} else if (!autoMessage.isActive) {
		statusText = "⏸️ Pausado"
		statusColor = 0xffa500
	}

	return { statusText, statusColor }
}

function addDeletionInfo (embed: EmbedBuilder, autoMessage: IAutoMessage): void {
	if (!autoMessage.isActive && autoMessage.deletedBy && autoMessage.deletedAt) {
		embed.addFields(
			{ name: "Eliminado por", value: `<@${autoMessage.deletedBy}>`, inline: true },
			{
				name: "Fecha de eliminación",
				value: autoMessage.deletedAt.toLocaleDateString("es-ES"),
				inline: true
			}
		)
	}
}

export function addCategoryExtraInfo (embed: EmbedBuilder, autoMessage: IAutoMessage): void {
	if (autoMessage.waitTime !== null) {
		embed.addFields([
			{
				name: "Tiempo de espera",
				value: `${autoMessage.waitTime} segundos`
			},
			{
				name: "Anclado",
				value: autoMessage.pin ? ":white_check_mark: Activado" : ":x: Desactivado",
				inline: true
			}
		])
	}
}

/**
 * Construye un embed con la información detallada de un mensaje automático
 */
export function buildAutoMessageInfoEmbed (autoMessage: IAutoMessage): EmbedBuilder {
	const targetInfo = autoMessage.targetType === AutoMessageTargetType.CHANNEL
		? `📍 Canal: <#${autoMessage.targetId}>`
		: `📁 Categoría: <#${autoMessage.targetId}>`

	const { statusText, statusColor } = getStatusInfo(autoMessage)

	const tipoInfo = autoMessage.cronExpression
		? `⏰ Programado (cron): \`${autoMessage.cronExpression}\``
		: "📝 Al crear canal"

	const embed = new EmbedBuilder()
		.setColor(statusColor)
		.setTitle(`📨 ${autoMessage.name}`)
		.addFields(
			{ name: "Estado", value: statusText, inline: true }
		)

	embed.addFields(
		{ name: "Tipo", value: tipoInfo, inline: false },
		{ name: "Destino", value: targetInfo, inline: false },
		{
			name: "Mensaje",
			value: autoMessage.message ? autoMessage.message.substring(0, 1024) : "Embed solo",
			inline: false
		},
		{ name: "Creado por", value: `<@${autoMessage.createdBy}>`, inline: true },
		{
			name: "Fecha de creación",
			value: autoMessage.createdAt.toLocaleDateString("es-ES"),
			inline: true
		},
		{ name: "Ejecuciones", value: autoMessage.executionCount.toString(), inline: false }
	)

	if (autoMessage.lastExecutionAt) {
		embed.addFields({
			name: "Última ejecución",
			value: `<t:${Math.floor(autoMessage.lastExecutionAt.getTime() / 1000)}:R>`,
			inline: true
		})
	}

	addCategoryExtraInfo(embed, autoMessage)
	addDeletionInfo(embed, autoMessage)

	embed.setFooter({ text: `ID: ${autoMessage._id}` })

	return embed
}
