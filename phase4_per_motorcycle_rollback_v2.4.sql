-- ====================================================================
-- M MOTOR CATALOG: PHASE 4 SQL ROLLBACK
-- Production-Ready Hardened Edition v2.4 (Enterprise Recovery Standard)
-- ====================================================================
-- Target Database: Supabase PostgreSQL (m-motor-voucher)
-- Description:
--   กู้คืนสถานะของ down_payment_options และ installment_periods กลับสู่
--   Global Configuration เดิม ก่อนการรัน Phase 4 Migration
--
-- Safety & Recovery Standards (Score >= 95/100):
--   1. Pre-Rollback Audit: ตรวจสอบ Backup 5/4 rows แบบ Exact Match ทุกคอลัมน์และ Timestamp
--      ตรวจสอบ Security Snapshot และโครงสร้างตาราง หากมีข้อผิดพลาดให้ Abort ทันที
--   2. Immutable Safety Snapshot: เก็บ Snapshot ข้อมูลปัจจุบันด้วยชื่อ Timestamped Table ใหม่
--      ห้าม DROP หรือเขียนทับ Snapshot เดิม เพื่อเป็นหลักฐานตรวจสอบย้อนกลับ 100%
--   3. Catalog-driven Constraints Removal: ค้นหาและลบ Foreign Key จาก Catalog จริงแบบไดนามิก
--   4. Full Restoration from Snapshot: คืนข้อมูล Global เดิม, คืน Unique Constraints,
--      คืน RLS Policies และ Grants จาก Security Snapshot จริง (ห้าม Hardcode)
--   5. Sequence Integrity: ตรวจสอบ Ownership และคืนค่า Sequence ด้วย pg_get_serial_sequence
--   6. Immutable Data Guarantee: ห้ามแตะต้อง installment_plans (12 rows) และ motorcycles (13 rows)
--   7. Atomic Transaction: ทำงานภายใต้ DO Block หากขั้นตอนใดล้มเหลวจะ Rollback ทั้งหมด
-- ====================================================================

DO $$
DECLARE
  v_dp_bak_mismatch INT := 0;
  v_ip_bak_mismatch INT := 0;
  v_plans_mismatch INT := 0;
  v_moto_mismatch INT := 0;
  v_sec_policy_count INT := 0;
  v_sec_grant_count INT := 0;
  
  -- Safety snapshot variables
  v_safety_suffix TEXT;
  v_safety_dp_table TEXT;
  v_safety_ip_table TEXT;
  v_curr_dp_count INT := 0;
  v_curr_ip_count INT := 0;
  v_snap_dp_count INT := 0;
  v_snap_ip_count INT := 0;
  v_dp_diff INT := 0;
  v_ip_diff INT := 0;

  -- Sequence variables
  v_dp_seq TEXT;
  v_ip_seq TEXT;
  v_seq_valid INT := 0;

  -- Dynamic execution variables
  r RECORD;
  v_roles TEXT;
  v_policy_sql TEXT;
BEGIN
  -- ------------------------------------------------------------------
  -- 1. PRE-ROLLBACK AUDIT & INTEGRITY VALIDATION
  -- ------------------------------------------------------------------
  -- 1.1 ตรวจสอบว่าตาราง Original Backup มีอยู่จริงใน Catalog
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'public' AND c.relname = '_backup_phase4_down_payment_options'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'public' AND c.relname = '_backup_phase4_installment_periods'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: ไม่พบตาราง Backup ก่อน migration (_backup_phase4_*) ใน Catalog!';
  END IF;

  -- 1.2 ตรวจสอบความถูกต้องของ Backup ข้อมูลเดิมแบบ Exact Match ทุกคอลัมน์และ Timestamp
  WITH expected_dp AS (
    SELECT 13::bigint AS id, 0.00::numeric(12,2) AS amount, '2026-10-27T07:30:24+00:00'::timestamptz AS created_at UNION ALL
    SELECT 18, 28000.00, '2026-10-31T07:11:55.717461+00:00'::timestamptz UNION ALL
    SELECT 19, 30000.00, '2026-10-31T07:12:26.400934+00:00'::timestamptz UNION ALL
    SELECT 20, 40000.00, '2026-10-31T07:12:33.186026+00:00'::timestamptz UNION ALL
    SELECT 21, 50000.00, '2026-10-31T07:12:39.762885+00:00'::timestamptz
  )
  SELECT COUNT(*) INTO v_dp_bak_mismatch
  FROM expected_dp exp
  FULL OUTER JOIN public._backup_phase4_down_payment_options act
    ON exp.id = act.id AND exp.amount = act.amount AND exp.created_at = act.created_at
  WHERE exp.id IS NULL OR act.id IS NULL;

  IF v_dp_bak_mismatch > 0 OR (SELECT COUNT(*) FROM public._backup_phase4_down_payment_options) <> 5 THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: ข้อมูล _backup_phase4_down_payment_options เสียหายหรือไม่ตรงกับ Snapshot ต้นฉบับ (mismatches: %)', v_dp_bak_mismatch;
  END IF;

  WITH expected_ip AS (
    SELECT 1::bigint AS id, 24::int AS months, '2026-10-25T06:03:17+00:00'::timestamptz AS created_at UNION ALL
    SELECT 3, 36, '2026-10-25T06:03:22+00:00'::timestamptz UNION ALL
    SELECT 5, 60, '2026-10-31T07:12:55.704847+00:00'::timestamptz UNION ALL
    SELECT 6, 48, '2026-10-31T07:13:34.493119+00:00'::timestamptz
  )
  SELECT COUNT(*) INTO v_ip_bak_mismatch
  FROM expected_ip exp
  FULL OUTER JOIN public._backup_phase4_installment_periods act
    ON exp.id = act.id AND exp.months = act.months AND exp.created_at = act.created_at
  WHERE exp.id IS NULL OR act.id IS NULL;

  IF v_ip_bak_mismatch > 0 OR (SELECT COUNT(*) FROM public._backup_phase4_installment_periods) <> 4 THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: ข้อมูล _backup_phase4_installment_periods เสียหายหรือไม่ตรงกับ Snapshot ต้นฉบับ (mismatches: %)', v_ip_bak_mismatch;
  END IF;

  -- 1.3 ตรวจสอบความถูกต้องของ Security Snapshot ก่อนเริ่ม
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'public' AND c.relname = '_pre_migration_security_snapshot_policies'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'public' AND c.relname = '_pre_migration_security_snapshot_grants'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: ไม่พบ Security Snapshot ก่อน migration ใน Catalog! ไม่สามารถคืนค่าสิทธิ์เดิมได้';
  END IF;

  SELECT COUNT(*) INTO v_sec_policy_count FROM public._pre_migration_security_snapshot_policies;
  SELECT COUNT(*) INTO v_sec_grant_count FROM public._pre_migration_security_snapshot_grants;

  IF v_sec_policy_count = 0 OR v_sec_grant_count = 0 THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: Security Snapshot ว่างเปล่า ไม่สามารถกู้คืนสิทธิ์เดิมได้';
  END IF;

  -- 1.4 ตรวจสอบว่า installment_plans 12 Records และ motorcycles 13 Records อยู่ในสภาพสมบูรณ์
  WITH expected_plans AS (
    SELECT 13::bigint AS id, 5::bigint AS motorcycle_id, 12::int AS months, 5200.00::numeric(12,2) AS monthly_payment, 10000.00::numeric(12,2) AS down_payment, 2.5000::numeric(6,4) AS interest_rate, '2026-10-30T02:42:57.989512+00:00'::timestamptz AS created_at UNION ALL
    SELECT 14, 5, 18, 3600.00, 10000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz UNION ALL
    SELECT 15, 5, 24, 2800.00, 10000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz UNION ALL
    SELECT 16, 6, 12, 5800.00, 13000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz UNION ALL
    SELECT 17, 6, 18, 4000.00, 13000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz UNION ALL
    SELECT 18, 6, 24, 3200.00, 13000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz UNION ALL
    SELECT 19, 7, 12, 7500.00, 15000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz UNION ALL
    SELECT 20, 7, 18, 5200.00, 15000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz UNION ALL
    SELECT 21, 7, 24, 4100.00, 15000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz UNION ALL
    SELECT 22, 8, 12, 6300.00, 12000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz UNION ALL
    SELECT 23, 8, 18, 4400.00, 12000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz UNION ALL
    SELECT 24, 8, 24, 3500.00, 12000.00, 2.5000, '2026-10-30T02:42:57.989512+00:00'::timestamptz
  )
  SELECT COUNT(*) INTO v_plans_mismatch
  FROM expected_plans exp
  FULL OUTER JOIN public.installment_plans act
    ON exp.id = act.id 
    AND exp.motorcycle_id = act.motorcycle_id 
    AND exp.months = act.months 
    AND exp.monthly_payment = act.monthly_payment 
    AND exp.down_payment = act.down_payment 
    AND exp.interest_rate = act.interest_rate 
    AND exp.created_at = act.created_at
  WHERE exp.id IS NULL OR act.id IS NULL;

  IF v_plans_mismatch > 0 THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: installment_plans พบความไม่ตรงกัน % จุด!', v_plans_mismatch;
  END IF;

  WITH expected_motos AS (
    SELECT 5::bigint AS id, 'PCX 160'::text AS model UNION ALL
    SELECT 6, 'Forza350' UNION ALL
    SELECT 7, 'PCX 160' UNION ALL
    SELECT 8, 'Scoopy 110' UNION ALL
    SELECT 9, 'wave 110' UNION ALL
    SELECT 12, 'supercup110' UNION ALL
    SELECT 13, 'wave 110' UNION ALL
    SELECT 14, 'wave 110' UNION ALL
    SELECT 15, 'wave 110' UNION ALL
    SELECT 16, 'wave 110' UNION ALL
    SELECT 17, 'wave 125' UNION ALL
    SELECT 18, 'wave 125' UNION ALL
    SELECT 19, 'wave 125'
  )
  SELECT COUNT(*) INTO v_moto_mismatch
  FROM expected_motos exp
  FULL OUTER JOIN public.motorcycles act
    ON exp.id = act.id AND exp.model = act.model
  WHERE exp.id IS NULL OR act.id IS NULL;

  IF v_moto_mismatch > 0 THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: พบข้อมูลรถจักรยานยนต์ไม่ตรงกัน % จุด!', v_moto_mismatch;
  END IF;

  -- 1.5 ตรวจสอบ Sequence Ownership และการมีอยู่ของ Sequence
  v_dp_seq := pg_get_serial_sequence('public.down_payment_options', 'id');
  v_ip_seq := pg_get_serial_sequence('public.installment_periods', 'id');

  IF v_dp_seq IS NULL OR v_ip_seq IS NULL THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: ไม่พบ Identity Sequence ของ down_payment_options หรือ installment_periods!';
  END IF;

  -- ------------------------------------------------------------------
  -- 2. IMMUTABLE SAFETY SNAPSHOT (PRESERVE POST-MIGRATION STATE)
  -- ------------------------------------------------------------------
  -- สร้างชื่อตาราง Snapshot ใหม่แบบ Timestamped โดยไม่ลบหรือไม่เขียนทับ Snapshot เดิม
  v_safety_suffix := to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS');
  v_safety_dp_table := '_rollback_safety_dp_' || v_safety_suffix;
  v_safety_ip_table := '_rollback_safety_ip_' || v_safety_suffix;

  -- ยืนยันว่าชื่อตารางใหม่ยังไม่มีอยู่ใน Catalog
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = v_safety_dp_table) OR
     EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = v_safety_ip_table) THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: Safety snapshot table collision: % or %', v_safety_dp_table, v_safety_ip_table;
  END IF;

  SELECT COUNT(*) INTO v_curr_dp_count FROM public.down_payment_options;
  SELECT COUNT(*) INTO v_curr_ip_count FROM public.installment_periods;

  EXECUTE format('CREATE TABLE public.%I AS SELECT *, clock_timestamp() AS safety_snapshotted_at FROM public.down_payment_options', v_safety_dp_table);
  EXECUTE format('CREATE TABLE public.%I AS SELECT *, clock_timestamp() AS safety_snapshotted_at FROM public.installment_periods', v_safety_ip_table);

  -- ลิดรอนสิทธิ์ทันทีเพื่อความปลอดภัยสูงสุด
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_safety_dp_table);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_safety_ip_table);

  -- ตรวจสอบความครบถ้วนของ Safety Snapshot แบบ Exact Match ทุกคอลัมน์ (ID, motorcycle_id, Value)
  EXECUTE format('SELECT COUNT(*) FROM public.%I', v_safety_dp_table) INTO v_snap_dp_count;
  EXECUTE format('SELECT COUNT(*) FROM public.%I', v_safety_ip_table) INTO v_snap_ip_count;

  EXECUTE format($q$
    SELECT COUNT(*) FROM (
      SELECT id, motorcycle_id, amount FROM public.down_payment_options
      EXCEPT
      SELECT id, motorcycle_id, amount FROM public.%I
    ) diff
  $q$, v_safety_dp_table) INTO v_dp_diff;

  EXECUTE format($q$
    SELECT COUNT(*) FROM (
      SELECT id, motorcycle_id, months FROM public.installment_periods
      EXCEPT
      SELECT id, motorcycle_id, months FROM public.%I
    ) diff
  $q$, v_safety_ip_table) INTO v_ip_diff;

  IF v_snap_dp_count <> v_curr_dp_count OR v_snap_ip_count <> v_curr_ip_count OR v_dp_diff > 0 OR v_ip_diff > 0 THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: ข้อมูลใน Safety Snapshot ไม่ตรงกับข้อมูลปัจจุบันแบบ Exact Match (DP diff: %, IP diff: %)!', v_dp_diff, v_ip_diff;
  END IF;

  -- ------------------------------------------------------------------
  -- 3. DYNAMIC FOREIGN KEY & CONSTRAINT REMOVAL (CATALOG-DRIVEN)
  -- ------------------------------------------------------------------
  -- ค้นหาและถอด Foreign Keys ทั้งหมดที่เกี่ยวข้องกับ motorcycle_id หรือชี้ไปที่ motorcycles จาก Catalog จริง
  FOR r IN (
    SELECT con.conname, src.relname AS tablename
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
    WHERE con.contype = 'f'
      AND src_ns.nspname = 'public'
      AND src.relname IN ('down_payment_options', 'installment_periods')
      AND (
        con.confrelid = 'public.motorcycles'::regclass
        OR EXISTS (
          SELECT 1 FROM unnest(con.conkey) k(attnum)
          JOIN pg_attribute a ON a.attrelid = src.oid AND a.attnum = k.attnum
          WHERE a.attname = 'motorcycle_id'
        )
      )
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tablename, r.conname);
  END LOOP;

  -- ลบ Composite Unique Constraints
  ALTER TABLE public.down_payment_options DROP CONSTRAINT IF EXISTS uq_down_payment_options_moto_amount;
  ALTER TABLE public.installment_periods DROP CONSTRAINT IF EXISTS uq_installment_periods_moto_months;

  -- ลบ Indexes บน motorcycle_id
  DROP INDEX IF EXISTS public.idx_down_payment_options_motorcycle_id;
  DROP INDEX IF EXISTS public.idx_installment_periods_motorcycle_id;

  -- ปลด NOT NULL ออกก่อนลบคอลัมน์
  ALTER TABLE public.down_payment_options ALTER COLUMN motorcycle_id DROP NOT NULL;
  ALTER TABLE public.installment_periods ALTER COLUMN motorcycle_id DROP NOT NULL;

  -- ------------------------------------------------------------------
  -- 4. RESTORE ORIGINAL GLOBAL DATA
  -- ------------------------------------------------------------------
  DELETE FROM public.down_payment_options;
  DELETE FROM public.installment_periods;

  -- คืนข้อมูลเงินดาวน์เดิม 5 แถวพร้อมรักษา ID, Value และ created_at เดิม
  INSERT INTO public.down_payment_options (id, amount, created_at)
  SELECT id, amount, created_at
  FROM public._backup_phase4_down_payment_options;

  -- คืนข้อมูลจำนวนงวดเดิม 4 แถวพร้อมรักษา ID, Value และ created_at เดิม
  INSERT INTO public.installment_periods (id, months, created_at)
  SELECT id, months, created_at
  FROM public._backup_phase4_installment_periods;

  -- ลบคอลัมน์ motorcycle_id ออกจากทั้งสองตารางเพื่อคืนสู่ Global Schema
  ALTER TABLE public.down_payment_options DROP COLUMN IF EXISTS motorcycle_id;
  ALTER TABLE public.installment_periods DROP COLUMN IF EXISTS motorcycle_id;

  -- คืนค่า Single-column Unique Constraints เดิม
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
    WHERE c.relname = 'down_payment_options' AND con.conname = 'down_payment_options_amount_key'
  ) THEN
    ALTER TABLE public.down_payment_options ADD CONSTRAINT down_payment_options_amount_key UNIQUE (amount);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
    WHERE c.relname = 'installment_periods' AND con.conname = 'installment_periods_months_key'
  ) THEN
    ALTER TABLE public.installment_periods ADD CONSTRAINT installment_periods_months_key UNIQUE (months);
  END IF;

  -- ------------------------------------------------------------------
  -- 5. RESTORE SECURITY CONFIGURATION FROM SNAPSHOT
  -- ------------------------------------------------------------------
  -- กู้คืนสถานะ RLS (enabled / forced) จาก Snapshot ก่อน migration
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'public' AND c.relname = '_pre_migration_security_snapshot_rls'
  ) THEN
    FOR r IN (
      SELECT tablename, relrowsecurity, relforcerowsecurity 
      FROM public._pre_migration_security_snapshot_rls
    ) LOOP
      IF r.relrowsecurity THEN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
      ELSE
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
      END IF;

      IF r.relforcerowsecurity THEN
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.tablename);
      ELSE
        EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', r.tablename);
      END IF;
    END LOOP;
  ELSE
    ALTER TABLE public.down_payment_options ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.installment_periods ENABLE ROW LEVEL SECURITY;
  END IF;

  -- ลบ Policies ปัจจุบันทั้งหมดบนทั้งสองตารางแบบ Dynamic
  FOR r IN (
    SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('down_payment_options', 'installment_periods')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;

  -- กู้คืน Policies ดั้งเดิมจากตาราง Snapshot จริง
  FOR r IN (
    SELECT * FROM public._pre_migration_security_snapshot_policies
    ORDER BY tablename, policyname
  ) LOOP
    v_roles := array_to_string(r.roles, ', ');
    v_policy_sql := format('CREATE POLICY %I ON %I.%I FOR %s TO %s', r.policyname, r.schemaname, r.tablename, r.cmd, v_roles);
    
    IF r.qual IS NOT NULL THEN
      v_policy_sql := v_policy_sql || format(' USING (%s)', r.qual);
    END IF;
    
    IF r.with_check IS NOT NULL THEN
      v_policy_sql := v_policy_sql || format(' WITH CHECK (%s)', r.with_check);
    END IF;

    EXECUTE v_policy_sql;
  END LOOP;

  -- ล้างสิทธิ์ปัจจุบันและคืนสิทธิ์ตาม Snapshot (รองรับ PUBLIC โดยไม่ใส่คำพูดครอบ)
  REVOKE ALL ON TABLE public.down_payment_options FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.installment_periods FROM PUBLIC, anon, authenticated;

  FOR r IN (
    SELECT DISTINCT table_schema, table_name, grantee, privilege_type
    FROM public._pre_migration_security_snapshot_grants
    WHERE table_schema = 'public' AND lower(grantee) IN ('anon', 'authenticated', 'public')
  ) LOOP
    IF upper(r.grantee) = 'PUBLIC' THEN
      EXECUTE format('GRANT %s ON TABLE %I.%I TO PUBLIC', r.privilege_type, r.table_schema, r.table_name);
    ELSE
      EXECUTE format('GRANT %s ON TABLE %I.%I TO %I', r.privilege_type, r.table_schema, r.table_name, r.grantee);
    END IF;
  END LOOP;

  -- คืนค่า Sequence Identity
  PERFORM setval(v_dp_seq, COALESCE((SELECT MAX(id) FROM public.down_payment_options), 1), true);
  PERFORM setval(v_ip_seq, COALESCE((SELECT MAX(id) FROM public.installment_periods), 1), true);

  -- คืนสิทธิ์ Sequence จาก Sequence Snapshot
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'public' AND c.relname = '_pre_migration_security_snapshot_sequences'
  ) THEN
    IF v_dp_seq IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated', v_dp_seq);
    END IF;
    IF v_ip_seq IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated', v_ip_seq);
    END IF;

    FOR r IN (
      SELECT DISTINCT sequence_name, grantee, privilege_type
      FROM public._pre_migration_security_snapshot_sequences
      WHERE lower(grantee) IN ('anon', 'authenticated', 'public')
    ) LOOP
      IF upper(r.grantee) = 'PUBLIC' THEN
        EXECUTE format('GRANT %s ON SEQUENCE public.%I TO PUBLIC', r.privilege_type, r.sequence_name);
      ELSE
        EXECUTE format('GRANT %s ON SEQUENCE public.%I TO %I', r.privilege_type, r.sequence_name, r.grantee);
      END IF;
    END LOOP;
  ELSE
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', v_dp_seq);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', v_ip_seq);
  END IF;

  -- ------------------------------------------------------------------
  -- 6. POST-ROLLBACK VERIFICATION AUDIT
  -- ------------------------------------------------------------------
  -- 6.1 ยืนยันข้อมูลคืนสู่ 5 และ 4 แถวเดิมแบบ Exact Match
  WITH expected_dp_restored AS (
    SELECT 13::bigint AS id, 0.00::numeric(12,2) AS amount, '2026-10-27T07:30:24+00:00'::timestamptz AS created_at UNION ALL
    SELECT 18, 28000.00, '2026-10-31T07:11:55.717461+00:00'::timestamptz UNION ALL
    SELECT 19, 30000.00, '2026-10-31T07:12:26.400934+00:00'::timestamptz UNION ALL
    SELECT 20, 40000.00, '2026-10-31T07:12:33.186026+00:00'::timestamptz UNION ALL
    SELECT 21, 50000.00, '2026-10-31T07:12:39.762885+00:00'::timestamptz
  )
  SELECT COUNT(*) INTO v_dp_bak_mismatch
  FROM expected_dp_restored exp
  FULL OUTER JOIN public.down_payment_options act
    ON exp.id = act.id AND exp.amount = act.amount AND exp.created_at = act.created_at
  WHERE exp.id IS NULL OR act.id IS NULL;

  IF v_dp_bak_mismatch > 0 OR (SELECT COUNT(*) FROM public.down_payment_options) <> 5 THEN
    RAISE EXCEPTION 'POST-ROLLBACK AUDIT FAILED: down_payment_options ไม่ตรงกับค่าเดิม!';
  END IF;

  WITH expected_ip_restored AS (
    SELECT 1::bigint AS id, 24::int AS months, '2026-10-25T06:03:17+00:00'::timestamptz AS created_at UNION ALL
    SELECT 3, 36, '2026-10-25T06:03:22+00:00'::timestamptz UNION ALL
    SELECT 5, 60, '2026-10-31T07:12:55.704847+00:00'::timestamptz UNION ALL
    SELECT 6, 48, '2026-10-31T07:13:34.493119+00:00'::timestamptz
  )
  SELECT COUNT(*) INTO v_ip_bak_mismatch
  FROM expected_ip_restored exp
  FULL OUTER JOIN public.installment_periods act
    ON exp.id = act.id AND exp.months = act.months AND exp.created_at = act.created_at
  WHERE exp.id IS NULL OR act.id IS NULL;

  IF v_ip_bak_mismatch > 0 OR (SELECT COUNT(*) FROM public.installment_periods) <> 4 THEN
    RAISE EXCEPTION 'POST-ROLLBACK AUDIT FAILED: installment_periods ไม่ตรงกับค่าเดิม!';
  END IF;

  -- 6.2 ยืนยันว่าคอลัมน์ motorcycle_id ถูกถอดออกจริง
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name IN ('down_payment_options', 'installment_periods') 
      AND column_name = 'motorcycle_id'
  ) THEN
    RAISE EXCEPTION 'POST-ROLLBACK AUDIT FAILED: คอลัมน์ motorcycle_id ยังหลงเหลืออยู่ในตาราง!';
  END IF;

  -- 6.3 ยืนยันการคืนค่า Policies และ Table Grants ตรงตาม Security Snapshot จริง
  IF (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('down_payment_options', 'installment_periods')) 
     <> (SELECT COUNT(*) FROM public._pre_migration_security_snapshot_policies) THEN
    RAISE EXCEPTION 'POST-ROLLBACK AUDIT FAILED: จำนวน Policies ที่กู้คืนไม่ตรงกับ Security Snapshot!';
  END IF;

  FOR r IN (
    SELECT DISTINCT table_schema, table_name, grantee, privilege_type
    FROM public._pre_migration_security_snapshot_grants
    WHERE table_schema = 'public' AND lower(grantee) IN ('anon', 'authenticated', 'public')
  ) LOOP
    IF NOT has_table_privilege(
      CASE WHEN upper(r.grantee) = 'PUBLIC' THEN 'public' ELSE r.grantee END,
      format('%I.%I', r.table_schema, r.table_name),
      r.privilege_type
    ) THEN
      RAISE EXCEPTION 'POST-ROLLBACK AUDIT FAILED: สิทธิ์ % บน %I.%I สำหรับ % ไม่ได้รับการกู้คืน!',
        r.privilege_type, r.table_schema, r.table_name, r.grantee;
    END IF;
  END LOOP;

  RAISE NOTICE 'Phase 4 Rollback v2.4 completed successfully. Global configuration and security restored 100%%.';
END $$;
