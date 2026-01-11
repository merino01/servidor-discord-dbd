# Guía de Desarrollo - Bot de Discord

## Arquitectura del Proyecto

Este es un monorepo NX con las siguientes aplicaciones:

- **apps/bot**: Bot de Discord (discord.js v14+)
- **apps/dashboard/server**: Backend del dashboard (Express)
- **apps/dashboard/client**: Frontend del dashboard (Vue 3)
- **packages/mongo**: Modelos compartidos de MongoDB

## Patrones Establecidos

### 1. Sistema de Eventos

El bot utiliza un sistema de eventos tipado basado en `EventEmitter`:

```typescript
import { botEvents } from "@/core/events/bot-events"

// Emitir eventos
botEvents.emit("command:executed", {
  guildId, userId, username, commandName, commandPath, options, channelId, success
})

// Escuchar eventos
botEvents.on("command:executed", async (data) => {
  // Manejar el evento
})
```

**Eventos disponibles:**
- `command:executed` - Comando ejecutado exitosamente
- `command:error` - Error en ejecución de comando
- `message:created`, `message:deleted`, `message:edited` - Eventos de mensajes
- `voice:join`, `voice:leave`, `voice:move` - Eventos de voz
- `member:join`, `member:leave` - Eventos de miembros
- `moderation:timeout`, `moderation:kick`, `moderation:ban` - Eventos de moderación

### 2. Singleton del Bot

Para acceder al cliente del bot desde cualquier lugar:

```typescript
import { BotInstance } from "@/core/bot-instance"

const bot = BotInstance.get() // Lanza error si no está inicializado
const bot = BotInstance.getOrNull() // Retorna null si no está inicializado

if (BotInstance.isInitialized()) {
  // El bot está disponible
}
```

### 3. Comandos Slash

Los comandos extienden `BaseCommand` y usan decoradores:

```typescript
import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@core/decorators/command.decorators"
import { CommandContext, OptionType } from "@types"

export class MiComando extends BaseCommand {
  async execute(context: CommandContext): Promise<void> {
    const { interaction } = context
    // Lógica del comando
  }
}

registerCommand(MiComando, {
  name: "micomando",
  description: "Descripción del comando",
  permissions: PermissionFlagsBits.Administrator,
  guildOnly: true
})
```

**Para subcomandos:**

```typescript
async miSubcomando(context: CommandContext): Promise<void> {
  // Lógica del subcomando
}

registerSubCommand(MiComando, "miSubcomando", {
  name: "mi-subcomando",
  description: "Descripción del subcomando",
  options: [
    {
      name: "parametro",
      description: "Descripción del parámetro",
      type: OptionType.STRING,
      required: true
    }
  ]
})
```

### 4. Sistema de Logs

El sistema de logs almacena eventos en MongoDB y envía embeds a canales configurados:

**Modelos:**
- `LogConfigModel` - Configuración de logs por servidor (guild)
- `CommandLogModel` - Historial de comandos ejecutados

**Configuración por tipo:**
- `commands` - Logs de comandos
- `messages` - Logs de mensajes (creados, editados, eliminados)
- `voice` - Logs de voz (join, leave, move)
- `moderation` - Logs de moderación (timeouts, kicks, bans)
- `members` - Logs de miembros (join, leave)

**Uso:**
```typescript
import { LogConfigModel, LogType } from "@org/mongo"

const config = await LogConfigModel.findOne({ guildId })
if (config?.commands.enabled && config.commands.channelId) {
  // Enviar log al canal configurado
}
```

## Convenciones de Código

### ESLint y TypeScript

**REGLAS ESTRICTAS - DEBEN SEGUIRSE SIEMPRE:**

1. **NUNCA usar `any`** - Solo en casos extremadamente necesarios (99% de los casos NO lo es)
   - Usar tipos específicos: `string`, `number`, `boolean`, `Type[]`
   - Usar tipos de discord.js: `ChatInputCommandInteraction`, `Guild`, `User`, etc.
   - Usar interfaces propias: `ILogConfig`, `ICommandLog`, etc.
   - Usar `unknown` si realmente no se conoce el tipo, y luego hacer type guards
   - Si tienes que usar `any`, dejar un comentario explicando POR QUÉ es necesario

2. **Complejidad de funciones** - Máximo complejidad ciclomática de 15
   - Si ESLint marca complejidad alta: dividir en funciones más pequeñas
   - Usar `Record<>` o mapas en lugar de múltiples `if/else` o `switch` largos
   - Extraer lógica compleja a helper methods privados

3. **Tamaño de funciones** - Máximo 50 líneas por función
   - Si una función es muy larga, dividir en helper methods
   - Una función = una responsabilidad
   - Los helper methods deben ser privados y descriptivos

4. **Máximo 3-4 parámetros** - Usar interfaces para agrupar parámetros
   - Si tienes más de 4 parámetros, crear una interface
   - Mejora legibilidad y mantenibilidad

5. **Override en clases** - Usar keyword `override` cuando se sobrescriben métodos
   - TypeScript detectará errores si el método padre cambia
   - Hace explícito que estás sobrescribiendo

6. **No más de 3 niveles de anidación** - Reduce indentación
   - Usar early returns en lugar de if-else anidados
   - Extraer bloques complejos a funciones

**Ejemplo de interfaces para parámetros:**

```typescript
interface CommandLogData {
  guildId: string
  userId: string
  username: string
  commandName: string
  commandPath: string
  options: Record<string, unknown> // ❌ NO: Record<string, any>
  channelId: string
  success: boolean
  error?: string
}

async function saveLog(data: CommandLogData): Promise<void> {
  // ✅ Mucho mejor que tener 9 parámetros individuales
}
```

**Ejemplo de reducción de complejidad:**

```typescript
// ❌ MAL - Complejidad alta con switch
private updateConfig(config: ILogConfig, tipo: LogType, valor: boolean): void {
  switch (tipo) {
    case LogType.COMMANDS:
      config.commands.enabled = valor
      break
    case LogType.MESSAGES:
      config.messages.enabled = valor
      break
    // ... 10 cases más
  }
}

// ✅ BIEN - Usando Record/Map
private updateConfig(config: ILogConfig, tipo: LogType, valor: boolean): void {
  const configMap: Record<LogType, { enabled: boolean }> = {
    [LogType.COMMANDS]: config.commands,
    [LogType.MESSAGES]: config.messages,
    [LogType.VOICE]: config.voice,
    // ...
  }
  configMap[tipo].enabled = valor
}
```

**Ejemplo de función larga dividida en helpers:**

```typescript
// ❌ MAL - Función de 100+ líneas
async execute(context: CommandContext): Promise<void> {
  // 30 líneas de validación
  // 40 líneas de procesamiento
  // 30 líneas de respuesta
}

// ✅ BIEN - Dividida en helpers
async execute(context: CommandContext): Promise<void> {
  const validated = await this.validateInput(context)
  if (!validated) return
  
  const result = await this.processCommand(validated)
  await this.sendResponse(context, result)
}

private async validateInput(context: CommandContext): Promise<ValidatedData | null> {
  // 30 líneas de validación
}

private async processCommand(data: ValidatedData): Promise<Result> {
  // 40 líneas de procesamiento
}

private async sendResponse(context: CommandContext, result: Result): Promise<void> {
  // 30 líneas de respuesta
}
```

### Discord.js v14+

- **Mensajes efímeros:** `flags: MessageFlags.Ephemeral` (no usar `ephemeral: true`)
- **Interacciones:** Siempre usar `ChatInputCommandInteraction` tipado
- **Verificar guildId:** Siempre verificar `interaction.guildId` para comandos de servidor

```typescript
if (!interaction.guildId) {
  await interaction.reply({ 
    content: "Este comando solo funciona en servidores.", 
    flags: MessageFlags.Ephemeral 
  })
  return
}
```

## Estructura de Módulos

Los módulos del bot siguen esta estructura:

```
modules/
  nombre-modulo/
    index.ts                      # Punto de entrada del módulo
    slash-commands/
      comando.command.ts          # Comandos slash
    listeners/
      evento.listener.ts          # Listeners de eventos
    services/
      servicio.service.ts         # Lógica de negocio
```

**Ejemplo de módulo completo:**

```typescript
// modules/logs/index.ts
import "./slash-commands/logs.command"
import "./listeners/command-logs.listener"
```

## MongoDB

### Modelos

Los modelos se definen en `packages/mongo/src/models/`:

```typescript
import { Schema, model, Document } from "mongoose"

export interface IMiModelo extends Document {
  campo1: string
  campo2: number
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<IMiModelo>({
  campo1: { type: String, required: true },
  campo2: { type: Number, required: true }
}, { timestamps: true })

// Índices para optimizar queries
schema.index({ campo1: 1 })
schema.index({ campo1: 1, createdAt: -1 })

export const MiModelo = model<IMiModelo>("MiModelo", schema)
```

### Exportar modelos

Siempre exportar desde `packages/mongo/src/index.ts`:

```typescript
export * from "./models/mi-modelo.model"
```

## Despliegue

### PM2

El proyecto usa PM2 para deployment. Configuración en `ecosystem.config.js`:

```javascript
{
  name: "discord-bot",
  script: "./apps/bot/dist/main.js",
  cwd: process.cwd(),
  instances: 1,
  autorestart: true
}
```

**Comandos:**
- Build: `nx build bot`
- Start: `pm2 start ecosystem.config.js`
- Logs: `pm2 logs discord-bot`

### Configuración

El archivo `config.json` debe estar en la raíz del proyecto y se copia automáticamente a `dist/` durante el build.

**Ejemplo de config.json:**

```json
{
  "token": "tu-token-aqui",
  "clientId": "tu-client-id",
  "guildId": "tu-guild-id-de-prueba",
  "mongodb": {
    "uri": "mongodb://localhost:27017/discord-bot"
  }
}
```

## Logger

El proyecto usa un logger customizado:

```typescript
import { botLogger } from "@/core/logger"

const myLogger = botLogger.child("mi-modulo")

myLogger.info("Información")
myLogger.warn("Advertencia")
myLogger.error("Error:", error)
```

## Testing

- **Unit tests:** Jest para el bot y servidor
- **E2E tests:** Playwright para el cliente
- Ejecutar tests: `nx test nombre-proyecto`

## Comandos Útiles de NX

```bash
# Build
nx build bot
nx build dashboard-server
nx build dashboard-client

# Desarrollo
nx serve bot
nx serve dashboard-server
nx serve dashboard-client

# Tests
nx test bot
nx e2e bot-e2e

# Lint
nx lint bot

# Ver dependencias
nx graph
```

## Dashboard

El dashboard sirve el frontend desde Express en producción:

```typescript
// En producción
app.use(express.static(path.join(__dirname, "dist-client")))
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "dist-client", "index.html"))
  }
})
```

Build: 
1. `nx build dashboard-client`
2. `node scripts/copy-client-dist.js`
3. `nx build dashboard-server`

## Notas Importantes

1. **Siempre registrar el bot instance** en `bootstrap.ts`: `BotInstance.set(client)`
2. **Importar módulos** en `bootstrap.ts` para registrar comandos y listeners
3. **Verificar permisos** en comandos que requieren permisos específicos
4. **Manejar errores** con try-catch y logger apropiado
5. **Usar interfaces** para reducir complejidad y mejorar tipado
6. **Emitir eventos** para mantener el sistema desacoplado y extensible
