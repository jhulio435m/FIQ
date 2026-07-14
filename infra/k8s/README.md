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

## Nodos objetivo

- `fiq-node-1`: `100.79.244.99`, WireGuard `10.77.0.1`.
- `fiq-node-2`: `147.224.242.204`, WireGuard `10.77.0.2`.
- `fiq-node-3`: host local `arch`, WireGuard `10.77.0.3`.
- `fiq-watcher-1`: `167.234.255.122`, watcher externo; no participa en quorum.

Para Kubernetes HA se recomienda `k3s` o `kubeadm` con 3 servers/control-plane. No iniciar el clúster hasta que WireGuard esté activo en los tres nodos y `10.77.0.1/2/3` respondan entre sí.
