import { Injectable } from "@/core/container"
import { ClaimModel } from "@org/mongo"

export interface CreateClaimData {
	guildId: string
	moderatorId: string
	ticketId: string
	affectedUserId: string | null
	ticketReason: string | null
}

@Injectable()
export class ClaimRepository {
	async create (data: CreateClaimData) {
		return ClaimModel.insertOne(data)
	}

	async unclaim (guildId: string, ticketId: string) {
		return ClaimModel.findOneAndUpdate(
			{ guildId, ticketId },
			{ unclaimedAt: new Date() }
		)
	}
}
