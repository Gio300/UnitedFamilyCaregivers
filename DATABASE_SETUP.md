# UFCi Database Setup

## Schema vs. KloudyKare / OpenEMR

UFCi uses a **Supabase** schema that mirrors the structure KloudyKare used for patient/client information, but **without OpenEMR**:

| KloudyKare/OpenEMR | UFCi (Supabase) |
|--------------------|-----------------|
| `customers` | `client_profiles` |
| `users` | `auth.users` + `profiles` |
| `patient_data` (OpenEMR) | `client_profiles` (full_name, dob, phone, email, address, city, state, zip) |
| Call notes | `call_notes` |
| Documents | `documents` |
| Reminders | `reminders` |

## Patient/Client Information Structure

`client_profiles` holds patient-like data:

- **full_name**, **dob**, **phone**, **email**
- **address**, **city**, **state**, **zip**
- **provider_type**, **specialty_codes**, **service_types**
- **notes**, **profile_type**, **is_active**

## Fixing 406 Errors

406 errors usually mean the Supabase schema is missing or out of date.

### Option A: Safe migration (keeps existing data)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run the contents of `supabase/migrations/001_add_profile_settings.sql`

This adds missing columns and tables without dropping anything.

### Option B: Full reset (deletes all data)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run the contents of `supabase/schema_full.sql`

This drops and recreates all tables. Use only if you have no data to keep.

## After Running the Schema

1. Restart the app or refresh the page
2. Settings (theme, mode, etc.) should work
3. The mode bar should show all modes for managers
