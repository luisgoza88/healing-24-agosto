# Appointments Database Query Analysis

## Overview
This document analyzes how appointments are queried in both the mobile app and web dashboard, highlighting key differences and potential issues.

## 1. Mobile App Queries (React Native)

### Main Query Location
**File:** `/src/screens/appointments/AppointmentsScreen.tsx`

### Query Structure
```typescript
// Medical appointments query (lines 119-130)
const { data: medicalAppointments, error: medicalError } = await supabase
  .from('appointments')
  .select(`
    *,
    professional:professionals(
      id,
      full_name
    )
  `)
  .eq('user_id', user.id)  // ✅ Uses auth user ID directly
  .neq('status', 'cancelled')
  .order('appointment_date', { ascending: false });
```

### Key Points:
- ✅ Uses `user.id` from `supabase.auth.getUser()` directly
- ✅ Filters by authenticated user's ID
- ✅ Joins with `professionals` table using foreign key relationship
- ✅ Excludes cancelled appointments
- No joins to `profiles` table

## 2. Web Dashboard Queries

### Main Query Location
**File:** `/web/app/dashboard/appointments/page.tsx`

### Query Structure
```typescript
// Dashboard appointments query (lines 46-56)
const { data, error } = await supabase
  .from('appointments')
  .select(`
    *,
    professionals!appointments_professional_id_fkey(full_name),
    profiles!appointments_user_id_fkey(full_name, email),
    services!appointments_service_id_fkey(name)
  `)
  .order('appointment_date', { ascending: false })
  .order('appointment_time', { ascending: false })
```

### Key Points:
- ❌ No user_id filtering - fetches ALL appointments
- ✅ Joins with `profiles` table to get patient information
- ✅ Joins with `professionals` and `services` tables
- Uses explicit foreign key names in joins

## 3. Database Schema

### Appointments Table Structure
From migration file `20240111_appointments_system.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id),
    service_id UUID REFERENCES public.services(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    -- other fields...
);
```

### Key Relationships:
- `user_id` → references `auth.users(id)` (NOT profiles table)
- `professional_id` → references `professionals(id)`
- `service_id` → references `services(id)`

## 4. Row Level Security (RLS) Policies

From `debug_appointments_rls.sql`:

```sql
-- Users can only see their own appointments
CREATE POLICY "Enable read access for users" ON appointments
    FOR SELECT
    USING (auth.uid() = user_id);
```

## 5. Key Differences and Issues

### Issue 1: Web Dashboard Authorization
- **Problem:** Web dashboard doesn't filter by user_id, attempting to fetch all appointments
- **Expected:** Should only show appointments for the logged-in professional/admin
- **Current:** Relies on RLS to filter, but may not be appropriate for dashboard use case

### Issue 2: Different Join Syntax
- **Mobile:** Uses simpler join syntax without explicit foreign key names
- **Web:** Uses explicit foreign key names in joins (e.g., `appointments_professional_id_fkey`)

### Issue 3: Profile vs Auth User
- **Mobile:** Works directly with auth user ID
- **Web:** Attempts to join with profiles table for patient information
- **Note:** This is correct as appointments.user_id references auth.users, not profiles

### Issue 4: Status Filtering
- **Mobile:** Excludes cancelled appointments at query level
- **Web:** Fetches all appointments regardless of status

## 6. Recommendations

### For Web Dashboard
1. Add professional filtering if dashboard is for professionals:
```typescript
// If showing appointments for a specific professional
.eq('professional_id', professionalId)
```

2. Or add admin check and appropriate RLS policies for admin users

### For Consistency
1. Standardize join syntax across both apps
2. Consider creating a view or stored procedure for complex appointment queries
3. Ensure both apps handle appointment status filtering consistently

### For Security
1. Review and update RLS policies for dashboard use case
2. Consider separate policies for professional/admin access
3. Ensure proper authentication checks before querying

## 7. Common Fields Used

Both apps use these core fields:
- `id`
- `user_id` (patient)
- `professional_id`
- `service_id`
- `appointment_date`
- `appointment_time`
- `status`
- `notes`
- `total_amount`

The main difference is in how they query and filter the data, not in the fields themselves.