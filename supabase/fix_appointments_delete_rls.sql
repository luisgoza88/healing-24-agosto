-- Verificar las políticas RLS actuales para la tabla appointments
SELECT pol.polname, pol.polcmd, pg_get_expr(pol.polqual, pol.polrelid) as policy_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'appointments';

-- Crear política para permitir DELETE en appointments
CREATE POLICY "Users can delete their own appointments" 
ON appointments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Si la política ya existe, actualízala
DROP POLICY IF EXISTS "Users can delete their own appointments" ON appointments;

CREATE POLICY "Users can delete their own appointments" 
ON appointments 
FOR DELETE 
USING (auth.uid() = user_id);