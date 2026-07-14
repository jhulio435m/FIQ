# FIQ WireGuard Overlay

Red privada prevista para Kubernetes HA, Patroni/etcd y MongoDB replica set.

## Nodos

| Nodo | Host público/Tailscale | WireGuard |
| :--- | :--- | :--- |
| `fiq-node-1` | `jhulio@167.234.255.122` | `10.77.0.1/24` |
| `fiq-node-2` | `oti@100.79.244.99` | `10.77.0.2/24` |
| `fiq-node-3` | local `100.126.122.28` | `10.77.0.3/24` |

## Estado

- `fiq-node-2`: `wireguard-tools` instalado.
- `fiq-node-3`: `wireguard-tools` instalado.
- `fiq-node-1`: pendiente. El usuario `jhulio` no tiene sudo y no se pudo instalar WireGuard.

## Puertos

- WireGuard: UDP `51820` entre los tres nodos.
- Kubernetes API: TCP `6443` solo por red privada/VPN.
- etcd: TCP `2379-2380` solo por red privada/VPN.
- PostgreSQL/Patroni: TCP `5432`, `8008`, `5000`, `5001` solo por red privada/VPN.
- MongoDB: TCP `27017` solo por red privada/VPN.

## Reglas

- No versionar claves privadas WireGuard.
- Generar claves en cada nodo con `wg genkey`.
- Guardar `/etc/wireguard/wg0.conf` con permisos `600`.
- Usar `systemctl enable --now wg-quick@wg0`.
- Validar con `ping 10.77.0.x` y `wg show`.
