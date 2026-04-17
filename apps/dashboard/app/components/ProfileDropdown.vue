<script setup lang="ts">
const userStore = useUserStore()
const session = useUserSession()

const username = computed(() => userStore.user?.user.username ?? session.user.value?.username)

const { avatarUrl } = useUserAvatar()

const dropdownItems = [
	{ label: "Perfil", icon: "i-lucide-user", to: "/" },
	{ label: "Ajustes", icon: "i-lucide-settings", to: "/" },
	{ label: "Cerrar sesión", icon: "i-lucide-log-out", onSelect: handleLogout }
]

function handleLogout () {
	const { clear } = useUserSession()
	clear()
	navigateTo("/")
}
</script>

<template>
	<UDropdownMenu :items="dropdownItems">
		<div class="inline-flex items-center justify-between gap-4 hover:bg-neutral-800 rounded-md px-2 py-1 cursor-pointer">
			<UAvatar size="2xl" :src="avatarUrl" />
			<span>{{ username }}</span>
		</div>
	</UDropdownMenu>
</template>
