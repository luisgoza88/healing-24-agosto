# 🚨 BYPASS TEMPORAL PARA ACCESO AL ADMIN

## Para activar el bypass temporal:

1. Abre el archivo `web/app/page.tsx`
2. Busca estas líneas (alrededor de la línea 30-37):

```typescript
// Verificar que el usuario tenga rol de admin
console.log('[Login] About to check admin status...');
const isAdmin = await checkIsAdmin(data.user.id);
console.log('[Login] Admin check result:', isAdmin);

if (!isAdmin) {
  throw new Error("No tienes permisos de administrador");
}
```

3. Reemplázalas con:

```typescript
// BYPASS TEMPORAL - QUITAR DESPUÉS DE SOLUCIONAR
console.log('[Login] BYPASS ACTIVADO - Saltando verificación de admin');
// const isAdmin = await checkIsAdmin(data.user.id);
// if (!isAdmin) {
//   throw new Error("No tienes permisos de administrador");
// }
```

4. Guarda el archivo y prueba el login nuevamente

## IMPORTANTE: 
- Este es solo un bypass temporal para permitirte acceder mientras solucionamos el problema real
- Una vez dentro, podrás verificar que todo lo demás funcione correctamente
- Recuerda revertir este cambio cuando hayamos solucionado el problema de autenticación