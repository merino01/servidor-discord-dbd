interface Guild {
	id: string,
	name: string,
	icon: string,
	banner: string | null,
	owner: boolean,
	permissions: number,
	permissions_new: string
	features: string[],
	hasAdmin: boolean,
	hasManageGuild: boolean,
	isBotInGuild: boolean
}
