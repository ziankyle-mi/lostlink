-- ==============================================================================
-- BULLETPROOF SUPABASE / POSTGRESQL ROW LEVEL SECURITY (RLS) TEMPLATE
-- ==============================================================================

-- 1. Enable RLS and Force on All Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.claims FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_log FORCE ROW LEVEL SECURITY;

-- 2. Secure Admin Helper Function (Prevents Recursion & Search Path Poisoning)
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

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 3. PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Role cannot be updated by normal user via RLS
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- 4. ITEMS POLICIES
DROP POLICY IF EXISTS "items_select" ON public.items;
CREATE POLICY "items_select"
  ON public.items
  FOR SELECT
  TO authenticated, anon
  USING (
    status = 'approved' OR
    (auth.uid() IS NOT NULL AND reporter_id = auth.uid()) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "items_insert" ON public.items;
CREATE POLICY "items_insert"
  ON public.items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid() AND
    status = 'pending'
  );

DROP POLICY IF EXISTS "items_update_owner" ON public.items;
CREATE POLICY "items_update_owner"
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

DROP POLICY IF EXISTS "items_admin_all" ON public.items;
CREATE POLICY "items_admin_all"
  ON public.items
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 5. CLAIMS POLICIES
DROP POLICY IF EXISTS "claims_select" ON public.claims;
CREATE POLICY "claims_select"
  ON public.claims
  FOR SELECT
  TO authenticated
  USING (
    claimant_id = auth.uid() OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "claims_insert" ON public.claims;
CREATE POLICY "claims_insert"
  ON public.claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    claimant_id = auth.uid() AND
    status = 'pending' AND
    -- Cannot claim own reported item
    NOT EXISTS (
      SELECT 1 FROM public.items
      WHERE id = item_id AND reporter_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "claims_admin_update" ON public.claims;
CREATE POLICY "claims_admin_update"
  ON public.claims
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 6. NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "notifications_select_update" ON public.notifications;
CREATE POLICY "notifications_select_update"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_read"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. ADMIN LOG POLICIES (Append-only by server, read by admins only)
DROP POLICY IF EXISTS "admin_log_select" ON public.admin_log;
CREATE POLICY "admin_log_select"
  ON public.admin_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
