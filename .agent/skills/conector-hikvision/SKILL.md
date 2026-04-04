---
name: Debugging del Conector Hikvision
description: Protocolos para analizar fallas de conexión, sincronización y redes en el microservicio biométrico de Hikvision sin alterar el código prematuramente.
---

# Protocolo del Conector Hikvision

Este servicio se encarga de hablar con los dispositivos biométricos. Es extremadamente sensible a la red. Cuando haya fallas (como errores de heartbeats o sincronización de empleados), sigue estos pasos **antes** de modificar cualquier línea de código:

## 1. Regla de Oro
- **No cambies el código fuente como primer impulso**. El 90% de los errores aquí son problemas de red local, configuración de Docker o dispositivos apagados.

## 2. Diagnóstico de Errores de Red
- Si ves `connect ECONNREFUSED`: Significa que el servidor de base de datos o el dispositivo está físicamente inaccesible o bloqueado por un firewall en la IP/puerto destino.
- Si ves `getaddrinfo ENOTFOUND host.docker.internal`: Esto indica que el conector dentro del contenedor Docker no sabe cómo resolver la dirección IP de la máquina host. Revisa la configuración del `docker-compose.yml` (`extra_hosts` o la red puenteada) en lugar del archivo `.js`.

## 3. Discrepancias de Datos
- Las IDs que manejan las terminales (Biometric IDs o EmpNo) pueden diferir del `id` principal de la base de datos.
- Confía en el mapeo a través de campos como `externalId` o `employeeNo`. Nunca intentes forzar un UPDATE masivo de IDs sin analizar ambos esquemas a fondo primero.
