<template>
  <div class="w-72 bg-elevated border border-default rounded-xl shadow-xl overflow-hidden">
    <div class="flex flex-col p-3">

      <!-- Primary -->
      <div class="flex flex-col gap-1.5 py-2">
        <div class="flex items-center gap-1.5 px-1">
          <span class="text-xs font-medium text-muted">Primary</span>
          <UIcon name="i-lucide-circle-help" class="size-3 text-dimmed" />
        </div>
        <div class="grid grid-cols-3">
          <button
            v-for="color in availableColors"
            :key="color.value"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
            :class="appConfig.ui.colors.primary === color.value
              ? 'bg-elevated-hover text-highlighted'
              : 'text-muted hover:bg-elevated-hover hover:text-highlighted'"
            @click="setPrimary(color.value)"
          >
            <span
              class="size-2.5 rounded-full shrink-0 ring-1 ring-inset ring-black/10"
              :style="{ backgroundColor: colorHex[color.value] }"
            />
            {{ color.label }}
          </button>
        </div>
      </div>

      <USeparator />

			<!-- Secondary -->
      <div class="flex flex-col gap-1.5 py-2">
        <div class="flex items-center gap-1.5 px-1">
          <span class="text-xs font-medium text-muted">Secondary</span>
          <UIcon name="i-lucide-circle-help" class="size-3 text-dimmed" />
        </div>
        <div class="grid grid-cols-3">
          <button
            v-for="color in availableColors"
            :key="color.value"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
            :class="appConfig.ui.colors.secondary === color.value
              ? 'bg-elevated-hover text-highlighted'
              : 'text-muted hover:bg-elevated-hover hover:text-highlighted'"
            @click="setSecondary(color.value)"
          >
            <span
              class="size-2.5 rounded-full shrink-0 ring-1 ring-inset ring-black/10"
              :style="{ backgroundColor: colorHex[color.value] }"
            />
            {{ color.label }}
          </button>
        </div>
      </div>

			<USeparator />

      <!-- Neutral -->
      <div class="flex flex-col gap-1.5 py-2">
        <div class="flex items-center gap-1.5 px-1">
          <span class="text-xs font-medium text-muted">Neutral</span>
          <UIcon name="i-lucide-circle-help" class="size-3 text-dimmed" />
        </div>
        <div class="grid grid-cols-3">
          <button
            v-for="color in neutralColors"
            :key="color.value"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
            :class="appConfig.ui.colors.neutral === color.value
              ? 'bg-elevated-hover text-highlighted'
              : 'text-muted hover:bg-elevated-hover hover:text-highlighted'"
            @click="setNeutral(color.value)"
          >
            <span
              class="size-2.5 rounded-full shrink-0 ring-1 ring-inset ring-black/10"
              :style="{ backgroundColor: colorHex[color.value] }"
            />
            {{ color.label }}
          </button>
        </div>
      </div>

      <USeparator />

      <!-- Radius -->
      <div class="flex flex-col gap-1.5 py-2">
        <div class="flex items-center gap-1.5 px-1">
          <span class="text-xs font-medium text-muted">Radius</span>
          <UIcon name="i-lucide-circle-help" class="size-3 text-dimmed" />
        </div>
        <div class="flex gap-1">
          <button
            v-for="r in radiusOptions"
            :key="r.value"
            class="flex-1 h-8 text-xs font-medium transition-all cursor-pointer"
            :class="currentRadius === r.value
              ? 'bg-elevated-hover text-highlighted'
              : 'text-muted hover:bg-elevated-hover hover:text-highlighted'"
            :style="{ borderRadius: r.preview }"
            @click="setRadius(r.value)"
          >
            {{ r.label }}
          </button>
        </div>
      </div>

      <USeparator />

      <!-- Color Mode -->
      <div class="flex flex-col gap-1.5 py-2">
        <div class="flex items-center gap-1.5 px-1">
          <span class="text-xs font-medium text-muted">Color Mode</span>
          <UIcon name="i-lucide-circle-help" class="size-3 text-dimmed" />
        </div>
        <div class="flex gap-1.5">
          <button
            v-for="mode in colorModes"
            :key="mode.value"
            class="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium border transition-all cursor-pointer"
            :class="colorMode.preference === mode.value
              ? 'bg-inverted text-inverted border-inverted'
              : 'border-default text-muted hover:border-accented hover:text-highlighted'"
            @click="colorMode.preference = mode.value"
          >
            <UIcon :name="mode.icon" class="size-3.5 shrink-0" />
            {{ mode.label }}
          </button>
        </div>
      </div>

      <USeparator />

      <!-- Reset -->
      <div class="pt-2">
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-rotate-ccw"
          block
          class="justify-center"
          @click="reset"
        >
          Restaurar por defecto
        </UButton>
      </div>

    </div>
  </div>
</template>

<script setup>
const appConfig = useAppConfig()
const colorMode = useColorMode()

// ─── Mapa de colores (Tailwind 500) ────────────────────────────────────────────
const colorHex = {
	red: "#ef4444", orange: "#f97316", amber: "#f59e0b", yellow: "#eab308",
	lime: "#84cc16", green: "#22c55e", emerald: "#10b981", teal: "#14b8a6",
	cyan: "#06b6d4", sky: "#0ea5e9", blue: "#3b82f6", indigo: "#6366f1",
	violet: "#8b5cf6", purple: "#a855f7", fuchsia: "#d946ef", pink: "#ec4899",
	rose: "#f43f5e", slate: "#64748b", gray: "#6b7280", zinc: "#71717a",
	neutral: "#737373", stone: "#78716c"
}

// ─── Color Mode ────────────────────────────────────────────────────────────────
const colorModes = [
	{ label: "Claro", value: "light", icon: "i-lucide-sun" },
	{ label: "Sistema", value: "system", icon: "i-lucide-monitor" },
	{ label: "Oscuro", value: "dark", icon: "i-lucide-moon" }
]

// ─── Colores ───────────────────────────────────────────────────────────────────
const availableColors = [
	{ label: "Red", value: "red" },
	{ label: "Orange", value: "orange" },
	{ label: "Amber", value: "amber" },
	{ label: "Yellow", value: "yellow" },
	{ label: "Lime", value: "lime" },
	{ label: "Green", value: "green" },
	{ label: "Emerald", value: "emerald" },
	{ label: "Teal", value: "teal" },
	{ label: "Cyan", value: "cyan" },
	{ label: "Sky", value: "sky" },
	{ label: "Blue", value: "blue" },
	{ label: "Indigo", value: "indigo" },
	{ label: "Violet", value: "violet" },
	{ label: "Purple", value: "purple" },
	{ label: "Fuchsia", value: "fuchsia" },
	{ label: "Pink", value: "pink" },
	{ label: "Rose", value: "rose" }
]

const neutralColors = [
	{ label: "Slate", value: "slate" },
	{ label: "Gray", value: "gray" },
	{ label: "Zinc", value: "zinc" },
	{ label: "Neutral", value: "neutral" },
	{ label: "Stone", value: "stone" }
]

// ─── Radio de bordes ───────────────────────────────────────────────────────────
const radiusOptions = [
	{ label: "Ninguno", numLabel: "0",     value: "0px",      preview: "0px" },
	{ label: "sm",      numLabel: "0.125", value: "0.125rem", preview: "3px" },
	{ label: "md",      numLabel: "0.25",  value: "0.25rem",  preview: "5px" },
	{ label: "lg",      numLabel: "0.375", value: "0.375rem", preview: "6px" },
	{ label: "full",    numLabel: "0.5",   value: "0.5rem",   preview: "8px" }
]

const currentRadius = ref("0.25rem")

// ─── Persistencia localStorage ─────────────────────────────────────────────────
const STORAGE_KEY = "ui-theme"

function saveToStorage () {
	localStorage.setItem(STORAGE_KEY, JSON.stringify({
		primary: appConfig.ui.colors.primary,
		secondary: appConfig.ui.colors.secondary,
		neutral: appConfig.ui.colors.neutral,
		radius: currentRadius.value
	}))
}

// ─── Acciones ──────────────────────────────────────────────────────────────────
function setPrimary (value) {
	appConfig.ui.colors.primary = value
	saveToStorage()
}

function setSecondary (value) {
	appConfig.ui.colors.secondary = value
	saveToStorage()
}

function setNeutral (value) {
	appConfig.ui.colors.neutral = value
	saveToStorage()
}

function setRadius (value) {
	currentRadius.value = value
	document.documentElement.style.setProperty("--ui-radius", value)
	saveToStorage()
}

function reset () {
	appConfig.ui.colors.primary = "green"
	appConfig.ui.colors.secondary = "blue"
	appConfig.ui.colors.neutral = "slate"
	colorMode.preference = "system"
	setRadius("0.25rem")
	localStorage.removeItem(STORAGE_KEY)
}
</script>
