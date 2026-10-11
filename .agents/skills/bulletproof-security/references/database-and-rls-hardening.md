# Database & Row Level Security (RLS) Hardening Guide

This reference provides end-to-end recipes for locking down PostgreSQL and Supabase databases against unauthorized reads, writes, privilege escalation, and SQL injection attacks.

---

## 1. The Zero-Trust RLS Model

Every single table containing application data must have Row Level Security enabled. When RLS is enabled without policies, PostgreSQL defaults to **deny all**.

### 1.1 Mandatory Enactment on Every Table
```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_log ENABLE ROW LEVEL SECURITY;

-- Optional but recommended for multi-tenant security: force RLS even for table owners
ALTER TABLE public.items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.claims FORCE ROW LEVEL SECURITY;
```

---

## 2. Granular Policy Architecture (CRUD Separation)

Never write a single catch-all `FOR ALL` policy. Always define explicit, purpose-built policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

### 2.1 Profiles Table
```sql
-- Profiles: Any authenticated user can read their own profile; admins can read all
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Profiles: Users can update their own non-role fields
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Ensure role tampering cannot succeed via RLS
  );

-- CRITICAL: Prevent users from inserting or changing their own role to 'admin'
-- Role elevation must only be executable via service role or dedicated database trigger
```

### 2.2 Items Table
```sql
-- Read: Public/authenticated users can view approved items; reporters view their own; admins view all
CREATE POLICY "items_select_policy"
  ON public.items
  FOR SELECT
  TO authenticated, anon
  USING (
    status = 'approved' OR
    (auth.uid() IS NOT NULL AND reporter_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Insert: Authenticated users can insert their own reports strictly with 'pending' status
CREATE POLICY "items_insert_policy"
  ON public.items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid() AND
    status = 'pending'
  );

-- Update: Owner can update content only while pending or rejected; admins can update status
CREATE POLICY "items_update_owner_policy"
  ON public.items
  FOR UPDATE
  TO authenticated
  USING (
    reporter_id = auth.uid() AND
    status IN ('pending', 'rejected')
  )
  WITH CHECK (
    reporter_id = auth.uid() AND
    status IN ('pending', 'rejected')
  );

CREATE POLICY "items_update_admin_policy"
  ON public.items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
```

---

## 3. Defense Against Infinite Recursion & RLS Bypass

When an RLS policy on `public.profiles` queries `public.profiles` to check if `role = 'admin'`, it can trigger an infinite recursion loop or security bypass.

### Solution: Secure Helper Function with `SECURITY DEFINER`
```sql
-- Create a secure, isolated function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin' AND active = true
  );
$$;

-- Revoke public execution and grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
```

> **Security Rule:** Always specify `SET search_path = public, auth, pg_temp` on all `SECURITY DEFINER` functions. Leaving `search_path` unset allows malicious search path hijacking.

---

## 4. SQL Injection Elimination

### Rule 1: Zero Raw String Concatenation
Never construct SQL statements using template literals (`${var}`), string concatenation (`+`), or unescaped format strings.

```typescript
// ❌ VULNERABLE TO SQL INJECTION:
const query = `SELECT * FROM items WHERE name ILIKE '%${searchTerm}%'`;

// ✅ IMMUNE (Supabase PostgREST query builder automatically parameterizes):
const { data, error } = await supabase
  .from('items')
  .select('*')
  .ilike('name', `%${searchTerm}%`);

// ✅ IMMUNE (Direct SQL with parameterized placeholders):
const result = await db.query(
  'SELECT * FROM items WHERE category = $1 AND event_date <= $2',
  [category, eventDate]
);
```

### Rule 2: Dynamic Column or Table Names
If dynamic identifiers are required (e.g., sorting columns), use a strict allowlist:
```typescript
const ALLOWED_SORT_COLUMNS = ['created_at', 'event_date', 'name'] as const;
type SortColumn = typeof ALLOWED_SORT_COLUMNS[number];

function validateSortColumn(col: string): SortColumn {
  if (!ALLOWED_SORT_COLUMNS.includes(col as SortColumn)) {
    return 'created_at'; // Safe fallback
  }
  return col as SortColumn;
}
```

---

## 5. Service Role Key Isolation

The Supabase `service_role` key bypasses ALL Row Level Security policies completely.

1. **Never Bundle in Client Code:**
   - Client scripts must only ever receive the `anon` public key (`SUPABASE_ANON_KEY` or `PUBLIC_SUPABASE_ANON_KEY`).
   - The `SUPABASE_SERVICE_ROLE_KEY` must never have a `PUBLIC_` or `VITE_` prefix.
2. **Server-Side Guard:**
   - Only initialize service-role Supabase clients inside server-only modules (Astro endpoints, server Actions, Cloudflare Worker backend).
   - Use the service role key only for trusted background tasks (e.g., creating administrative log entries or sending system notifications).
