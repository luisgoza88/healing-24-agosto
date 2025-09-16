-- Fix RLS policies for patient_credits to allow admin to create/update records for any user

-- Drop existing insert/update policies that might be blocking
DROP POLICY IF EXISTS "Admin users can manage credits" ON public.patient_credits;

-- Create separate policies for admin actions
CREATE POLICY "Admin can insert credits for any user" 
    ON public.patient_credits FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admin can update credits for any user" 
    ON public.patient_credits FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admin can delete credits for any user" 
    ON public.patient_credits FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Do the same for credit_transactions
DROP POLICY IF EXISTS "Admin users can manage transactions" ON public.credit_transactions;

CREATE POLICY "Admin can insert transactions for any user" 
    ON public.credit_transactions FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admin can update transactions for any user" 
    ON public.credit_transactions FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admin can delete transactions for any user" 
    ON public.credit_transactions FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Also ensure the service role can do anything (for server-side operations)
CREATE POLICY "Service role bypass RLS for credits" 
    ON public.patient_credits FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role bypass RLS for transactions" 
    ON public.credit_transactions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);