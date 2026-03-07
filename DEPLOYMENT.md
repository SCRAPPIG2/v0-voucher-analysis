# CONTROLBANKDS - Guia de Despliegue

## App Profesional de Deteccion de Fraude Bancario
Sistema sin login que detecta duplicados, sospecha fraude y guarda permanentemente en PostgreSQL.

---

## PASO 1: Conectar Base de Datos (5 minutos)

1. Abre el proyecto en v0
2. Click en configuraciones (arriba a la derecha) → "Settings"
3. Section "Connect" → Busca "Neon PostgreSQL"
4. Click "Add Integration"
5. Autoriza el acceso
6. Se creara automaticamente `DATABASE_URL` en tus variables de ambiente

**Confirmacion:** En "Vars" deberia aparecer `DATABASE_URL` con un string largo

---

## PASO 2: Crear Tablas en Neon (2 minutos)

Abre tu dashboard de Neon:
1. Ve a [Neon Console](https://console.neon.tech)
2. Selecciona tu proyecto
3. SQL Editor → Nueva query
4. Copia y pega el contenido de `scripts/init-db-simple.sql`
5. Click "Execute"

**Resultado:** Deberian crearse 2 tablas (`vouchers` y `fraud_alerts`) + 8 indices

---

## PASO 3: Deploy a Vercel (1 minuto)

1. Click "Publish" (arriba a la derecha)
2. Selecciona tu cuenta de Vercel
3. Click "Deploy"
4. Espera 2-3 minutos

**Tu app estara en vivo!**

---

## PASO 4: Usar la Aplicacion

### Primera Vez - Probar
1. Ve a tu URL desplegada
2. Tab "Cargar Voucher"
3. Sube una imagen de comprobante (Nequi, Bancolombia, PSE)
4. Click "ANALIZAR VOUCHER"

**Resultado:**
- OCR extrae los datos
- Sistema detecta si es duplicado o sospechoso
- Se guarda en BD permanentemente

### Tab "Historial"
- Ve todos los vouchers procesados
- Filtra por: Todos, Limpios, Sospechosos, Duplicados
- Los datos persisten en el tiempo ✅

---

## Arquitectura de la Solucion

```
┌─────────────────────────────────────────────────────┐
│         CLIENTE (SIN LOGIN)                         │
│  1. Sube imagen                                     │
│  2. Puter.js OCR extrae datos                       │
│  3. Parsea el formato (Nequi/Bancolombia)           │
│  4. Envia al servidor                               │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│        SERVIDOR (Next.js)                           │
│  1. Analiza fraude (logica critica)                 │
│  2. Busca duplicados en BD                          │
│  3. Crea alertas si hay fraude                      │
│  4. Retorna resultado al cliente                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│     BASE DE DATOS (Neon PostgreSQL)                 │
│  ├─ vouchers (historial persistente)                │
│  └─ fraud_alerts (alertas generadas)                │
└─────────────────────────────────────────────────────┘
```

---

## Deteccion de Fraude Explicada

### Nivel DUPLICATE (Rojo) - 80-100 puntos
```
❌ FRAUDE CRITICO - Accion Requerida

Causas:
- Mismo numero de comprobante/referencia (100%)
- Mismo numero de serie (95%)
- Mismo monto + beneficiario + fecha (80%)

Accion: RECHAZAR transferencia
```

### Nivel SUSPICIOUS (Amarillo) - 30-79 puntos
```
⚠️ REVISAR - Posible Fraude

Causas:
- Multiples transferencias al mismo beneficiario el mismo dia
- Mismo monto a diferentes beneficiarios el mismo dia
- Falta de numero de comprobante

Accion: REVISAR manualmente
```

### Nivel CLEAN (Verde) - 0-29 puntos
```
✅ VALIDO - Sin Fraude Detectado

Resultado: APROBAR transferencia
```

---

## Formatos de Voucher Soportados

### Nequi ✅
```
Envio Realizado
Para: [BENEFICIARIO]
Numero Nequi: [CELULAR]
Referencia: [REF_CODE]
Fecha: 06 de marzo de 2026 a las 03:50 p.m.
Monto: $ 58.857 COP
```

### Bancolombia ✅
```
Transferencia exitosa!
Comprobante No. 0000048000
06 Mar 2026 - 10:18 a m.

Producto destino:
[BENEFICIARIO]
[CUENTA_DESTINO]

Valor: $ 247.900
```

### Otros (En Desarrollo)
- PSE
- Daviplata
- ACH
- Wire Transfers

---

## Datos Que Se Guardan

Para cada voucher se guarda:
- ✅ Fecha, Monto, Beneficiario
- ✅ Numero de Comprobante/Referencia
- ✅ Banco origen y destino
- ✅ Tipo de transferencia
- ✅ Estado de fraude (CLEAN/SUSPICIOUS/DUPLICATE)
- ✅ Puntuacion de fraude (0-100)
- ✅ Razon(es) del fraude (si aplica)
- ✅ OCR crudo (para auditoria)

**Duracion:** Permanente - Los datos nunca se borran

---

## Troubleshooting

### "DATABASE_URL is not defined"
**Solucion:** Neon no esta integrado correctamente
1. Abre Settings → "Connect"
2. Confirma que Neon aparece como "Connected"
3. En "Vars", DATABASE_URL debe estar presente
4. Si no, reconecta Neon

### "relation vouchers does not exist"
**Solucion:** No ejecutaste la migracion SQL
1. Ve a Neon Console
2. Abre SQL Editor
3. Copia el contenido de `scripts/init-db-simple.sql`
4. Ejecuta

### OCR no extrae bien los datos
**Causas posibles:**
1. Imagen muy oscura o desenfocada
2. Texto muy pequeno
3. Formato no soportado aun

**Solucion:**
- Toma foto clara del comprobante
- Asegura que la pantalla este bien iluminada
- Si es Nequi/Bancolombia, deberia funcionar perfecto

---

## Monitoreo y Administracion

### Revisar Alertas Activas
1. Tab "Historial"
2. Filtro "Duplicados" o "Sospechosos"
3. Los ultimos aparecen primero

### Acceder a la Base de Datos
1. Ve a [Neon Console](https://console.neon.tech)
2. SQL Editor
3. Queries utiles:
```sql
-- Ver ultimos vouchers
SELECT * FROM vouchers ORDER BY created_at DESC LIMIT 10;

-- Contar fraudes
SELECT fraud_status, COUNT(*) FROM vouchers GROUP BY fraud_status;

-- Ver alertas criticas
SELECT * FROM fraud_alerts WHERE alert_severity = 'CRITICAL';

-- Buscar por beneficiario
SELECT * FROM vouchers WHERE beneficiary ILIKE '%Juan%';
```

---

## Seguridad

✅ **Sin Contraseñas** - No hay login requerido
✅ **Datos Encriptados en Transito** - HTTPS obligatorio
✅ **BD Privada** - Solo tu app puede acceder via DATABASE_URL
✅ **Sin Datos Personales Criticos** - Solo se guardan nombres, montos, fechas
✅ **Auditoria Completa** - Todo queda registrado con timestamp

---

## Proximo: Escalabilidad

Cuando necesites:
- Exportar reportes
- API para integracion con otros sistemas
- Webhooks para notificaciones en tiempo real
- Soporte para mas formatos de voucher

Avisa y lo agregamos. La arquitectura esta lista para crecer. 🚀
