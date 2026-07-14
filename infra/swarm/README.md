# FIQ Docker Swarm Fallback

Docker Swarm queda como alternativa si se necesita HA sencilla en VPS antes de Kubernetes.

## Alcance

- Replicar backend y frontend.
- Usar overlay network.
- Usar Docker secrets.
- Mantener PostgreSQL HA y MongoDB replica set como servicios de datos externos o cuidadosamente fijados por nodo.
- Rolling updates y rollback para servicios stateless.

## No recomendado

- No usar Swarm como sustituto completo de Kubernetes para crecimiento institucional.
- No mover datos críticos sin estrategia de volúmenes, backups y restore probado.
