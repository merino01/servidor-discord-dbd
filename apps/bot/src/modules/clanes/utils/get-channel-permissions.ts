import { PermissionFlagsBits } from "discord.js"

const rolePermissionsMap = {
	"text": [
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.SendMessages,
		PermissionFlagsBits.AddReactions,
		PermissionFlagsBits.AttachFiles,
		PermissionFlagsBits.EmbedLinks,
		PermissionFlagsBits.MentionEveryone,
		PermissionFlagsBits.ReadMessageHistory,
		PermissionFlagsBits.UseExternalEmojis
	],
	"voice": [
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.Connect,
		PermissionFlagsBits.Speak,
		PermissionFlagsBits.Stream,
		PermissionFlagsBits.UseExternalApps,
		PermissionFlagsBits.UseEmbeddedActivities
	]
} as const

const leaderPermissionsMap = {
	"text": [
		PermissionFlagsBits.ManageMessages,
		PermissionFlagsBits.PinMessages,
		PermissionFlagsBits.CreatePublicThreads
	],
	"voice": [
	// PermissionFlagsBits.MuteMembers
	// PermissionFlagsBits.DeafenMembers,
		// PermissionFlagsBits.MoveMembers
	]
} as const

const everyonePermissionsMap = {
	text: {
		deny: [
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages
		]
	},
	voice: {
		allow: [
			PermissionFlagsBits.ViewChannel
		],
		deny: [
			PermissionFlagsBits.Connect,
			PermissionFlagsBits.SendMessages
		]
	}
} as const

export const getChannelPermissions = (
	channelType: "text" | "voice",
	leaderRoleId: string,
	guildId: string,
	clanRoleId: string
) => {
	const rolePermissions = rolePermissionsMap[channelType]
	const leaderPermissions = leaderPermissionsMap[channelType]
	const everyonePermissions = everyonePermissionsMap[channelType]

	const permissions = [
		{
			id: guildId,
			...everyonePermissions
		},
		{
			id: leaderRoleId,
			allow: leaderPermissions
		},
		{
			id: clanRoleId,
			allow: rolePermissions
		}
	]

	return permissions
}
