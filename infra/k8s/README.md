# FIQ Kubernetes Plan

Este directorio queda reservado para los manifiestos Kubernetes de staging y producción.

## Estructura prevista

```text
infra/k8s/
├── base/
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── services.yaml
│   ├── configmap.yaml
│   ├── secrets.example.yaml
│   ├── network-policies.yaml
│   └── backup-cronjobs.yaml
└── overlays/
    ├── staging/
    └── production/
```

## Reglas

- No versionar secretos reales.
- Usar `Secret`, SealedSecrets o External Secrets.
- Bases de datos críticas con operadores o servicios HA externos.
- `readinessProbe`, `livenessProbe`, requests y limits obligatorios.
- Cloudflare Tunnel o Ingress controlado como entrada pública.
