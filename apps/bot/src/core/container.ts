/**
 * Contenedor de inversión de control (IoC) minimalista.
 *
 * Resuelve dependencias de forma recursiva y las almacena como singletons.
 *
 * Usa el decorador `@Injectable` para declarar las dependencias de una clase.
 * Funciona en cualquier capa: servicios, comandos, listeners, componentes, etc.
 *
 * @example Servicio con dependencia
 * ```ts
 * @Injectable()
 * export class ClaimRepository { ... }
 *
 * @Injectable(ClaimRepository)
 * export class ClaimService {
 *   constructor(private readonly repo: ClaimRepository) {}
 * }
 * ```
 *
 * @example Comando con servicio inyectado
 * ```ts
 * @Injectable(ClaimService)
 * @SlashCommand({ name: 'claim', ... })
 * export class ClaimCommand extends BaseCommand {
 *   constructor(private readonly service: ClaimService) { super() }
 * }
 * ```
 *
 * @example Listener con servicio inyectado
 * ```ts
 * @Injectable(ClaimService)
 * export class ClaimListener {
 *   constructor(private readonly service: ClaimService) {}
 *   register() { botEvents.on('...', () => this.service.doSomething()) }
 * }
 * ```
 */
class Container {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private readonly instances = new Map<any, any>()

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	resolve<T> (token: new (...args: any[]) => T): T {
		if (this.instances.has(token)) {
			return this.instances.get(token) as T
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const deps: any[] = (token as any).inject ?? []
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const resolvedDeps = deps.map((dep: new (...args: any[]) => any) => this.resolve(dep))

		const instance = new token(...resolvedDeps)
		this.instances.set(token, instance)
		return instance
	}
}

export const container = new Container()

/**
 * Declara las dependencias que el contenedor debe inyectar en el constructor.
 * Las instancias son singletons: se crean una sola vez y se reutilizan.
 *
 * @param deps Clases a inyectar, en el mismo orden que los parámetros del constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Injectable (...deps: (new (...args: any[]) => any)[]) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (target: new (...args: any[]) => any): void {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(target as any).inject = deps
	}
}
