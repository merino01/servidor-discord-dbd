import { EmbedBuilder, TextChannel } from "discord.js"
import { botEvents } from "@/core/events/bot-events"
import { ILogConfig, LogConfigModel } from "@org/mongo"
import { BotInstance } from "@/core/bot-instance"

// Colores para cada tipo de evento de voz
const CLANS_COLORS = {
	CREATE               : 0x9b59b6, // Morado
	DELETE               : 0xe74c3c, // Rojo
	EXTRA_CHANNEL_ADD    : 0xe67e22, // Naranja
	EXTRA_CHANNEL_REMOVE : 0x2ecc71, // Verde
	INVITATION_CREATE    : 0x1abc9c, // Verde claro/turquesa
	INVITATION_ACCEPT    : 0x3498db, // Azul
	INVITATION_REJECT    : 0x5dade2, // Azul claro
	LEADER_ADD           : 0xf1c40f, // Amarillo
	LEADER_REMOVE        : 0xd35400, // Naranja oscuro
	MEMBER_ADD           : 0x27ae60, // Verde oscuro
	MEMBER_KICK          : 0xc0392b, // Rojo oscuro
	MEMBER_LEAVE         : 0x7f8c8d  // Gris
}

async function shouldLog (guildId: string): Promise<ILogConfig["clans"] | false> {
	const config = await LogConfigModel.findOne({ guildId })
	if (config?.clans && config.clans.enabled) {
		return config?.clans
	}
	return false
}

async function sendLog (embed: EmbedBuilder, config: ILogConfig["clans"]): Promise<void> {
	const bot = BotInstance.getOrNull()
	if (!bot) {
		return
	}
	const channel = await bot.channels.fetch(config?.channelId || "")
	if (channel && channel.isTextBased() && channel instanceof TextChannel) {
		await channel.send({ embeds: [embed] })
	}
}

botEvents.on("clan:created", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}
	const embed = new EmbedBuilder()
		.setTitle("Clan creado")
		.setDescription(`El clan **${data.clanName}** ha sido creado.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Creado por", value: `<@${data.createdBy}>`, inline: true }
		)
		.setColor(CLANS_COLORS.CREATE)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:deleted", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Clan eliminado")
		.setDescription(`El clan **${data.clanName}** ha sido eliminado.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Eliminado por", value: `<@${data.deletedBy}>`, inline: true }
		)
		.setColor(CLANS_COLORS.DELETE)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:extraChannelAdded", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Canal extra añadido al clan")
		.setDescription(`Se ha añadido un canal extra al clan **${data.clanName}**.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Añadido por", value: `<@${data.addedBy}>`, inline: true },
			{ name: "Canal", value: `<#${data.channelId}>`, inline: true }
		)
		.setColor(CLANS_COLORS.EXTRA_CHANNEL_ADD)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:extraChannelRemoved", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Canal extra eliminado del clan")
		.setDescription(`Se ha eliminado un canal extra del clan **${data.clanName}**.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Eliminado por", value: `<@${data.removedBy}>`, inline: true },
			{ name: "Canal", value: `<#${data.channelId}>`, inline: true }
		)
		.setColor(CLANS_COLORS.EXTRA_CHANNEL_REMOVE)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:invitationCreated", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Invitación de clan creada")
		.setDescription(`Se ha creado una invitación para el clan **${data.clanName}**.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Creada por", value: `<@${data.invitedBy}>`, inline: true },
			{ name: "Invitado", value: `<@${data.invitedUserId}>`, inline: true }
		)
		.setColor(CLANS_COLORS.INVITATION_CREATE)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:invitationAccepted", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Invitación de clan aceptada")
		.setDescription(`Se ha aceptado una invitación para el clan **${data.clanName}**.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Aceptado por", value: `<@${data.invitedUserId}>`, inline: true },
			{ name: "Invitado por", value: `<@${data.invitedBy}>`, inline: true }
		)
		.setColor(CLANS_COLORS.INVITATION_ACCEPT)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:invitationRejected", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Invitación de clan rechazada")
		.setDescription(`Se ha rechazado una invitación para el clan **${data.clanName}**.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Rechazado por", value: `<@${data.invitedUserId}>`, inline: true },
			{ name: "Invitado por", value: `<@${data.invitedBy}>`, inline: true }
		)
		.setColor(CLANS_COLORS.INVITATION_REJECT)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:leaderAdded", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Líder añadido al clan")
		.setDescription(`Se ha añadido un líder al clan **${data.clanName}**.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Añadido por", value: `<@${data.addedBy}>`, inline: true }
		)
		.setColor(CLANS_COLORS.LEADER_ADD)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:leaderRemoved", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Líder eliminado del clan")
		.setDescription(`Se ha eliminado un líder del clan **${data.clanName}**.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Eliminado por", value: `<@${data.removedBy}>`, inline: true }
		)
		.setColor(CLANS_COLORS.LEADER_REMOVE)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:memberAdded", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Miembro añadido al clan")
		.setDescription(`Se ha añadido un miembro al clan **${data.clanName}**.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Añadido por", value: `<@${data.addedBy}>`, inline: true }
		)
		.setColor(CLANS_COLORS.MEMBER_ADD)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:memberKicked", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Miembro expulsado del clan")
		.setDescription(`Se ha expulsado un miembro del clan **${data.clanName}**.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true },
			{ name: "Expulsado por", value: `<@${data.removedBy}>`, inline: true }
		)
		.setColor(CLANS_COLORS.MEMBER_KICK)
		.setTimestamp()
	sendLog(embed, config)
})

botEvents.on("clan:memberLeft", async (data) => {
	const config = await shouldLog(data.guildId)
	if (!config) {
		return
	}

	const embed = new EmbedBuilder()
		.setTitle("Miembro salió del clan")
		.setDescription(`Un miembro ha salido del clan **${data.clanName}**.`)
		.addFields(
			{ name: "Nombre del clan", value: data.clanName, inline: true },
			{ name: "ID del Clan", value: data.clanId, inline: true }
		)
		.setColor(CLANS_COLORS.MEMBER_LEAVE)
		.setTimestamp()
	sendLog(embed, config)
})
