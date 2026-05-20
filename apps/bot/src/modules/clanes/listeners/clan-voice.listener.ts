import { registerEvent } from "@/core/event-registry"
import { ClanModel } from "@org/mongo"
import { Events, VoiceState } from "discord.js"
import { ClanStatsRepository } from "../repositories/clan-stats.repository"
import { Injectable } from "@/core/container"

interface VoiceSession {
	userId: string
	clanId: string
	startTime: Date
}

@Injectable(ClanStatsRepository)
export class ClanVoiceListener {
	private voiceSessions: Map<string, VoiceSession>

	constructor (
		private readonly statsRepository: ClanStatsRepository
	) {
		this.voiceSessions = new Map<string, VoiceSession>()
	}

	/**
 * Maneja cuando un usuario se une a un canal de voz de clan
 */
	private async handleVoiceJoin (state: VoiceState): Promise<void> {
		if (!state.guild || !state.channelId || !state.member || state.member.user.bot) {
			return
		}

		// Buscar si el canal pertenece a algún clan
		const clan = await ClanModel.findOne({
			guildId: state.guild.id,
			voiceChannelIds: state.channelId,
			isActive: true
		})

		if (!clan) {
			return
		}

		// Verificar que el usuario sea miembro del clan
		if (!clan.members.includes(state.member.id)) {
			return
		}

		// Guardar la sesión de voz
		const sessionKey = `${state.member.id}-${state.channelId}`
		this.voiceSessions.set(sessionKey, {
			userId: state.member.id,
			clanId: clan._id.toString(),
			startTime: new Date()
		})
	}

	/**
 * Maneja cuando un usuario sale de un canal de voz de clan
 */
	private async handleVoiceLeave (state: VoiceState): Promise<void> {
		if (!state.guild || !state.channelId || !state.member || state.member.user.bot) {
			return
		}

		const sessionKey = `${state.member.id}-${state.channelId}`
		const session = this.voiceSessions.get(sessionKey)

		if (!session) {
			return
		}

		// Calcular tiempo en voz
		const endTime = new Date()
		const startTime = session.startTime
		const minutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60)

		if (minutes > 0) {
		// Buscar el clan
			const clan = await ClanModel.findOne({
				guildId: state.guild.id,
				voiceChannelIds: state.channelId,
				isActive: true
			})

			if (clan) {
				await this.statsRepository.registerVoiceTime(clan._id, session.userId, minutes)
			}
		}

		// Eliminar la sesión
		this.voiceSessions.delete(sessionKey)
	}

	register () {
		/**
		* Listener para registrar actividad de voz en canales de clanes
		*/
		registerEvent(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
			try {
				// Usuario se unió a un canal de voz
				if (!oldState.channelId && newState.channelId) {
					await this.handleVoiceJoin(newState)
				}

				// Usuario salió de un canal de voz
				if (oldState.channelId && !newState.channelId) {
					await this.handleVoiceLeave(oldState)
				}

				// Usuario cambió de canal de voz
				if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
					await this.handleVoiceLeave(oldState)
					await this.handleVoiceJoin(newState)
				}
			} catch (error) {
				console.error("Error handling clan voice state update:", error)
			}
		})

	}
}

