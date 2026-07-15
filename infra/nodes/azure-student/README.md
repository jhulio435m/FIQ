# Nodo Azure Student

Nodo provisionado con beneficio estudiantil/cloud credits y llave local:

- Host: `147.224.242.204`
- SSH: `ubuntu@147.224.242.204`
- Llave local: `/home/blink/downloads/ssh-key-2026-07-01.key`
- Hostname: `abc`
- Sudo: sin contraseña para `ubuntu`
- CPU: 4 vCPU
- RAM: 23 GiB
- Disco: 45 GiB, 41 GiB libres al alta
- Arquitectura: `aarch64`
- Virtualización: KVM
- Rol: `fiq-node-2`
- WireGuard objetivo: `10.77.0.1/24`

## Estado

- `wireguard-tools`: instalado.
- `curl` y `ca-certificates`: instalados.
- Docker/Podman/k3s/kubectl: pendiente.
- Swap: no configurado.

## WireGuard

Clave pública del nodo:

```text
omgitWa0/CnOBbzMaZtIDSU4liXlxJAadEbrgk1HDyM=
```

La clave privada vive solo en `/etc/wireguard/privatekey` dentro del servidor y no debe copiarse al repo.

## Próximo paso

Abrir UDP `51820` en el firewall del proveedor/cloud security group y configurar `wg0.conf` cuando existan las claves públicas de `fiq-node-1`, `fiq-node-3` y, opcionalmente, `fiq-watcher-1`.
