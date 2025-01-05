# Influencer Claims API

API para verificar influencers y analizar sus declaraciones de salud en redes sociales.

## Descripción

Esta API está construida con NestJS y proporciona funcionalidades para:
- Verificar y registrar influencers
- Analizar declaraciones de salud realizadas por influencers
- Gestionar tareas de investigación sobre declaraciones de salud

## Funcionalidades Principales

- **Verificación de Influencers**: Sistema automatizado para verificar y registrar influencers.
- **Análisis de Declaraciones**: Capacidad para analizar y evaluar declaraciones de salud.
- **Gestión de Investigaciones**: Sistema de tareas para investigar y dar seguimiento a las declaraciones.

## Requisitos Previos

- Node.js (v18 o superior)
- npm (incluido con Node.js)
- SQLite (incluido en el proyecto)

## Instalación

1. Clonar el repositorio:
```bash
git clone [url-del-repositorio]
cd influencer-claims-api
```

2. Instalar dependencias:
```bash
npm install
```

3. Iniciar la aplicación en modo desarrollo:
```bash
npm run start:dev
```

La API estará disponible en `http://localhost:3000`

## Uso

### Endpoints Disponibles

#### Influencers

- `POST /influencers/verify`
  - Verifica y registra un nuevo influencer
  - Body: `{ "handle": "nombre_usuario" }`

- `GET /influencers`
  - Obtiene lista de todos los influencers registrados

- `GET /influencers/:id`
  - Obtiene detalles de un influencer específico

#### Investigación

- `POST /research/tasks`
  - Crea una nueva tarea de investigación
  - Body: Datos parciales de ResearchTask

- `GET /research/tasks`
  - Obtiene todas las tareas de investigación

- `GET /research/tasks/:id`
  - Obtiene detalles de una tarea específica

- `DELETE /research/tasks/:id`
  - Elimina una tarea de investigación

## Scripts Disponibles

- `npm run build` - Compila el proyecto
- `npm run format` - Formatea el código usando Prettier
- `npm run start` - Inicia la aplicación
- `npm run start:dev` - Inicia la aplicación en modo desarrollo con hot-reload
- `npm run start:debug` - Inicia la aplicación en modo debug
- `npm run start:prod` - Inicia la aplicación en modo producción
- `npm run lint` - Ejecuta el linter
- `npm test` - Ejecuta los tests
- `npm run test:watch` - Ejecuta los tests en modo watch
- `npm run test:cov` - Ejecuta los tests con cobertura
- `npm run test:e2e` - Ejecuta los tests end-to-end

## Base de Datos

El proyecto utiliza SQLite como base de datos, lo que significa que:
- No requiere configuración adicional de base de datos
- Los datos se almacenan en el archivo `db.sqlite`
- Ideal para desarrollo y pruebas

## Manejo de Errores

La API incluye manejo de errores para:
- Límites de tokens en respuestas
- Errores de verificación de influencers
- Errores en la creación de tareas de investigación

## Estrategias de Deduplicación

### Influencers

El sistema implementa una estrategia robusta para evitar la duplicación de influencers:

1. **Verificación Inicial**:
   - Utiliza Perplexity AI para verificar si el handle corresponde a un influencer de salud
   - Recopila información detallada incluyendo nombre principal, aliases y datos relevantes

2. **Detección de Duplicados**:
   - Compara el handle y aliases del nuevo influencer con los existentes
   - La comparación es case-insensitive para mayor precisión
   - Considera múltiples variantes de nombres de usuario

3. **Actualización Automática**:
   - Si se encuentra un influencer existente, se actualiza su información
   - Se mantienen datos actualizados de:
     - Nombre principal
     - Descripción
     - Aliases
     - Tags de contenido
     - Ingresos estimados
     - Seguidores totales
     - Fecha de última verificación

### Claims (Declaraciones)

Para evitar la duplicación de declaraciones de salud:

1. **Verificación de Similitud**:
   - Utiliza el algoritmo de Levenshtein distance
   - Compara nuevas declaraciones con las existentes del mismo influencer
   - Considera similares las declaraciones con 85% o más de coincidencia

2. **Gestión de Duplicados**:
   - Cuando se crea una nueva tarea de investigación, el sistema analiza las declaraciones encontradas
   - Si una declaración es similar a una existente (≥85% similitud), en lugar de crear un duplicado:
     - Se reutiliza la declaración existente
     - La nueva tarea de investigación se vincula a esta declaración existente
   - Esto permite mantener un historial unificado de cada declaración a través de múltiples tareas de investigación

## Notas Adicionales

- La API utiliza TypeORM para la gestión de la base de datos
- Incluye validación de datos mediante class-validator
- Implementa el patrón de arquitectura REST
- Soporta operaciones CRUD para las entidades principales
