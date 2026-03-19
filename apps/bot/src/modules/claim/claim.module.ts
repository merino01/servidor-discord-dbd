import { Module } from "@core/decorators/module.decorator"
import { ClaimCommand } from "./slash-commands/claim.command"
import { ClaimConfigCommand } from "./slash-commands/claim-config.command"
import { UnClaimCommand } from "./slash-commands/unclaim.commands"

@Module({
	commands: [ClaimCommand, ClaimConfigCommand, UnClaimCommand]
})
export class ClaimModule {}
