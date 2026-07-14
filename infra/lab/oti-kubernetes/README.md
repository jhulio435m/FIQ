# Laboratorio Kubernetes en `oti`

Este laboratorio reemplaza la idea de una VM en `oti` para pruebas. El VPS no expone extensiones de virtualización (`vmx/svm = 0`), por lo que KVM/libvirt no es viable. Para pruebas se usa Kubernetes en contenedores o k3s host-only.

## Host

- SSH: `oti@100.79.244.99`
- CPU: 4 vCPU visibles
- RAM: 7.6 GiB
- Disco: 932 GiB, bajo uso
- Runtime: Podman con emulación Docker CLI
- Tailscale: activo en `100.79.244.99`
- WireGuard tools: instalado

El script detecta el socket rootless de Podman (`/run/user/$UID/podman/podman.sock`) y exporta `DOCKER_HOST` para que `k3d` no intente usar el socket rootful.

## Opción Recomendada: k3d/k3s en contenedores

Uso general:

```bash
./infra/lab/oti-kubernetes/setup_k3d_lab.sh
```

En `oti`, k3d necesita el socket rootful de Podman para crear su contenedor tools:

```bash
K3D_USE_SUDO=1 ./infra/lab/oti-kubernetes/setup_k3d_lab.sh
```

Por defecto publica el load balancer en `18080` y `18443`, porque `8080` ya puede estar ocupado por servicios existentes. Se puede cambiar con `K3D_HTTP_PORT` y `K3D_HTTPS_PORT`.

Ventajas:

- No requiere KVM.
- No interfiere con el host como un Kubernetes permanente.
- Permite simular control-plane + workers.
- Fácil de destruir y recrear.
- Usa timeouts de descarga para fallar rápido si `dl.k8s.io` o GitHub no responden.

Limitación:

- No representa failure domains reales. Es laboratorio, no HA productiva.

## Opción Alternativa: k3s en host

Solo usar si se necesita probar `kubectl`, manifests y cloudflared sobre un nodo real:

```bash
curl -sfL https://get.k3s.io | sh -
sudo kubectl get nodes
```

Esto instala servicios systemd en el host, por lo que debe tratarse como cambio operativo.

## Criterio

Para pruebas de manifests y CI/CD, usar k3d. Para pruebas de red real entre nodos `10.77.0.x`, usar WireGuard + k3s cuando `fiq-node-1` tenga sudo/root.

Para destruir el laboratorio:

```bash
K3D_USE_SUDO=1 ./infra/lab/oti-kubernetes/destroy_k3d_lab.sh
```
