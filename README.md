# 🛡️ CONTROLBANKDS

**Sistema Profesional de Deteccion de Fraude Bancario**

Aplicacion web sin login que detecta transferencias duplicadas y sospechosas usando OCR y machine learning.

---

## ✨ Caracteristicas Principales

### 🔍 OCR Inteligente
- **Puter.js** para extraccion de texto de imagenes
- Soporta **Nequi, Bancolombia, PSE** y mas
- Extrae automaticamente: fecha, monto, beneficiario, comprobante

### 🚨 Deteccion de Fraude
- **DUPLICATE**: Comprobantes duplicados (100% fraude)
- **SUSPICIOUS**: Patrones sospechosos (revisar manualmente)
- **CLEAN**: Transferencias validas

### 💾 Persistencia Permanente
- **Base de datos PostgreSQL** en Neon
- Los datos se guardan para siempre
- Detecta fraudes dias, semanas o meses despues

### 📊 Historial Filtrable
- Ve todos los vouchers procesados
- Filtro por estado (Limpio, Sospechoso, Duplicado)
- Interfaz limpia y profesional

---

## 🚀 Inicio Rapido

### 1. Conectar Base de Datos (5 min)
```
Settings → Connect → Neon PostgreSQL
```
Se configura automaticamente `DATABASE_URL`

### 2. Crear Tablas (2 min)
Abre [Neon Console](https://console.neon.tech) y ejecuta:
```sql
-- Copiar contenido de: scripts/init-db-simple.sql
```

### 3. Deploy (1 min)
```
Click "Publish" → Deploy a Vercel
```

### 4. ¡Usar! 🎉
- Sube imagen de comprobante
- Sistema detecta fraude automaticamente
- Guarda permanentemente en BD

---

## 📁 Estructura del Proyecto

```
controlbankds/
├── app/
│   ├── page.tsx              # App principal
│   ├── layout.tsx            # Metadata y setup
│   └── api/
│       ├── analyze-voucher/  # POST: Procesar voucher
│       └── vouchers/         # GET: Historial
├── lib/
│   ├── types.ts              # Tipos TypeScript
│   ├── ocr-parser.ts         # Parseo OCR (Nequi, Bancolombia)
│   ├── fraud-detection.ts    # Logica de deteccion
│   ├── puter-ocr.ts          # Integracion Puter.js
│   └── db.ts                 # Queries a Neon PostgreSQL
├── components/               # Componentes reutilizables
├── scripts/
│   ├── init-db-simple.sql    # SQL de migracion
│   └── migrate.py            # Script Python (opcional)
├── DEPLOYMENT.md             # Guia paso a paso
├── SETUP.md                  # Setup tecnico
└── README.md                 # Este archivo
```

---

## 🔐 Seguridad

- ✅ **Sin Login Requerido** - Acceso directo
- ✅ **Datos Encriptados en Transito** - HTTPS
- ✅ **Base de Datos Privada** - Solo tu app
- ✅ **Auditoria Completa** - Todo registrado
- ✅ **Parametrized Queries** - Protegido contra SQL injection

---

## 📖 Documentacion Completa

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Paso a paso para desplegar
- **[SETUP.md](./SETUP.md)** - Configuracion tecnica
- **[API Documentation](./app/api/README.md)** - Endpoints disponibles

---

## 🎯 Casos de Uso

### Fintech / Banco Digital
Detecta transferencias fraudulentas en tiempo real

### Plataforma de Pagos
Verifica comprobantes de clientes automaticamente

### Compliance / Auditoria
Mantiene historial de todas las transacciones verificadas

### E-commerce
Valida comprobantes de pago antes de entregar productos

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Backend**: Next.js 16 (API Routes)
- **Database**: PostgreSQL (Neon Serverless)
- **OCR**: Puter.js
- **UI**: Tailwind CSS + Lucide Icons
- **Deployment**: Vercel

---

## 📊 Metricas y Monitoreo

```sql
-- Ver resumen de fraudes
SELECT fraud_status, COUNT(*) as cantidad
FROM vouchers
GROUP BY fraud_status;

-- Ultimas alertas
SELECT * FROM fraud_alerts
ORDER BY created_at DESC
LIMIT 10;

-- Fraudes por dia
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as transacciones,
  SUM(CASE WHEN fraud_status != 'CLEAN' THEN 1 ELSE 0 END) as fraudes
FROM vouchers
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

---

## 🔄 Flujo de Procesamiento

```
Usuario sube imagen
         ↓
Puter.js OCR extrae texto
         ↓
OCR Parser → Formato estandar
         ↓
Deteccion de Fraude (servidor)
         ↓
Comparacion con BD historica
         ↓
CLEAN / SUSPICIOUS / DUPLICATE
         ↓
Guardar en BD permanentemente
         ↓
Mostrar resultado al usuario
```

---

## 📈 Siguientes Pasos

### Funcionalidades Planeadas
- [ ] Exportar reportes (PDF, Excel)
- [ ] Dashboard de estadisticas
- [ ] Webhooks para notificaciones
- [ ] API publica para integraciones
- [ ] Soporte para mas formatos de voucher
- [ ] Machine Learning para patrones avanzados

### Mejoras de Rendimiento
- [ ] Cache de comprobantes verificados
- [ ] Batch processing para multiples vouchers
- [ ] GraphQL API
- [ ] Mobile app

---

## 🤝 Soporte

¿Preguntas o problemas?

1. Revisa [DEPLOYMENT.md](./DEPLOYMENT.md) → Troubleshooting
2. Revisa [SETUP.md](./SETUP.md) → FAQ
3. Abre un issue en GitHub
4. Contacta al equipo de desarrollo

---

## 📝 Licencia

Proyecto privado - Todos los derechos reservados.

---

## ✅ Checklist de Deploy

Antes de ir a produccion:

- [ ] Base de datos Neon conectada
- [ ] Migracion SQL ejecutada
- [ ] Variables de ambiente configuradas
- [ ] App desplegada en Vercel
- [ ] Probado con comprobantes reales
- [ ] Historial funcionando
- [ ] Deteccion de duplicados verificada
- [ ] Monitoreo activado

---

**CONTROLBANKDS v1.0** - Hecho con ❤️ para proteger transacciones financieras
