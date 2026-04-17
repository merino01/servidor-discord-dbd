<script setup lang="ts">
import type { NavigationMenuItem } from "#ui/types"

const route = useRoute()
const guildId = computed(() => route.params.guildId as string | undefined)

const guildsStore = useGuildStore()
onMounted(() => {
	if (guildsStore.selectedGuild === null && guildId.value) {
		guildsStore.selectGuild(guildId.value)
	}
})

const items = computed<NavigationMenuItem[]>(() => {
	const base = guildId.value ? `/dashboard/${guildId.value}` : "/dashboard"
	return [
		{ label: "Inicio", icon: "i-lucide-home", to: base },
		{ label: "Triggers", icon: "i-lucide-home", to: `${base}/triggers` },
		{ label: "Mensajes automáticos", icon: "i-lucide-home", to: `${base}/automatic-messages` },
		{ label: "Formatos de canal", icon: "material-symbols:format-color-fill", to: `${base}/channel-formats` },
		{ label: "Envio de mensajes", icon: "mdi:chat-processing-outline", to: `${base}/message-sender` },
		{ label: "Notificador de menciones", icon: "famicons:notifications-outline", to: `${base}/notificator` },
		{ label: "Clanes", icon: "i-lucide-users", to: `${base}/clanes` }
	]
})

const sidebarOpen = ref(true)
</script>

<template>
	<div class="flex flex-col h-screen">
		<UHeader class="w-screen">
			<template #left>
				<UButton
					:icon="sidebarOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
					color="neutral"
					variant="ghost"
					@click="sidebarOpen = !sidebarOpen"
				/>

				<NuxtLink to="/" class="shrink-0 font-bold text-xl text-highlighted flex items-end gap-1.5">
					Dead by Daylight España
				</NuxtLink>
			</template>

			<template #right>
				<UPopover>
					<UButton variant="ghost">
						<UIcon name="i-lucide-swatch-book" class="size-5 shrink-0" />
					</UButton>
					<template #content>
						<UThemePicker />
					</template>
				</UPopover>

				<USeparator orientation="vertical" />
				<GuildDropdown />
				<ProfileDropdown />
			</template>
		</UHeader>

		<div class="flex flex-1 overflow-hidden">
			<USidebar
				:ui="{
					gap: 'mt-[var(--ui-header-height)]',
					container: 'top-[var(--ui-header-height)]'
				}"
				:open="sidebarOpen"
				collapsible="offcanvas"
			>
				<UNavigationMenu orientation="vertical" :items="items" />
			</USidebar>

			<UMain class="flex-1 overflow-y-auto p-8">
				<NuxtPage />
			</UMain>
		</div>

		<UFooter />
	</div>
</template>
