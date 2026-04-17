<script setup lang="ts">
import type { DropdownMenuItem } from "#ui/types"

const discordOAuthUrl = "https://discord.com/oauth2/authorize?client_id=1063550309831540818&permissions=2832740072483920&integration_type=0&scope=bot"

const guildsStore = useGuildStore()
guildsStore.fetchGuilds()

const guild = computed(() => guildsStore.selectedGuild ?? null)

const items = computed(() => {
	const filtered = guildsStore.guilds.filter((g) => g.hasAdmin || g.hasManageGuild)
	const result: DropdownMenuItem[] = []
	let separatorAdded = false

	for (const g of filtered) {
		if (!separatorAdded && !g.isBotInGuild) {
			separatorAdded = true
			result.push({ type: "separator" })
		}
		const resultItem: DropdownMenuItem = {
			label: g.name,
			type: "link"
		}
		if (g.isBotInGuild) {
			resultItem.to = `/dashboard/${g.id}`
		} else {
			resultItem.icon = "i-lucide-plus"
			resultItem.to = discordOAuthUrl + `&guild_id=${g.id}`
		}

		// if (g.id === guild.value?.id) {
		// 	resultItem.icon = "i-lucide-check"
		// }
		if (g.icon) {
			resultItem.guildIcon = `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
		}
		result.push(resultItem)
	}
	return result
})
</script>

<template>
	<div class="inline-flex items-center justify-between gap-4 hover:bg-neutral-800 rounded-md px-2 py-1 cursor-pointer">
		<UDropdownMenu :items="items" :ui="{ item: 'items-center' }">
			<div class="inline-flex items-center justify-between gap-4 hover:bg-neutral-800 rounded-md px-2 py-1 cursor-pointer">
				<UAvatar
					v-if="guild"
					size="2xl"
					:src="'https://cdn.discordapp.com/icons/' + guild?.id + '/' + guild?.icon + '.png'"
				/>
				<UAvatar
					v-else
					size="2xl"
					src="/questionmark.png"
				/>
				<span>{{ guild?.name ?? $t("dashboard.selectGuild") }}</span>
			</div>

			<template #item-leading="{ item }">
				<div class="flex items-center gap-2">
					<!-- 1. Icono -->
					<UIcon :name="item.icon" class="size-4 shrink-0 text-muted" />
					<!-- 2. Avatar con la imagen del servidor de la BD -->
					<UAvatar
						:src="item.guildIcon"
						:alt="item.label"
						size="lg"
					/>
				</div>
			</template>
		</UDropdownMenu>
	</div>
</template>
