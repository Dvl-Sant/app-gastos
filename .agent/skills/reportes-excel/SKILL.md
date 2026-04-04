---
name: Generación y Formateo de Reportes Excel
description: Reglas y estándares para la creación de reportes Excel usando exceljs, incluyendo formatos de fecha, colores institucionales y estilos de tabla.
---

# Reglas para Reportes Excel en ChecadorObras

Esta habilidad debe usarse SIEMPRE que se modifiquen o creen nuevas funciones de exportación a Excel (ej. `reportExcelGenerator.ts`).

## 1. Librería Principal
- Usar siempre `exceljs`. No utilizar otras librerías para exportar a Excel a menos que se indique explícitamente.

## 2. Estilo Corporativo y Cabeceras
- Las cabeceras de las tablas deben tener un fondo oscuro institucional (por ejemplo, `#2F5597` o un color acorde al diseño actual).
- El texto de las cabeceras debe ser **blanco** y en **negritas** (bold).
- Las columnas de la cabecera siempre deben ir en MAYÚSCULAS o Capitalizadas uniformemente.

## 3. Formato de Fechas y Datos
- Las fechas siempre deben formatearse con el patrón `DD/MM/YYYY`.
- Si se incluyen horas, usar el formato `DD/MM/YYYY HH:mm`.
- Asegurarse de que el timezone (ej. `America/Mexico_City`) se aplique correctamente antes de pintar la fecha en el Excel.

## 4. Estructura del Archivo
- Agrupar la información de manera lógica (por ejemplo: primero por Obra/Site, luego por Área).
- Auto-ajustar el ancho de las columnas (width) basándose en el contenido de cada una, para evitar que los textos se corten.
- El nombre del archivo exportado siempre debe ser descriptivo e incluir la fecha de generación, ej: `Reporte_Horas_Extras_2026-02-28.xlsx`.
