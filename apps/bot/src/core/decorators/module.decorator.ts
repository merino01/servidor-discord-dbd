// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProviderConstructor = new (...args: any[]) => { register(): void | Promise<void> }

interface ModuleEntry {
	name: string
	Module: ModuleConstructor
	commands: unknown[]
	providers: ProviderConstructor[]
}

type ModuleConstructor = new () => object

const moduleRegistry: ModuleEntry[] = []

export interface ModuleOptions {
	name?: string
	/** Clases de comandos que pertenecen a este módulo. */
	commands?: unknown[]
	/**
	 * Clases provider de listeners, componentes y otros efectos secundarios.
	 * Se instancian y se llama a su método `register()` durante `bootstrapModules()`.
	 *
	 * @example
	 * ```ts
	 * @Module({
	 *   providers: [MessageFormatListener, FormatSelectComponent]
	 * })
	 * ```
	 */
	providers?: ProviderConstructor[]
}

/**
 * Decorador de clase. Registra el módulo en el registry global para gestionar
 * su ciclo de vida de forma centralizada.
 *
 * Los imports de comandos, listeners, crons, etc. siguen declarándose en el
 * mismo archivo (side-effect imports). Si el módulo necesita inicialización
 * asíncrona, define un método estático `initialize()`.
 *
 * @example Módulo sin inicialización async
 * ```ts
 * @Module()
 * export class ClaimModule {}
 * ```
 *
 * @example Módulo con inicialización async
 * ```ts
 * @Module()
 * export class AutoMessagesModule {
 *   static async initialize() {
 *     const service = AutoMessageService.getInstance()
 *     await service.initialize()
 *   }
 * }
 * ```
 */
export function Module (options: ModuleOptions = {}) {
	return function (target: ModuleConstructor): void {
		moduleRegistry.push({
			name: options.name ?? target.name,
			Module: target,
			commands: options.commands ?? [],
			providers: options.providers ?? []
		})
	}
}

export function getRegisteredModules (): ModuleEntry[] {
	return [...moduleRegistry]
}

/**
 * Llama a `initialize()` en todos los módulos registrados que lo implementen.
 * Debe invocarse en `bootstrap.ts` después de que todos los archivos de módulo
 * hayan sido importados.
 */
import { container } from "../container"

export async function bootstrapModules (): Promise<void> {
	for (const { Module: ModuleClass, providers } of moduleRegistry) {
		for (const ProviderClass of providers) {
			await container.resolve(ProviderClass).register()
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const initializer = (ModuleClass as any).initialize
		if (typeof initializer === "function") {
			await (initializer as () => Promise<void>)()
		}
	}
}
