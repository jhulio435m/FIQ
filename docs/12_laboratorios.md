# 12. Laboratorios Educativos

La pagina de laboratorios usa una arquitectura modular:

`page -> registry -> simulator component -> shared UI -> shared calculations`

Archivos clave:

- `frontend/src/pages/laboratorios.tsx`
- `frontend/src/components/labs/lab-registry.ts`
- `frontend/src/components/labs/lab-simulator.tsx`
- `frontend/src/components/labs/simulator-ui.tsx`
- `frontend/src/lib/labs/calculations.ts`

## Estructura Pedagogica

Cada simulador hereda desde `SimulatorShell`:

- Objetivo de aprendizaje.
- Conceptos clave.
- Simulador interactivo.
- Parametros modificables.
- Metricas y visualizacion.
- Reflexion guiada.
- Checklist.
- Estado completado/no completado.
- Boton completar.
- Boton reiniciar estado.

## Agregar un Simulador

1. Crear el componente en `frontend/src/components/labs/simulators/`.
2. Reusar `NumberControl`, `Metric`, `MetricGrid`, `ChartFrame` y `SimulatorShell`.
3. Colocar formulas compartidas en `frontend/src/lib/labs/calculations.ts`.
4. Registrar el componente en `LAB_SIMULATORS`.
5. Agregar test unitario si introduce comportamiento nuevo.
