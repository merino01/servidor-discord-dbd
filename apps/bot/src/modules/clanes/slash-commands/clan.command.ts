import { Injectable } from "@/core/container"
import { ClanService } from "../services/clan-member.service"
import { SlashCommand } from "@/core/decorators/command.decorators"
import { ClanMemberCommand } from "./clan-member.command"

@Injectable(ClanService)
@SlashCommand({
	name: "clan",
	description: "Gestión de clanes"
})
export class ClanCommand extends ClanMemberCommand{}
