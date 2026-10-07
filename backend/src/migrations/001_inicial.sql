-- Plataforma MDDI — esquema inicial (PostgreSQL 14+)

CREATE TABLE IF NOT EXISTS usuarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_hash   text UNIQUE NOT NULL,           -- HMAC-SHA256 del código de acceso (nunca el código en claro)
  codigo_pista  text,                           -- últimos 2 caracteres, solo para identificarlo en pantalla
  nombre        text NOT NULL,
  rol           text NOT NULL CHECK (rol IN ('Docente de contenidos','Especialista en Didáctica','Corrector/a','Coordinación General')),
  email         text,                           -- reservado para autenticación futura (OIDC / usuario+clave)
  clave_hash    text,                           -- reservado (scrypt) para autenticación futura
  activo        boolean NOT NULL DEFAULT true,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  creado_por    text
);

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash        text PRIMARY KEY,           -- SHA-256 del token de la cookie
  usuario_id        uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre_visible    text NOT NULL,
  creada_en         timestamptz NOT NULL DEFAULT now(),
  expira_en         timestamptz NOT NULL,
  ultima_actividad  timestamptz NOT NULL DEFAULT now(),
  ip                text,
  agente            text
);
CREATE INDEX IF NOT EXISTS sesiones_usuario ON sesiones(usuario_id);

CREATE TABLE IF NOT EXISTS modulos (
  id              text PRIMARY KEY,             -- generado por el cliente (permite crear módulos sin conexión)
  grado           smallint NOT NULL CHECK (grado BETWEEN 1 AND 6),
  numero          integer NOT NULL,             -- número correlativo dentro del grado (automático)
  titulo          text,
  area            text,
  estado          text,
  codigo          text,
  data            jsonb NOT NULL,
  field_versions  jsonb NOT NULL DEFAULT '{}'::jsonb, -- versión en que se modificó cada campo (detección de conflictos)
  version         integer NOT NULL DEFAULT 1,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  creado_por      text,
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  actualizado_por text,
  eliminado_en    timestamptz,
  eliminado_por   text
);
CREATE UNIQUE INDEX IF NOT EXISTS modulos_grado_numero ON modulos(grado, numero) WHERE eliminado_en IS NULL;
CREATE INDEX IF NOT EXISTS modulos_actualizado ON modulos(actualizado_en);

-- Registro de cada guardado (control de cambios automático / auditoría)
CREATE TABLE IF NOT EXISTS modulo_cambios (
  id          bigserial PRIMARY KEY,
  modulo_id   text NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  version     integer NOT NULL,
  fecha       timestamptz NOT NULL DEFAULT now(),
  usuario_id  uuid,
  usuario     text,
  rol         text,
  client_id   text,
  rutas       text[] NOT NULL DEFAULT '{}',
  ops         jsonb NOT NULL,
  conflictos  jsonb
);
CREATE INDEX IF NOT EXISTS modulo_cambios_idx ON modulo_cambios(modulo_id, version DESC);

-- Copias completas del módulo (cada 30 minutos de trabajo, al crear, antes de eliminar/restaurar)
CREATE TABLE IF NOT EXISTS modulo_instantaneas (
  id         bigserial PRIMARY KEY,
  modulo_id  text NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  version    integer NOT NULL,
  fecha      timestamptz NOT NULL DEFAULT now(),
  motivo     text,
  usuario    text,
  data       jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS modulo_instantaneas_idx ON modulo_instantaneas(modulo_id, fecha DESC);

CREATE TABLE IF NOT EXISTS bitacora (
  id          bigserial PRIMARY KEY,
  fecha       timestamptz NOT NULL DEFAULT now(),
  usuario_id  uuid,
  nombre      text,
  rol         text,
  accion      text NOT NULL,
  modulo_id   text
);
CREATE INDEX IF NOT EXISTS bitacora_fecha ON bitacora(fecha DESC);
