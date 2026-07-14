# UNIVERSIDAD NACIONAL DEL CENTRO DEL PERÚ
## FACULTAD DE INGENIERÍA DE SISTEMAS

---

### INFORME TÉCNICO
**"Diseño de Arquitectura de Alta Disponibilidad de 3 Nodos mediante SQL Server Always On y Windows Server Failover Clustering (WSFC)"**

#### INTEGRANTES
* Morán de la Cruz Jhulio Alessandro
* Palomino Chacon Hernando
* Pando Vargas Josue Samuel
* Porras Falcon Alexander Neil
* Vargas Laime Andy Rodick

#### DOCENTE
* Mercado Rivas Richard Yuri

**HUANCAYO — PERÚ**  
**2026**

---

## 1. Introducción

El presente informe técnico describe el diseño y la implementación de una arquitectura de alta disponibilidad (HA) de **3 nodos** para la **Plataforma de Biblioteca Digital de la Facultad de Ingeniería Química (FIQ-UNCP)**. La solución interconecta tres servidores bajo el sistema operativo **Windows Server 2022 Datacenter**: un servidor físico local (**PC Local**) y dos servidores virtuales remotos en la nube de Azure (**VPS 2** y **VPS 3**).

La base de datos relacional se gestiona mediante **SQL Server 2022 Developer Edition**, aprovechando la tecnología nativa de **Always On Availability Groups** implementada sobre un clúster de conmutación por error de Windows (**Windows Server Failover Clustering - WSFC**). 

Los tres nodos están integrados en una red privada virtual (VPN) segura de **WireGuard** y unidos a un dominio de **Active Directory (AD DS)**. Toda la redirección del tráfico transaccional CRUD de los usuarios y de las herramientas de inteligencia de negocios (**PowerBI**) se realiza mediante el **Availability Group Listener**, garantizando que el servicio continúe operando de manera transparente e ininterrumpida frente a fallas en cualquiera de las réplicas.

---

## 2. Objetivos

### Objetivo General
Implementar una arquitectura de alta disponibilidad activa-pasiva de 3 nodos (1 local y 2 en Azure) utilizando WSFC y SQL Server Always On, asegurando failover automático y balanceo de lecturas sin pérdida de datos.

### Objetivos Específicos
* Configurar la PC Local como nodo primario activo principal (`SQL-PROD-01`) para las operaciones de escritura/lectura del CRUD de la Biblioteca.
* Configurar el VPS 2 Azure como nodo secundario pasivo síncrono (`SQL-HA-02`) para soporte inmediato de failover automático con pérdida de datos cero (RPO = 0).
* Configurar el VPS 3 Azure como nodo secundario de recuperación ante desastres (`SQL-DR-03`) en modo de confirmación síncrona o asíncrona, actuando como réplica legible dedicada para la ingesta de datos de **PowerBI**.
* Establecer el quórum del clúster mediante voto mayoritario nativo de 3 nodos (sin necesidad de testigos de disco o de recurso compartido externos).
* Desactivar el caché de identidades (`IDENTITY_CACHE = OFF`) en las instancias SQL Server para prevenir saltos de secuencia en las columnas autoincrementales ante conmutaciones de nodos.
* Utilizar el **Availability Group Listener** (`AG-LISTENER-FIQ`) para enrutar automáticamente las conexiones del backend CRUD al nodo primario activo.

---

## 3. Arquitectura de Red e Infraestructura de 3 Nodos

La topología distribuye los roles y la replicación para equilibrar la disponibilidad local y la redundancia en la nube:

```
                            ┌──────────────────────────────┐
                            │    Clientes Web / PowerBI    │
                            └──────────────┬───────────────┘
                                           │
                               (Túnel Seguro Cloudflare)
                                           │
                                           ▼
                               [Backend / Express CRUD]
                                           │
                             (Conecta a: AG-LISTENER-FIQ)
                                           │
            ┌──────────────────────────────┼──────────────────────────────┐
            ▼                              ▼                              ▼
   [PC Local (WS 2022)]           [VPS 2 Azure (WS 2022)]        [VPS 3 Azure (WS 2022)]
   - Host: SQL-PROD-01            - Host: SQL-HA-02              - Host: SQL-DR-03
   - PRIMARY (R/W)                - SECONDARY (Replica HA)       - SECONDARY (Replica Read-Only)
   - Replicación Síncrona         - Replicación Síncrona         - Replicación Síncrona
   - 1 Voto                       - 1 Voto                       - 1 Voto
```

### 3.1. Gestión de Quórum en Clúster de 3 Nodos
Al contar con **3 nodos activos** en el clúster WSFC, el sistema dispone de un número impar de votos nativos (**3 votos en total**):
* **Quórum mayoritario:** Se requiere una mayoría simple de votos activos para mantener el clúster en línea (mínimo **2 votos**).
* **Escenario de Falla 1 (Caída de PC Local):** Los dos nodos en Azure (`SQL-HA-02` y `SQL-DR-03`) permanecen activos, sumando 2 votos. El clúster mantiene el quórum y promueve automáticamente al `SQL-HA-02` a rol PRIMARY sin caída del servicio.
* **Escenario de Falla 2 (Caída de un VPS):** La PC Local y el VPS restante suman 2 votos, manteniendo el clúster activo de forma transparente.

Esta topología es sumamente robusta ya que no requiere configurar recursos compartidos de red adicionales (*File Share Witness*) o discos de quórum en la nube para arbitraje de votos.

### 3.2. Seguridad y Cuentas de Servicio Administradas por el Grupo (gMSA)
Para la autenticación mutua de los Endpoints de replicación de base de datos (puerto `5022`) sin requerir la gestión y rotación manual de certificados digitales en cada nodo, se implementa una cuenta de servicio administrada por el grupo (**gMSA** - *Group Managed Service Account*) en Active Directory:
* Se registra la cuenta de servicio `fiq\gmsa_sql$` en el dominio de Active Directory.
* Se configuran las instancias de SQL Server de los 3 nodos para que inicien bajo la cuenta `fiq\gmsa_sql$`.
* Los endpoints se configuran para autenticar mediante Kerberos utilizando los Service Principal Names (SPN) asociados a la cuenta de servicio de forma 100% nativa.

---

## 4. Estructura de la Base de Datos Relacional

La base de datos `fiq_prod` se almacena en el grupo de disponibilidad y contiene las siguientes relaciones relacionales:
* **Entidades:** `recursos` (PDFs subidos), `cursos` (cátedras académicas), `user` (perfiles de alumnos/docentes) y `roles` (permisos de seguridad).
* **Auditoría:** `registro_actividades` (logs de descargas y visualizaciones leídos periódicamente por PowerBI).

### 4.1. Prerrequisitos de Base de Datos y Modelo de Recuperación Completo
Antes de agregar la base de datos `fiq_prod` al Availability Group, es requisito indispensable preparar la base de datos estableciendo su modelo de recuperación en **completo** (Full Recovery Model) y ejecutando un backup completo del registro para iniciar la cadena de logs:
```sql
-- 1. Establecer modelo de recuperación FULL
ALTER DATABASE [fiq_prod] SET RECOVERY FULL;

-- 2. Ejecutar backup del log para iniciar cadena de transacciones
BACKUP DATABASE [fiq_prod] TO DISK = 'C:\Backup\fiq_prod_init.bak';
```

Para evitar que la secuencia numérica de los registros de la biblioteca salte de ID sumando +1000 tras un reinicio de servicio o failover forzado de cualquiera de las réplicas, se desactiva el caché de identidad en las tres instancias de SQL Server:
```sql
ALTER DATABASE SCOPED CONFIGURATION SET IDENTITY_CACHE = OFF;
```

---

## 5. Funcionamiento del Availability Group Listener y Enrutamiento de Lectura

El **Availability Group Listener** (`AG-LISTENER-FIQ.fiq.local`) se encarga de la conmutación de red:
* **Escrituras (CRUD):** El backend se conecta al Listener. La conexión se redirige automáticamente al host que posea el rol PRIMARY (por defecto, el PC Local `SQL-PROD-01`).
* **Lecturas de Reportería (PowerBI):** PowerBI se conecta al Listener incluyendo la propiedad de intención de lectura en su cadena de conexión (`ApplicationIntent=ReadOnly`). El Listener detecta la propiedad y desvía la carga de consulta hacia el nodo pasivo legible `SQL-DR-03` (VPS 3), liberando de carga computacional al nodo de producción principal.

### 5.1. Configuración de la Lista de Enrutamiento de Solo Lectura (Read-Only Routing List)
Para que SQL Server pueda derivar la intención de lectura al nodo VPS 3 de forma automatizada, se debe programar la lista de enrutamiento en cada una de las réplicas. El siguiente script SQL define las prioridades de desvío cuando `SQL-PROD-01` actúa como réplica primaria:
```sql
-- Configurar la URL de enrutamiento en cada réplica
ALTER AVAILABILITY GROUP [AG_FIQ]
MODIFY REPLICA ON N'SQL-PROD-01' WITH (PRIMARY_ROLE (READ_ONLY_ROUTING_LIST = (N'SQL-DR-03', N'SQL-HA-02')));

ALTER AVAILABILITY GROUP [AG_FIQ]
MODIFY REPLICA ON N'SQL-HA-02' WITH (PRIMARY_ROLE (READ_ONLY_ROUTING_LIST = (N'SQL-DR-03', N'SQL-PROD-01')));

-- Definir las URLs legibles TCP para enrutamiento
ALTER AVAILABILITY GROUP [AG_FIQ]
MODIFY REPLICA ON N'SQL-PROD-01' WITH (SECONDARY_ROLE (READ_ONLY_ROUTING_URL = N'TCP://SQL-PROD-01.fiq.local:1433'));

ALTER AVAILABILITY GROUP [AG_FIQ]
MODIFY REPLICA ON N'SQL-DR-03' WITH (SECONDARY_ROLE (READ_ONLY_ROUTING_URL = N'TCP://SQL-DR-03.fiq.local:1433'));
```

---

## 6. Procedimientos de Failover y Failback

### 6.1. Failover Automático
1. Si la PC Local `SQL-PROD-01` se desconecta o falla, el clúster WSFC detecta la pérdida de latidos de red.
2. Al mantener la mayoría de votos en Azure (2 de 3 votos), el clúster ejecuta un **failover automático**.
3. La instancia SQL Server de `SQL-HA-02` (VPS 2) es promovida inmediatamente a **PRIMARY** activo.
4. El Listener actualiza la asignación IP y enruta todo el tráfico de escrituras del CRUD hacia el VPS 2 de forma automática.

### 6.2. Failback Automático
1. Cuando la PC Local `SQL-PROD-01` se enciende y reconecta a la VPN WireGuard, WSFC la reincorpora en rol secundario.
2. Always On sincroniza automáticamente el registro de transacciones acumulado en la réplica local desde el VPS 2.
3. Al alcanzar el estado `SYNCHRONIZED`, el clúster de conmutación por error realiza un failback planificado.
4. `SQL-PROD-01` recupera el rol de **PRIMARY** y el Listener desvía la conexión CRUD principal de vuelta al PC Local.
5. El VPS 2 retorna a su estado secundario pasivo síncrono.

---

## 7. Conclusión

El diseño de un clúster de alta disponibilidad de **3 nodos** (PC Local, VPS 2 y VPS 3) con SQL Server Always On y WSFC es la arquitectura recomendada para aplicaciones críticas como la **Biblioteca Digital FIQ-UNCP**. 

El uso de un clúster de 3 nodos elimina dependencias de recursos testigos externos de quórum. Adicionalmente, la implementación del **Availability Group Listener** y la configuración de intención de lectura permiten separar las operaciones CRUD del tráfico analítico de **PowerBI**, logrando una arquitectura óptima, redundante y de rendimiento superior.
