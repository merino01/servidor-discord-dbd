# Bot de Discord

Bot modular de Discord con sistema de comandos slash basado en decoradores.

## 🚀 Inicio rápido

### 1. Instalar dependencias

```bash
npm install discord.js
npm install -D @types/node
```

### 2. Configurar el bot

Copia `config.example.json` a `config.json` y configura tu bot:

```bash
cp config.example.json config.json
```

Edita `config.json` y configura:
- `discord.token` - Tu token de bot de Discord
- `discord.clientId` - El ID de tu aplicación
- `bot.ownerId` - Tu ID de usuario de Discord
- `discord.guildId` (opcional) - ID del servidor para desarrollo

### 3. Ejecutar el bot

```bash
nx serve bot
```

## 📁 Estructura del proyecto

```
bot/
├── src/
│   ├── core/                    # Sistema base del bot
│   │   ├── base/
│   │   │   └── BaseCommand.ts   # Clase base para comandos
│   │   ├── decorators/
│   │   │   └── command.decorators.ts  # Decoradores @SlashCommand, @SubCommand
│   │   ├── types/
│   │   │   └── command.types.ts # Tipos e interfaces
│   │   ├── BotClient.ts         # Cliente principal del bot
│   │   └── CommandRegistry.ts   # Registro y carga de comandos
│   │
│   ├── modules/                 # Módulos del bot
│   │   └── triggers/           # Módulo de ejemplo
│   │       ├── slash-commands/ # Comandos del módulo
│   │       ├── services/       # Lógica de negocio
│   │       ├── types/          # Tipos del módulo
│   │       └── utils/          # Utilidades
│   │
│   └── main.ts                 # Punto de entrada
```

## 🔧 Crear un comando nuevo

### Comando simple

```typescript
import { BaseCommand } from '../../../core/base/BaseCommand';
import { SlashCommand } from '../../../core/decorators/command.decorators';
import { CommandContext } from '../../../core/types/command.types';

@SlashCommand({
  name: 'ping',
  description: 'Responde con pong',
})
export class PingCommand extends BaseCommand {
  protected async run(context: CommandContext): Promise<void> {
    await context.interaction.reply('🏓 Pong!');
  }
}
```

### Comando con subcomandos

```typescript
@SlashCommand({
  name: 'trigger',
  description: 'Gestiona triggers',
  permissions: [PermissionFlagsBits.ManageGuild],
})
export class TriggerCommand extends BaseCommand {
  
  @SubCommand({
    name: 'crear',
    description: 'Crea un trigger',
  })
  async crear(context: CommandContext): Promise<void> {
    // Tu lógica aquí
  }

  @SubCommand({
    name: 'listar',
    description: 'Lista triggers',
  })
  async listar(context: CommandContext): Promise<void> {
    // Tu lógica aquí
  }
}
```

## 📦 Crear un módulo nuevo

1. Crea una carpeta en `src/modules/nombre-modulo/`
2. Estructura recomendada:
   ```
   nombre-modulo/
   ├── slash-commands/    # Tus comandos
   ├── services/         # Lógica de negocio
   ├── types/           # Tipos TypeScript
   └── utils/           # Funciones auxiliares
   ```
3. Los comandos en `slash-commands/` se cargan automáticamente

## 🎯 Características

- ✅ **Decoradores**: Sistema de decoradores tipo Python para definir comandos
- ✅ **Carga automática**: Los comandos se cargan automáticamente desde `modules/*/slash-commands/`
- ✅ **Subcomandos**: Soporte para subcomandos y grupos de subcomandos
- ✅ **Modular**: Cada módulo es independiente con su propia estructura
- ✅ **TypeScript**: Totalmente tipado con TypeScript
- ✅ **Escalable**: Fácil de extender y mantener

## 📝 Notas

- Los comandos deben exportarse como clases (no como default export)
- Usa `@SlashCommand` para comandos principales
- Usa `@SubCommand` para subcomandos
- El sistema detecta y registra automáticamente todos los comandos
