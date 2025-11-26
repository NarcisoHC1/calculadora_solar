# ☀️ SolarYa - Calculadora Solar

Sistema completo de cotización solar con integración a Airtable CRM y cálculos dinámicos de propuestas.

## 🚀 Características

### Backend
- **Integración completa con Airtable**
  - Base de datos de parámetros (`Params`) para precios y especificaciones dinámicas
  - Base de datos CRM (`SolarYa_CRM`) para leads, proyectos, submissions y propuestas
- **Motor de cálculos avanzado**
  - Cálculo inverso (dinero → energía) para tarifas 1, PDBT y DAC
  - Cálculo directo (energía → dinero)
  - Algoritmo de optimización de paneles solares
  - Selección inteligente de microinversores (DW vs Trunk, 2MPPT vs 4MPPT)
  - Selección de inversores centrales por capacidad
  - Cálculo completo de costos (BOS, transporte, seguros, mano de obra)
- **Propuestas duales**
  - Propuesta actual (consumo sin cargas extra)
  - Propuesta futura (con cargas adicionales: EV, minisplits, secadora, bomba, etc.)
- **Sistema de referidos** con tracking en Airtable

### Frontend
- **Formulario multi-paso** con validación inteligente
- **OCR de recibos CFE** (integración con Railway)
- **Propuesta interactiva** con toggle entre propuesta actual y futura
- **Funcionalidad de referidos** con modal y compartir en WhatsApp
- **Descarga PDF** de la propuesta
- **Integración con Calendly** para agendamiento de visitas

## 📋 Requisitos

- Node.js 18+
- Cuenta de Netlify (para deployment de funciones serverless)
- Cuenta de Airtable con:
  - Base de datos `SolarYa_CRM` (appw3RzlJw29vdQHR)
  - Base de datos `Params` (appjBih1L25LKSgPJ)

## 🔧 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/NarcisoHC1/calculadora_solar.git
cd calculadora_solar

# Instalar dependencias
npm install

# Configurar variables de entorno (ver sección abajo)
cp .env.example .env
# Editar .env con tus credenciales
```

## 🔑 Variables de Entorno

### Frontend (Vite)
```env
VITE_API_BASE=https://tu-sitio.netlify.app
VITE_OCR_BASE=https://tu-railway-app.railway.app
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_key
```

### Backend (Netlify Functions)
Configurar en el dashboard de Netlify:

```env
# Airtable
AIRTABLE_TOKEN=tu_token_de_airtable
AIRTABLE_BASE=appw3RzlJw29vdQHR
AIRTABLE_PARAMS_BASE=appjBih1L25LKSgPJ

# OpenAI (para OCR)
OPENAI_API_KEY=tu_openai_key
OPENAI_VISION_MODEL=gpt-4-vision-preview
```

## 🚀 Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 📦 Deployment

### Netlify (Recomendado)

1. Conecta tu repositorio de GitHub a Netlify
2. Configura las variables de entorno en Netlify Dashboard
3. Netlify detectará automáticamente:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

### Variables de entorno en Netlify

Ve a: **Site settings → Environment variables** y agrega:
- `AIRTABLE_TOKEN`
- `AIRTABLE_BASE`
- `AIRTABLE_PARAMS_BASE`
- `OPENAI_API_KEY`
- `OPENAI_VISION_MODEL`

## 🗂️ Estructura del Proyecto

```
calculadora_solar/
├── netlify/
│   └── functions/
│       ├── cotizacion_v2.js      # Endpoint principal de cotización
│       ├── referral.js            # Generación de links de referidos
│       └── lib/
│           ├── airtable.js        # Cliente de Airtable
│           ├── params.js          # Fetcher de parámetros
│           ├── calculations.js    # Lógica de cálculos
│           ├── proposalEngine.js  # Motor de propuestas
│           └── calculator.js      # (legacy - no usar)
├── src/
│   ├── App.tsx                    # Formulario principal
│   ├── Proposal.tsx               # Componente de propuesta
│   ├── calculationEngine.ts       # Cálculos frontend
│   ├── types.ts                   # TypeScript types
│   └── ...
├── public/
│   └── bridge.js                  # Bridge para OCR
└── README.md
```

## 🔄 Flujo de Datos

1. **Usuario llena formulario** → `App.tsx`
2. **Submit → POST** `/api/cotizacion_v2`
3. **Backend:**
   - Fetch parámetros de Airtable Params
   - Calcular propuesta usando `proposalEngine.js`
   - Guardar lead, project, submission_details, proposals en Airtable CRM
4. **Response → Frontend** muestra propuesta en `Proposal.tsx`
5. **Usuario puede:**
   - Descargar PDF
   - Agendar visita (Calendly)
   - Referir amigos (genera link único)

## 📊 Airtable Schema

### SolarYa_CRM

**Tablas principales:**
- `Leads_` - Información de contacto
- `Projects` - Proyectos vinculados a leads
- `Submission_Details` - Datos del formulario
- `Proposals` - Propuestas generadas
- `Referrers` - Sistema de referidos

### Params

**Tablas de parámetros:**
- `Tarifa_1_CFE`, `Tarifa_PDBT_CFE`, `Tarifa_DAC_CFE`
- `Panel_Specs`, `Microinverter_Specs`, `Inverter_Specs`
- `Montaje_Specs`, `DTU_Specs`, `Micro_extras`
- `Commercial_Conditions`, `Delivery_Costs`
- `HSP`, `PR`, `Space_Multiplier`, etc.

## 🔌 API Endpoints

### POST `/api/cotizacion_v2`

Genera cotización completa.

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "5512345678",
  "estado": "Ciudad de México",
  "pago_promedio_mxn": 1500,
  "periodicidad": "bimestral",
  "tarifa": "1",
  "uso": "Casa",
  "loads": {
    "ev": { "modelo": "Tesla Model 3", "km": 50 },
    "minisplit": { "cantidad": 2, "horas": 6 }
  },
  "utms": { ... }
}
```

**Response:**
```json
{
  "ok": true,
  "project_id": "rec...",
  "proposal_id": "rec...",
  "proposal": {
    "kwh_consumidos": 300,
    "propuesta_actual": { ... },
    "propuesta_cargas_extra": { ... }
  }
}
```

### POST `/api/referral`

Genera link de referido.

**Body:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "whatsapp": "5512345678"
}
```

**Response:**
```json
{
  "ok": true,
  "link": "https://www.solarya.mx/calcula-tu-ahorro-instalando-paneles-solares?ref=juan-perez-abc123",
  "reused": false
}
```

## 🎯 Próximos Pasos

### Para completar la integración:

1. **Push a GitHub:**
   ```bash
   git push origin main
   ```

2. **Configurar Netlify:**
   - Conectar el repo
   - Agregar variables de entorno
   - Deploy automático

3. **Embeber en Webflow:**
   - Agregar snippet de embed en `www.solarya.mx`
   - Configurar CORS
   - Probar flujo completo

4. **Validaciones adicionales (opcional):**
   - Mejorar detección de ubicación (solo CDMX/Edomex)
   - Agregar thresholds por estado
   - Modal "MANUAL" para casos fuera de alcance

## 📝 Notas Importantes

- **NO modificar** `calculator.js` (legacy, mantener para referencia)
- **SIEMPRE usar** `proposalEngine.js` para cálculos
- **Params cache** dura 5 minutos en memoria
- **Airtable rate limits**: 5 requests/segundo
- **OCR** es opcional, el sistema funciona con input manual

## 🤝 Soporte

Para cualquier duda sobre la integración backend:
- Revisar logs en Netlify Functions
- Verificar que Airtable Params esté actualizado
- Confirmar que todas las env vars estén configuradas

## 📄 Licencia

Privado - SolarYa © 2024
