# 🔧 Migración del Sistema Unificado - Healing Forest

## ✅ Problemas Solucionados

### 1. **Sistema de Créditos Unificado**
- ❌ **Antes**: Dos esquemas conflictivos (`patient_credits` vs `user_credits`)
- ✅ **Después**: Un solo esquema `user_credits` con funciones unificadas
- ❌ **Antes**: Lógica duplicada en móvil y web
- ✅ **Después**: Manager y hooks compartidos en `/shared/`

### 2. **Autenticación Estandarizada**
- ❌ **Antes**: 3 implementaciones diferentes de verificación de admin
- ✅ **Después**: Función `is_admin()` unificada en base de datos
- ❌ **Antes**: Hooks duplicados con lógica inconsistente
- ✅ **Después**: AuthManager y hooks compartidos

### 3. **Arquitectura Limpia**
- ❌ **Antes**: Código duplicado entre plataformas
- ✅ **Después**: Lógica compartida en `/shared/`
- ❌ **Antes**: Políticas RLS que causaban recursión
- ✅ **Después**: Políticas optimizadas y seguras

## 🚀 Pasos de Migración

### Paso 1: Ejecutar Migración de Base de Datos

1. Ve a **Supabase Dashboard > SQL Editor**
2. Copia y pega el contenido de `EJECUTAR_MIGRACION_UNIFICADA.sql`
3. Ejecuta el script completo
4. Verifica que no haya errores

### Paso 2: Actualizar Dependencias (si es necesario)

```bash
# En la raíz del proyecto
npm install

# En web/
cd web && npm install

# En web-client/
cd web-client && npm install
```

### Paso 3: Verificar Configuración de Supabase

Asegúrate de que tus variables de entorno estén correctas:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_key
```

### Paso 4: Probar el Sistema

1. **Autenticación**:
   - Login en web admin
   - Login en web cliente
   - Login en móvil

2. **Créditos**:
   - Crear crédito manual (admin)
   - Usar créditos en reserva
   - Ver historial de transacciones

## 📁 Nuevos Archivos Creados

### Sistema Unificado
```
shared/
├── utils/
│   ├── creditsManager.ts     # Manager unificado de créditos
│   └── authManager.ts        # Manager unificado de auth
└── hooks/
    ├── useCredits.ts         # Hooks de créditos compartidos
    └── useAuth.ts           # Hooks de auth compartidos
```

### Migraciones
```
supabase/migrations/
└── 99_unified_credits_system.sql  # Migración principal

EJECUTAR_MIGRACION_UNIFICADA.sql   # Script completo para Supabase
```

## 🔄 Archivos Actualizados

### Web Admin
- `web/src/hooks/useAuth.ts` - Usa sistema unificado
- `web/src/hooks/usePatientCredits.ts` - **DEPRECADO** (usar shared)

### Mobile
- `src/hooks/useCredits.ts` - Usa sistema unificado
- `src/utils/creditsManager.ts` - **DEPRECADO** (usar shared)

### Web Cliente
- `web-client/utils/creditsManager.ts` - **DEPRECADO** (usar shared)

## 🧪 Testing

### 1. Probar Autenticación
```typescript
// En cualquier componente
import { useAuth } from '../../../shared/hooks/useAuth';
import { supabase } from '../lib/supabase';

const { user, isAdmin, loading } = useAuth(supabase);
```

### 2. Probar Créditos
```typescript
// En cualquier componente
import { useUserCredits } from '../../../shared/hooks/useCredits';
import { supabase } from '../lib/supabase';

const { balance, credits, createCancellationCredit } = useUserCredits(supabase, userId);
```

### 3. Verificar Base de Datos
```sql
-- En Supabase SQL Editor
SELECT * FROM user_credits_summary LIMIT 5;
SELECT public.is_admin('user-uuid-here');
SELECT get_user_credit_balance('user-uuid-here');
```

## ⚠️ Posibles Problemas y Soluciones

### 1. Error: "Function is_admin does not exist"
**Solución**: Ejecutar nuevamente la migración de base de datos

### 2. Error: "Cannot resolve module '../../../shared/'"
**Solución**: 
```bash
# Crear symlink si es necesario
ln -s ../../shared ./shared
```

### 3. Créditos no aparecen después de migración
**Solución**: Verificar que los datos se migraron correctamente:
```sql
SELECT COUNT(*) FROM user_credits;
SELECT COUNT(*) FROM credit_transactions;
```

### 4. Usuario no puede ver créditos (RLS)
**Solución**: Verificar políticas RLS:
```sql
SELECT * FROM pg_policies WHERE tablename IN ('user_credits', 'credit_transactions');
```

## 🎯 Próximos Pasos

1. **Eliminar archivos obsoletos** después de verificar que todo funciona
2. **Actualizar documentación** de API si es necesario
3. **Configurar testing automatizado** para el sistema unificado
4. **Optimizar queries** basado en uso real

## 📞 Soporte

Si encuentras algún problema:

1. Revisa los logs de la consola del navegador
2. Verifica los logs de Supabase
3. Comprueba que todas las migraciones se ejecutaron correctamente
4. Asegúrate de que los imports de los archivos compartidos sean correctos

---

**¡La migración unifica tu sistema y elimina duplicación de código! 🎉**








