MODELO SAAS
DIGITALIZAR LA ADMINISTRACIÓN DE PYMES DE BOLIVIA Y LATAM
Clientes
•	Constructoras 
•	Energía 
•	Importadoras 
•	Retail/comercio
•	Ferreterías 
•	Distribuidoras 
•	Oficinas administrativas 
•	Empresas de servicios técnicos 
•	Minería / industrial
•	Farmacias/salud
2) MÓDULOS DEL SaaS
Tu MVP inicial debe tener:
🔹 Core administrativo
Módulo 1 – Ingresos

•	Creación de usuarios y comunicación interna entre usuarios.
•	Creación de solicitudes internas entre usuarios.
•	Autenticación sistema de verificación de usuario (OAuth2, SAML, o LDAP).
•	Roles diferenciados a solicitud del cliente.

Módulo 2 – Módulo de empresa – Multi empresa

•	Creación de organizaciones / empresas / cuentas 
•	Usuarios por empresa (roles)
•	Configuración de pocas variables (por empresa), (QUE PERMITIR, COMO SAAS)
•	Separación de datos (multi-tenant) 






Módulo 3 Módulo DASBOARD DEL SUPER ADMIN

Módulo 3.1.  Métricas globales del negocio
•	Número total de organizaciones (clientes) 
•	Usuarios totales 
•	Crecimiento mensual 
•	Clientes activos vs inactivos 

Módulo 3.2. Métricas de ingresos
•	MRR (Monthly Recurring Revenue) 
•	Ingresos totales 
•	Clientes por plan 
•	Churn (clientes que se van) 

Módulo 3.3. Gestión de organizaciones
•	Ver todas las empresas 
•	Activar / suspender cuentas 
•	Cambiar planes manualmente 
•	Ver actividad por cliente 

Módulo 3.4. Gestión global de usuarios
•	Ver todos los usuarios del sistema 
•	Bloquear cuentas 
•	Ver comportamiento sospechoso 

Módulo 3.5. Uso del sistema (analytics interno)
•	Qué módulos usan más 
•	Frecuencia de uso 
•	Features más utilizadas.

Módulo 3.6. Monitoreo y alertas
•	Errores del sistema 
•	Caídas 
•	Problemas de pago 
•	Actividad anormal 

Módulo 3.7. Configuración global del SaaS
•	Planes y precios 
•	Límites (usuarios, almacenamiento, etc.) 
•	Features habilitadas 




Módulo 4 – MI TIENDA – ADMINISTRATIVO GENERAL

Módulo 4.1. - Gestión de Usuarios (internos de la empresa)
Cada empresa maneja su equipo.
Incluye:
•	Invitar usuarios 
•	Asignar roles (admin, técnico, vendedor, etc.) 
•	Activar / desactivar accesos 
•	Equipos o áreas (opcional)

Módulo 4.2. Sucursales 
•	Creación de sucursales
•	Dirección, ciudad, contacto 
•	Asignación de empleados a sucursal 

Módulo 4.3 Suscripción
•	Ver en qué plan se encuentra suscrito 
•	Estado actual (tiempo para que se termine)
•	Alerta de 5 días de anticipación para que puedan realizar su pago, una ves terminado el tiempo tiene 3 días extras (gracia), no se realiza se corta el servicio.
•	Opción a cambiar de compra y actualización de un plan de pago (debe estar descrito las 3 categorías)

Módulo 5 Operativo

Módulo 5.1. Dashboard general y por sucursal (solo deben existir indicadores y gráficos, NO SE INCLUYEN TABLAS)
RESULTADOS Y GRAFICOS DE TODO LO DESCRITO ABAJO
•	Cantidad de proveedores actuales.
•	Productos en inventario o almacén
•	STOCK BAJO
•	Ventas (Ingreso – egreso)
•	Utilidad 

Módulo 5.2. Gestión de proveedores
•	Órdenes de compra
•	Registro de Proveedores
•	Datos de contácto 
•	Estado (activo/inactivo).







Módulo 5.3. – Orden de compra (costo real – costo de compra de mercancía)
Incluye:
•	Proveedor 
•	Creación de producto (nombre, SKU, categoría)
•	Cantidad 
•	Precio de compra REAL ✔ 
•	Fecha 
•	Sucursal destino
•	Kardex.
•	Escaneo, código de barra (opcional).

Módulo 5.4. – Producto – inventario - catálogo 

Incluye:
•	Nombre 
•	SKU 
•	Categoría 
•	Precio de venta ✔ 
•	Estado (activo/inactivo).
•	Rotación inventario entre sucursales.


Módulo 6- Ventas

Módulo 6.1. Cotizaciones 
•	Cliente 
•	Productos 
•	Cantidades 
•	Precio de venta 
•	Descuentos 
•	Total 
•	Estado: 
o	Pendiente 
o	Aprobada 
o	Rechazada 
Puede convertirse en venta 

Módulo 6.2. Punto de venta
•	Registro de venta
•	Proformas, recibos
•	Facturas 
•	Descuentos 

MÓDULO 6.3. Caja chica
•	Registro de egresos e ingresos 
•	Categorías (transporte, materiales, etc.) 
•	Saldo actual 

Módulo 7 – Reportes (AQUÍ SE INCLUYEN PLANILLAS, TABLAS DE TODOS LOS MÓDULOS ANTERIORES - HISTORIAL)
Resultados (Búsqueda por tipo: fecha, nombre, producto: día, mes, semana, año)
•	Reporte de proveedores (nombre, empresa, nit, ubicación, código de contacto)
•	Reporte de órdenes de compra (tipo de producto, costo de compra, fecha, sucursal ubicada, categoría, etc.)
•	Reporte de inventario (tipo de producto, cantidad disponible, sucursal, fecha, etc).
•	Reporte de ventas (cliente, costo de venta, fecha, sucursal, tipo de producto vendido, código, categoría, etc)
•	Reporte caja chica (Historial de egresos, cierre de caja)
•	Exportación Excel/PDF.
•	Reporte SIAT impuestos

Módulo 8 - Auditoría avanzada (premium)
Trazabilidad
•	Logs por usuario 
•	Qué se editó 
•	Cambios en precios 
•	Cambios en stock 
•	Trazabilidad total.
 
MODELO MULTICLIENTE 
1 sola plataforma SaaS multi-tenant
Cada cliente entra con:
empresaA.tusistemaAFR.com.bo
empresaB.tusistemaAFR.com.bo

HOSTING: HOSTINGER O OTRA PLATAFORMA
Etapa 1: Hostinger VPS (ideal para arrancar)
•	4 vCPU 
•	🔥 Hostinger KVM 4
•	16 GB RAM 
•	200 GB NVMe 
•	16 TB bandwidth 
•	$12.99/mes promo 
Este te aguanta:
20–50 clientes PYME 
Etapa 2: escalar
Cuando tengas +50 clientes:
•	DigitalOcean 
•	Hetzner 
•	AWS Lightsail 
•	Railway 
Pero para empezar:
Hostinger VPS es perfecto por costo-beneficio
COSTOS E INVERSIÓN INICIAL
Escenario real
Setup inicial
Infra
•	VPS Hostinger KVM4 → $13 
•	dominio → $15/año 
•	backups externos → $10 
•	correo transaccional → $15 
•	SSL → incluido 
•	CDN → opcional $10 
Total mensual infraestructura $38–50/mes
INFORMACIÓN
“La información operativa se conservará por 5 años como mínimo mientras la suscripción permanezca activa. Los registros de auditoría se almacenarán por 24 meses en línea y hasta 5 años en archivos históricos.”

PLANES PROPUESTOS
PLAN STARTER
🟢 PLAN 1 – BÁSICO (Entrada)
Para negocios pequeños (tiendas, emprendimientos)
✔️ Incluye:
Operativo:
•	Productos (catálogo)  (Módulo 5.4.)
•	Ventas (POS básico) (Módulo 6.2.)
•	Reportes (Módulo 7.) 
•	Dashboard básico (Módulo 5.1)
Límites:
•	1-2 sucursales
•	Hasta 2 usuarios (Administrador general, cajero)
•	Inventario simple 
•	Sin compras avanzadas 

No incluye:
•	Reportes avanzados 
•	Caja chica 
•	Compras completas 
•	Roles avanzados 




PLAN 2 – PROFESIONAL (RECOMENDADO)
Tu plan principal (donde ganas dinero)
Incluye TODO lo del básico +
Operativo completo:
•	Gestión de proveedores (Módulo 5.1.)
•	Compras (órdenes de compra) (Módulo 5.3.)
•	Cotizaciones (Módulo 6.1)
Ventas:
•	POS completo 
•	Facturación 
•	Descuentos 
Gestión:
•	Hasta 5–10 usuarios (administrador general, cajero, almacenes, contador-finanzas)
•	2-4 sucursales 
Reportes:
•	Utilidad bruta 
•	Ventas 
•	Inventario 

 Objetivo:
 Empresas reales (la mayoría de tus clientes)
🔴 PLAN 3 – EMPRESARIAL (AVANZADO)
 Para empresas grandes o exigentes
Incluye TODO lo anterior +
Avanzado:
•	Usuarios ilimitados 
•	Sucursales ilimitadas 
•	Caja chica  (Módulo 6.3)
•	Reportes avanzados  
•	Reportes tributarios  
•	Exportaciones 
Gestión:
•	Roles personalizados (Administrador operative, inventario, cajero, vendedor, contador, comercial, auditor interno)
•	Auditoría interna (solo lectura) (Módulo 8) 
•	Configuración avanzada 
Extras:
•	Integraciones futuras 
•	Soporte prioritario
