# FollowUpGC

App web local-first para llevar seguimiento de un grupo celular: personas, asistencias semanales, reuniones no realizadas y bitacora cronologica por persona.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4 con `@tailwindcss/vite`
- Zustand persist para almacenamiento local
- date-fns para fechas
- lucide-react para iconos

## Comandos

```bash
pnpm dev
pnpm lint
pnpm build
```

## Estructura relevante

- `src/domain`: contratos del dominio y datos semilla.
- `src/store`: estado persistido y mutaciones.
- `src/lib`: utilidades compartidas.
- `docs/ai`: contexto para agentes, decisiones y grafo de componentes.
- `AGENTS.md`: guia rapida para futuros agentes.
