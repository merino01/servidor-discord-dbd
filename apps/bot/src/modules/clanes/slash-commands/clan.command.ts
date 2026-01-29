import { BaseCommand } from "@/core/base/base-command"
import { registerCommand } from "@/core/command-register"
import { EmbedBuilder, MessageFlags } from "discord.js"
import { ClanService } from "../services/clan.service"
import { CommandContext } from "@/core/types"

export class ClanCommand extends BaseCommand {
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

	async salir (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const userId = interaction.user.id
		const guildId = interaction.guild.id
		const clan = await this.service.getClanByMember(guildId, userId)

		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No perteneces a ningún clan.")]
			})
			return
		}

		const result = await this.service.removeMember(
			clan._id.toString(),
			userId,
			userId,
			false
		)

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Has salido del clan",
				`Has abandonado el clan **${clan.name}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}

	async invitar (context: CommandContext): Promise<void> {
		const { interaction } = context
		await interaction.reply({
			embeds: [this.buildErrorEmbed("Este comando está en desarrollo.")],
			flags: MessageFlags.Ephemeral
		})
	}

	async expulsar (context: CommandContext): Promise<void> {
		const { interaction } = context
		await interaction.reply({
			embeds: [this.buildErrorEmbed("Este comando está en desarrollo.")],
			flags: MessageFlags.Ephemeral
		})
	}

	async info (context: CommandContext): Promise<void> {
		const { interaction } = context
		await interaction.reply({
			embeds: [this.buildErrorEmbed("Este comando está en desarrollo.")],
			flags: MessageFlags.Ephemeral
		})
	}

	async miembros (context: CommandContext): Promise<void> {
		const { interaction } = context
		await interaction.reply({
			embeds: [this.buildErrorEmbed("Este comando está en desarrollo.")],
			flags: MessageFlags.Ephemeral
		})
	}
}

registerCommand(ClanCommand, {
	name: "clan",
	description: "Gestión de clanes del staff"
})
