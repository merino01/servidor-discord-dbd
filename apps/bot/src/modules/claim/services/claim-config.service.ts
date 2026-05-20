import { Injectable } from "@/core/container"
import { ClaimConfigRepository } from "../repositories/claim-config.repository"

@Injectable(ClaimConfigRepository)
export class ClaimConfigService {
	private readonly repo: ClaimConfigRepository

	constructor (repo: ClaimConfigRepository) {
		this.repo = repo
	}

	async getCategories (guildId: string): Promise<string[]> {
		return this.repo.findAllByGuild(guildId)
	}

	async addCategory (guildId: string, categoryId: string): Promise<void> {
		await this.repo.create(guildId, categoryId)
	}

	async removeCategory (guildId: string, categoryId: string): Promise<void> {
		await this.repo.delete(guildId, categoryId)
	}
}
