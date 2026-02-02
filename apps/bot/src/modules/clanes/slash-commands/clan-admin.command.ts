import { registerCommand, registerSubCommand } from "@/core/command-register"
import { CommandContext, OptionType } from "@types"
import { PermissionFlagsBits, EmbedBuilder, MessageFlags } from "discord.js"
import { ClanService } from "../services/clan.service"
import { BaseCommand } from "@/core/base/base-command"

export class ClanAdminCommand extends BaseCommand {
	protected service = ClanService.getInstance()

	private buildSuccessEmbed (title: string, description: string): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle(`✅ ${title}`)
			.setDescription(description)
			.setTimestamp()
	}

	private buildErrorEmbed (error: string): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(0xff0000)
			.setTitle("❌ Error")
			.setDescription(error)
			.setTimestamp()
	}

	private buildMigrationSuccessEmbed (params: {
		icono: string
		nombre: string
		liderId: string
		rolId: string
		canalTextoId: string
		canalVozId: string
		limite: number
	}): EmbedBuilder {
		return this.buildSuccessEmbed(
			"Clan migrado",
			`Se ha migrado el clan **${params.icono} ${params.nombre}**\n\n` +
			`**Líder:** <@${params.liderId}>\n` +
			`**Rol:** <@&${params.rolId}>\n` +
			`**Canal de texto:** <#${params.canalTextoId}>\n` +
			`**Canal de voz:** <#${params.canalVozId}>\n` +
			`**Límite de miembros:** ${params.limite}`
		)
	}

	async migrar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const nombre = interaction.options.getString("nombre", true)
		const icono = interaction.options.getString("icono", true)
		const rol = interaction.options.getRole("rol", true)
		const canalesTexto = interaction.options.getChannel("canal_texto", true)
		const canalesVoz = interaction.options.getChannel("canal_voz", true)
		const limite = interaction.options.getInteger("limite", true)
		const lider = interaction.options.getUser("lider", true)

		if (!rol || !canalesTexto || !canalesVoz || !lider) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("Debes proporcionar todos los datos requeridos.")]
			})
			return
		}

		const result = await this.service.createClan({
			guildId: interaction.guild.id,
			name: nombre,
			icon: icono,
			leaderId: lider.id,
			createdBy: interaction.user.id,
			roleId: rol.id,
			textChannelIds: [canalesTexto.id],
			voiceChannelIds: [canalesVoz.id],
			maxMembers: limite,
			migracion: true
		})

		if (!result.success || !result.clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido al migrar el clan.")]
			})
			return
		}

		const embed = this.buildMigrationSuccessEmbed({
			icono,
			nombre,
			liderId: lider.id,
			rolId: rol.id,
			canalTextoId: canalesTexto.id,
			canalVozId: canalesVoz.id,
			limite
		})
		await interaction.editReply({ embeds: [embed] })
	}
}

registerCommand(ClanAdminCommand, {
	name: "clan-admin",
	description: "Comandos administrativos para clanes",
	permissions: PermissionFlagsBits.Administrator,
	options: []
})

registerSubCommand(ClanAdminCommand, "migrar", {
	name: "migrar",
	description: "Migrar un clan existente al sistema",
	options: [
		{ name: "nombre", description: "Nombre del clan", type: OptionType.STRING, required: true },
		{ name: "icono", description: "Icono del clan (emoji)", type: OptionType.STRING, required: true },
		{ name: "rol", description: "Rol del clan", type: OptionType.ROLE, required: true },
		{ name: "canal_texto", description: "Canal de texto del clan", type: OptionType.CHANNEL, required: true },
		{ name: "canal_voz", description: "Canal de voz del clan", type: OptionType.CHANNEL, required: true },
		{ name: "limite", description: "Límite de miembros", type: OptionType.INTEGER, required: true },
		{ name: "lider", description: "Usuario líder del clan", type: OptionType.USER, required: true }
	]
})
