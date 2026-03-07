# CONTROLBANKDS - Setup Guide

## Configuracion Requerida

### 1. Conectar Neon PostgreSQL
- Ve a las configuraciones del proyecto (arriba a la derecha)
- Seccion "Connect" -> Agrega Neon como integracion
- La URL de conexion se guardara automaticamente en `DATABASE_URL`

### 2. Crear la Base de Datos
Una vez conectado Neon, ejecuta la migracion SQL:

```bash
# Opcion 1: Usar Python (recomendado)
python scripts/migrate.py

# Opcion 2: Ejecutar manualmente el SQL en la consola de Neon
# Copia el contenido de scripts/init-db.sql y ejecutalo en tu dashboard de Neon
```

## Estructura de la Base de Datos

### Tabla `vouchers`
Almacena todos los comprobantes procesados:
- Datos basicos (referencia, transaction ID, monto, fecha)
- Datos del banco (origen, destino, tipo de transferencia)
- Datos del beneficiario/ordenante
- Estado de fraude (CLEAN, SUSPICIOUS, DUPLICATE)
- Puntuacion de fraude (0-100)
- Banderas de fraude (JSON array)

### Tabla `fraud_alerts`
Registra alertas generadas:
- ID del voucher duplicado/sospechoso
- ID del voucher original (para duplicados)
- Tipo de alerta
- Mensaje descriptivo
- Severidad (CRITICAL, HIGH, MEDIUM, LOW)

## Logica de Deteccion de Fraude

1. **DUPLICATE (80-100 puntos)**
   - Comprobante/Referencia exacta duplicada = 100% FRAUDE
   - Serial duplicado = 95%
   - Mismo monto + beneficiario + fecha = 80%

2. **SUSPICIOUS (30-79 puntos)**
   - Multiples transferencias al mismo beneficiario en el mismo dia
   - Mismo monto en la misma fecha a diferentes beneficiarios

3. **CLEAN (0-29 puntos)**
   - Voucher valido, sin signos de fraude

## API Endpoints

### POST /api/analyze-voucher
Analiza un voucher y lo guarda en BD

Request:
```json
{
  "voucherData": {
    "reference_number": "M14046333",
    "transaction_id": "TXN123",
    "beneficiary": "Juan Perez",
    "amount": 58857,
    "issue_date": "2026-03-06",
    "bank_origin": "Nequi",
    ...
  }
}
```

Response:
```json
{
  "success": true,
  "voucher": { ... }, // Registro guardado en BD
  "fraudAnalysis": {
    "status": "CLEAN|SUSPICIOUS|DUPLICATE",
    "score": 0-100,
    "flags": [...]
  }
}
```

### GET /api/vouchers?filter=all
Obtiene el historial de vouchers

Parametros:
- `filter`: all | clean | suspicious | duplicates | fraud
- `limit`: numero de registros (default: 100)

## Uso de la Aplicacion

1. **Tab "Cargar Voucher"**
   - Sube una imagen de comprobante (Nequi, Bancolombia, etc)
   - El OCR extrae los datos automaticamente
   - Se verifica contra la BD para detectar fraudes
   - El resultado se guarda permanentemente

2. **Tab "Historial"**
   - Ve todos los vouchers procesados
   - Filtra por estado (Limpio, Sospechoso, Duplicado)
   - Los datos persisten en el tiempo

## Formatos Soportados

### Nequi
- Fecha: "06 de marzo de 2026"
- Referencia: "M14046333"
- Beneficiario: despues de "Para"
- Numero Nequi: identificador de celular

### Bancolombia
- Fecha: "06 Mar 2026 - 10:18 a m."
- Comprobante: "Comprobante No. 0000048000"
- Beneficiario: dentro de "Producto destino"
- Cuenta destino: formato "799-000260-19" o "*5743"

## Troubleshooting

### Error: "DATABASE_URL is not defined"
- Asegura que Neon esta conectado en la seccion de integraciones
- Verifica que la variable de ambiente DATABASE_URL esta activa

### Error: "RELATION vouchers DOES NOT EXIST"
- La migracion no se ejecuto
- Ejecuta: `python scripts/migrate.py`

### OCR no funciona
- En produccion se usa Puter.js
- En desarrollo puede mostrar datos simulados
- Verifica que el script de Puter.js se carga correctamente
