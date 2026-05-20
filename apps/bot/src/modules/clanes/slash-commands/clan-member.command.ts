import { Subcommand } from "@/core/decorators/command.decorators"
import { ClanService } from "../services/clan-member.service"
import { CommandContext } from "@/core/types"
import { ApplicationCommandOptionType, MessageFlags } from "discord.js"

export class ClanMemberCommand {
	constructor (private readonly service: ClanService) {}

	@Subcommand({
		name: "salir",
		description: "Salir de tu clan actual"
	})
	async salir ({ interaction }: CommandContext): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.leave(interaction.user, interaction.guild!.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "invitar",
		description: "Invitar a un miembro al clan",
		options: [
			{
				name: "usuario",
				description: "Usuario a invitar al clan",
				type: ApplicationCommandOptionType.User,
				required: true
			}
		]
	})
	async invitar ({ interaction }: CommandContext): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const targetUser = interaction.options.getUser("usuario", true)

		const reply = await this.service.inviteUser(targetUser, interaction.user, interaction.guild!.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "expulsar",
		description: "Expulsar a un miembro del clan",
		options: [
			{
				name: "usuario",
				description: "Usuario a expulsar del clan",
				type: ApplicationCommandOptionType.User,
				required: true
			}
		]
	})
	async expulsar ({ interaction }: CommandContext): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const targetUser = interaction.options.getUser("usuario", true)

		const reply = await this.service.kickUser(targetUser, interaction.user, interaction.guild!.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "info",
		description: "Ver informacion del clan"
	})
	async info ({ interaction }: CommandContext): Promise<void> {
		await interaction.deferReply()

		const reply = await this.service.getClanInfo(interaction.guild!.id, interaction.user.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "miembros",
		description: "Ver miembros del clan"
	})
	async miembros ({ interaction }: CommandContext): Promise<void> {
		await interaction.deferReply()

		const reply = await this.service.getClanMembersByUserId(interaction.user.id, interaction.guild!.id)
		const response = await interaction.editReply(reply)

		if (!reply?.chunks || reply.chunks.length === 1) {
			return
		}

		await this.service.handlePaginationCollector({
			response,
			userId: interaction.user.id,
			chunks: reply.chunks,
			clan: reply.clan!,
			interaction
		})
	}
}

