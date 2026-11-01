-- ====================================================================
-- M MOTOR CATALOG: PHASE 4 SQL MIGRATION (PER-MOTORCYCLE CONFIGURATION)
-- Production-Ready Hardened Edition v2.4 (Enterprise Production Standard)
-- ====================================================================
-- Target Database: Supabase PostgreSQL (m-motor-voucher)
-- Description:
--   ปรับปรุงการตั้งค่าเงินดาวน์ (down_payment_options) และจำนวนงวด (installment_periods)
--   จากระดับ Global เป็นรายคัน (Per-Motorcycle Configuration) โดยผูกกับ motorcycles.id
--
-- Guarantees & Constraints:
--   1. Schema Integrity: ตรวจสอบและสร้าง Foreign Key แยกตาราง (ON DELETE CASCADE ชี้ไปที่ public.motorcycles.id)
--      ตรวจสอบและกำจัด Foreign Key ผิดตัว ป้องกันการสร้าง FK ซ้ำซ้อน
--   2. Non-destructive Backup: สำรองข้อมูลเดิมครบทุกคอลัมน์ (id, amount/months, created_at)
--      ตรวจสอบ Exact Match ทั้ง 5 แถวเงินดาวน์ และ 4 แถวจำนวนงวด ห้ามตรวจเพียงจำนวน Records
--   3. Security Snapshot: บันทึก snapshot ของ RLS Policies และ Table Grants จริงก่อนการเปลี่ยนแปลง
--   4. installment_plans 100% Intact: ห้ามมีคำสั่ง DDL/DML ใน installment_plans ตรวจสอบทั้ง 12 Records
--   5. motorcycles 100% Intact: ตรวจสอบข้อมูลรถทั้ง 13 คันด้วย ID และชื่อรุ่นจริง ห้ามตรวจเพียง COUNT >= 13
--   6. Exact Per-Motorcycle Dataset: ยืนยัน 21 Down Payment rows และ 36 Installment Period rows พอดี
--      ตรวจสอบ Missing = 0, Extra = 0, Duplicate = 0 รายคัน หากมีสิ่งผิดปกติให้ Abort ทันที
--   7. Central Admin Least Privilege: กำหนด RLS นโยบายให้เฉพาะ Central Admin ผ่าน public.is_central_admin()
--      ที่มีสิทธิ์ INSERT, UPDATE, DELETE บุคคลทั่วไป (anon) และ authenticated ทั่วไปไม่มีสิทธิ์เขียน
-- ====================================================================

DO $$
DECLARE
  v_moto_mismatch INT := 0;
  v_plans_mismatch INT := 0;
  v_backup_dp_mismatch INT := 0;
  v_backup_period_mismatch INT := 0;
  v_dp_fk_valid BOOLEAN := false;
  v_period_fk_valid BOOLEAN := false;
  v_dp_missing INT := 0;
  v_dp_extra INT := 0;
  v_dp_dup INT := 0;
  v_period_missing INT := 0;
  v_period_extra INT := 0;
  v_period_dup INT := 0;
  v_null_dp INT := 0;
  v_null_period INT := 0;
  r RECORD;
BEGIN
  -- ------------------------------------------------------------------
  -- 0. PRE-CHECK: ตรวจสอบความถูกต้องของ motorcycles และ installment_plans
  -- ------------------------------------------------------------------
  -- 0.1 ตรวจสอบรถจักรยานยนต์ทั้ง 13 คันแบบ Exact Match ด้วย ID และชื่อรุ่นจริง
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
    RAISE EXCEPTION 'MIGRATION ABORTED: พบข้อมูลรถจักรยานยนต์ไม่ตรงกับฐานข้อมูลจริง (mismatches: %)', v_moto_mismatch;
  END IF;

  -- 0.2 ตรวจสอบ installment_plans เดิมทั้ง 12 Records ครบทุกคอลัมน์จริง
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
    RAISE EXCEPTION 'MIGRATION ABORTED: installment_plans 12 records mismatch ก่อน migration (พบความไม่ตรงกัน % จุด)', v_plans_mismatch;
  END IF;

  -- ------------------------------------------------------------------
  -- 1. PRE-MIGRATION BACKUP & SECURITY SNAPSHOT CREATION
  -- ------------------------------------------------------------------
  -- 1.1 ตรวจสอบและสร้างตาราง Backup ข้อมูลเดิม
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = '_backup_phase4_down_payment_options'
  ) THEN
    CREATE TABLE public._backup_phase4_down_payment_options AS 
      SELECT id, amount, created_at FROM public.down_payment_options;
    
    REVOKE ALL ON TABLE public._backup_phase4_down_payment_options FROM PUBLIC, anon, authenticated;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = '_backup_phase4_installment_periods'
  ) THEN
    CREATE TABLE public._backup_phase4_installment_periods AS 
      SELECT id, months, created_at FROM public.installment_periods;

    REVOKE ALL ON TABLE public._backup_phase4_installment_periods FROM PUBLIC, anon, authenticated;
  END IF;

  -- 1.2 ตรวจสอบความถูกต้องของ Backup แบบ Exact Match ทุกคอลัมน์ (ID, Value, Timestamp)
  WITH expected_dp_backup AS (
    SELECT 13::bigint AS id, 0.00::numeric(12,2) AS amount, '2026-10-27T07:30:24+00:00'::timestamptz AS created_at UNION ALL
    SELECT 18, 28000.00, '2026-10-31T07:11:55.717461+00:00'::timestamptz UNION ALL
    SELECT 19, 30000.00, '2026-10-31T07:12:26.400934+00:00'::timestamptz UNION ALL
    SELECT 20, 40000.00, '2026-10-31T07:12:33.186026+00:00'::timestamptz UNION ALL
    SELECT 21, 50000.00, '2026-10-31T07:12:39.762885+00:00'::timestamptz
  )
  SELECT COUNT(*) INTO v_backup_dp_mismatch
  FROM expected_dp_backup exp
  FULL OUTER JOIN public._backup_phase4_down_payment_options act
    ON exp.id = act.id AND exp.amount = act.amount AND exp.created_at = act.created_at
  WHERE exp.id IS NULL OR act.id IS NULL;

  IF v_backup_dp_mismatch > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: ข้อมูลใน _backup_phase4_down_payment_options ไม่ตรงกับ Snapshot (mismatches: %)', v_backup_dp_mismatch;
  END IF;

  WITH expected_period_backup AS (
    SELECT 1::bigint AS id, 24::int AS months, '2026-10-25T06:03:17+00:00'::timestamptz AS created_at UNION ALL
    SELECT 3, 36, '2026-10-25T06:03:22+00:00'::timestamptz UNION ALL
    SELECT 5, 60, '2026-10-31T07:12:55.704847+00:00'::timestamptz UNION ALL
    SELECT 6, 48, '2026-10-31T07:13:34.493119+00:00'::timestamptz
  )
  SELECT COUNT(*) INTO v_backup_period_mismatch
  FROM expected_period_backup exp
  FULL OUTER JOIN public._backup_phase4_installment_periods act
    ON exp.id = act.id AND exp.months = act.months AND exp.created_at = act.created_at
  WHERE exp.id IS NULL OR act.id IS NULL;

  IF v_backup_period_mismatch > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: ข้อมูลใน _backup_phase4_installment_periods ไม่ตรงกับ Snapshot (mismatches: %)', v_backup_period_mismatch;
  END IF;

  -- 1.3 บันทึก Snapshot ของ Security Configuration (Policies, Grants, RLS State, Sequences) ก่อน Migration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = '_pre_migration_security_snapshot_policies'
  ) THEN
    CREATE TABLE public._pre_migration_security_snapshot_policies AS
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check, now() AS captured_at
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('down_payment_options', 'installment_periods');

    REVOKE ALL ON TABLE public._pre_migration_security_snapshot_policies FROM PUBLIC, anon, authenticated;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = '_pre_migration_security_snapshot_grants'
  ) THEN
    CREATE TABLE public._pre_migration_security_snapshot_grants AS
    SELECT table_schema, table_name, grantee, privilege_type, is_grantable, now() AS captured_at
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name IN ('down_payment_options', 'installment_periods');

    REVOKE ALL ON TABLE public._pre_migration_security_snapshot_grants FROM PUBLIC, anon, authenticated;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = '_pre_migration_security_snapshot_rls'
  ) THEN
    CREATE TABLE public._pre_migration_security_snapshot_rls AS
    SELECT n.nspname AS schemaname, c.relname AS tablename, c.relrowsecurity, c.relforcerowsecurity, now() AS captured_at
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('down_payment_options', 'installment_periods');

    REVOKE ALL ON TABLE public._pre_migration_security_snapshot_rls FROM PUBLIC, anon, authenticated;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = '_pre_migration_security_snapshot_sequences'
  ) THEN
    CREATE TABLE public._pre_migration_security_snapshot_sequences AS
    SELECT 
      c.relname AS sequence_name,
      CASE WHEN e.grantee = 0 THEN 'PUBLIC' ELSE rol.rolname END AS grantee,
      e.privilege_type,
      e.is_grantable,
      now() AS captured_at
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) e
    LEFT JOIN pg_roles rol ON rol.oid = e.grantee
    WHERE n.nspname = 'public'
      AND c.relkind = 'S'
      AND c.relname IN (
        replace(pg_get_serial_sequence('public.down_payment_options', 'id'), 'public.', ''),
        replace(pg_get_serial_sequence('public.installment_periods', 'id'), 'public.', '')
      );

    REVOKE ALL ON TABLE public._pre_migration_security_snapshot_sequences FROM PUBLIC, anon, authenticated;
  END IF;

  -- ------------------------------------------------------------------
  -- 2. SCHEMA MIGRATION: ปรับโครงสร้างตารางและ Foreign Keys แยกตาราง
  -- ------------------------------------------------------------------
  -- 2.1 เพิ่มคอลัมน์ motorcycle_id หากยังไม่มี
  ALTER TABLE public.down_payment_options
    ADD COLUMN IF NOT EXISTS motorcycle_id BIGINT;

  ALTER TABLE public.installment_periods
    ADD COLUMN IF NOT EXISTS motorcycle_id BIGINT;

  -- 2.2 ตรวจสอบและกำจัด Foreign Key ที่ผิดตัวหรือมีคอลัมน์ไม่ถูกต้องบน down_payment_options
  FOR r IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'down_payment_options'
      AND con.contype = 'f'
      AND NOT (
        con.confrelid = 'public.motorcycles'::regclass
        AND cardinality(con.conkey) = 1
        AND con.conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = con.conrelid AND attname = 'motorcycle_id')
        AND cardinality(con.confkey) = 1
        AND con.confkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = con.confrelid AND attname = 'id')
        AND con.confdeltype = 'c'
      )
  ) LOOP
    EXECUTE format('ALTER TABLE public.down_payment_options DROP CONSTRAINT %I', r.conname);
  END LOOP;

  -- ตรวจสอบว่ามี FK ที่ถูกต้องครอบคลุมทุกคอลัมน์อยู่แล้วหรือไม่
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'down_payment_options'
      AND con.contype = 'f'
      AND con.confrelid = 'public.motorcycles'::regclass
      AND cardinality(con.conkey) = 1
      AND con.conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = con.conrelid AND attname = 'motorcycle_id')
      AND cardinality(con.confkey) = 1
      AND con.confkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = con.confrelid AND attname = 'id')
      AND con.confdeltype = 'c'
  ) INTO v_dp_fk_valid;

  IF NOT v_dp_fk_valid THEN
    ALTER TABLE public.down_payment_options
      ADD CONSTRAINT fk_down_payment_options_motorcycle
      FOREIGN KEY (motorcycle_id) REFERENCES public.motorcycles(id) ON DELETE CASCADE;
  END IF;

  -- 2.3 ตรวจสอบและกำจัด Foreign Key ที่ผิดตัวหรือมีคอลัมน์ไม่ถูกต้องบน installment_periods
  FOR r IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'installment_periods'
      AND con.contype = 'f'
      AND NOT (
        con.confrelid = 'public.motorcycles'::regclass
        AND cardinality(con.conkey) = 1
        AND con.conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = con.conrelid AND attname = 'motorcycle_id')
        AND cardinality(con.confkey) = 1
        AND con.confkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = con.confrelid AND attname = 'id')
        AND con.confdeltype = 'c'
      )
  ) LOOP
    EXECUTE format('ALTER TABLE public.installment_periods DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;

  -- ตรวจสอบว่ามี FK ที่ถูกต้องครอบคลุมทุกคอลัมน์อยู่แล้วหรือไม่
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'installment_periods'
      AND con.contype = 'f'
      AND con.confrelid = 'public.motorcycles'::regclass
      AND cardinality(con.conkey) = 1
      AND con.conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = con.conrelid AND attname = 'motorcycle_id')
      AND cardinality(con.confkey) = 1
      AND con.confkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = con.confrelid AND attname = 'id')
      AND con.confdeltype = 'c'
  ) INTO v_period_fk_valid;

  IF NOT v_period_fk_valid THEN
    ALTER TABLE public.installment_periods
      ADD CONSTRAINT fk_installment_periods_motorcycle
      FOREIGN KEY (motorcycle_id) REFERENCES public.motorcycles(id) ON DELETE CASCADE;
  END IF;

  -- 2.4 ปลด Unique Constraints เดิมที่เป็น Single Column จาก Catalog จริง
  FOR r IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
    WHERE n.nspname = 'public'
      AND c.relname = 'down_payment_options'
      AND con.contype = 'u'
      AND cardinality(con.conkey) = 1
      AND att.attname = 'amount'
  ) LOOP
    EXECUTE format('ALTER TABLE public.down_payment_options DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
  ALTER TABLE public.down_payment_options DROP CONSTRAINT IF EXISTS down_payment_options_amount_key;

  FOR r IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
    WHERE n.nspname = 'public'
      AND c.relname = 'installment_periods'
      AND con.contype = 'u'
      AND cardinality(con.conkey) = 1
      AND att.attname = 'months'
  ) LOOP
    EXECUTE format('ALTER TABLE public.installment_periods DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
  ALTER TABLE public.installment_periods DROP CONSTRAINT IF EXISTS installment_periods_months_key;

  -- ------------------------------------------------------------------
  -- 3. DATA RECONCILIATION & POPULATION (PER-MOTORCYCLE CONFIGURATION)
  -- ------------------------------------------------------------------
  -- ลบเฉพาะแถวเดิมที่เป็น Global (motorcycle_id IS NULL)
  DELETE FROM public.down_payment_options WHERE motorcycle_id IS NULL;
  DELETE FROM public.installment_periods WHERE motorcycle_id IS NULL;

  -- แทรกข้อมูลเงินดาวน์รายคัน (Target 21 Records)
  INSERT INTO public.down_payment_options (motorcycle_id, amount)
  SELECT m_id, amt
  FROM (
    VALUES
      (6, 0.00::numeric), (6, 13000.00::numeric), (6, 28000.00::numeric), (6, 30000.00::numeric), (6, 40000.00::numeric), (6, 50000.00::numeric),
      (5, 0.00::numeric), (5, 10000.00::numeric),
      (7, 0.00::numeric), (7, 15000.00::numeric),
      (8, 0.00::numeric), (8, 12000.00::numeric),
      (9, 0.00::numeric), (12, 0.00::numeric), (13, 0.00::numeric), (14, 0.00::numeric),
      (15, 0.00::numeric), (16, 0.00::numeric), (17, 0.00::numeric), (18, 0.00::numeric), (19, 0.00::numeric)
  ) AS v(m_id, amt)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.down_payment_options dpo
    WHERE dpo.motorcycle_id = v.m_id AND dpo.amount = v.amt
  );

  -- แทรกข้อมูลจำนวนงวดรายคัน (Target 36 Records)
  INSERT INTO public.installment_periods (motorcycle_id, months)
  SELECT m_id, mth
  FROM (
    VALUES
      (6, 12), (6, 18), (6, 24), (6, 36), (6, 48), (6, 60),
      (5, 12), (5, 18), (5, 24), (5, 36),
      (7, 12), (7, 18), (7, 24), (7, 36),
      (8, 12), (8, 18), (8, 24), (8, 36),
      (9, 24), (9, 36), (12, 24), (12, 36), (13, 24), (13, 36), (14, 24), (14, 36),
      (15, 24), (15, 36), (16, 24), (16, 36), (17, 24), (17, 36), (18, 24), (18, 36), (19, 24), (19, 36)
  ) AS v(m_id, mth)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.installment_periods ip
    WHERE ip.motorcycle_id = v.m_id AND ip.months = v.mth
  );

  -- ------------------------------------------------------------------
  -- 4. EXACT DATASET VERIFICATION (MISSING, EXTRA, DUPLICATE AUDIT)
  -- ------------------------------------------------------------------
  -- 4.1 ตรวจสอบความถูกต้องรายแถวของเงินดาวน์ทั้ง 21 แถว
  WITH expected_dp AS (
    SELECT 6::bigint AS motorcycle_id, 0.00::numeric(12,2) AS amount UNION ALL
    SELECT 6, 13000.00 UNION ALL
    SELECT 6, 28000.00 UNION ALL
    SELECT 6, 30000.00 UNION ALL
    SELECT 6, 40000.00 UNION ALL
    SELECT 6, 50000.00 UNION ALL
    SELECT 5, 0.00 UNION ALL
    SELECT 5, 10000.00 UNION ALL
    SELECT 7, 0.00 UNION ALL
    SELECT 7, 15000.00 UNION ALL
    SELECT 8, 0.00 UNION ALL
    SELECT 8, 12000.00 UNION ALL
    SELECT 9, 0.00 UNION ALL
    SELECT 12, 0.00 UNION ALL
    SELECT 13, 0.00 UNION ALL
    SELECT 14, 0.00 UNION ALL
    SELECT 15, 0.00 UNION ALL
    SELECT 16, 0.00 UNION ALL
    SELECT 17, 0.00 UNION ALL
    SELECT 18, 0.00 UNION ALL
    SELECT 19, 0.00
  )
  SELECT 
    COUNT(*) FILTER (WHERE act.motorcycle_id IS NULL) AS missing_count,
    COUNT(*) FILTER (WHERE exp.motorcycle_id IS NULL) AS extra_count
  INTO v_dp_missing, v_dp_extra
  FROM expected_dp exp
  FULL OUTER JOIN public.down_payment_options act
    ON exp.motorcycle_id = act.motorcycle_id AND exp.amount = act.amount;

  SELECT COUNT(*) INTO v_dp_dup
  FROM (
    SELECT motorcycle_id, amount FROM public.down_payment_options GROUP BY motorcycle_id, amount HAVING count(*) > 1
  ) sub;

  SELECT COUNT(*) INTO v_null_dp FROM public.down_payment_options WHERE motorcycle_id IS NULL;

  IF v_dp_missing > 0 OR v_dp_extra > 0 OR v_dp_dup > 0 OR v_null_dp > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: down_payment_options dataset mismatch (missing: %, extra: %, duplicate: %, null: %)',
      v_dp_missing, v_dp_extra, v_dp_dup, v_null_dp;
  END IF;

  -- 4.2 ตรวจสอบความถูกต้องรายแถวของจำนวนงวดทั้ง 36 แถว
  WITH expected_periods AS (
    SELECT 6::bigint AS motorcycle_id, 12::int AS months UNION ALL
    SELECT 6, 18 UNION ALL
    SELECT 6, 24 UNION ALL
    SELECT 6, 36 UNION ALL
    SELECT 6, 48 UNION ALL
    SELECT 6, 60 UNION ALL
    SELECT 5, 12 UNION ALL
    SELECT 5, 18 UNION ALL
    SELECT 5, 24 UNION ALL
    SELECT 5, 36 UNION ALL
    SELECT 7, 12 UNION ALL
    SELECT 7, 18 UNION ALL
    SELECT 7, 24 UNION ALL
    SELECT 7, 36 UNION ALL
    SELECT 8, 12 UNION ALL
    SELECT 8, 18 UNION ALL
    SELECT 8, 24 UNION ALL
    SELECT 8, 36 UNION ALL
    SELECT 9, 24 UNION ALL
    SELECT 9, 36 UNION ALL
    SELECT 12, 24 UNION ALL
    SELECT 12, 36 UNION ALL
    SELECT 13, 24 UNION ALL
    SELECT 13, 36 UNION ALL
    SELECT 14, 24 UNION ALL
    SELECT 14, 36 UNION ALL
    SELECT 15, 24 UNION ALL
    SELECT 15, 36 UNION ALL
    SELECT 16, 24 UNION ALL
    SELECT 16, 36 UNION ALL
    SELECT 17, 24 UNION ALL
    SELECT 17, 36 UNION ALL
    SELECT 18, 24 UNION ALL
    SELECT 18, 36 UNION ALL
    SELECT 19, 24 UNION ALL
    SELECT 19, 36
  )
  SELECT 
    COUNT(*) FILTER (WHERE act.motorcycle_id IS NULL) AS missing_count,
    COUNT(*) FILTER (WHERE exp.motorcycle_id IS NULL) AS extra_count
  INTO v_period_missing, v_period_extra
  FROM expected_periods exp
  FULL OUTER JOIN public.installment_periods act
    ON exp.motorcycle_id = act.motorcycle_id AND exp.months = act.months;

  SELECT COUNT(*) INTO v_period_dup
  FROM (
    SELECT motorcycle_id, months FROM public.installment_periods GROUP BY motorcycle_id, months HAVING count(*) > 1
  ) sub;

  SELECT COUNT(*) INTO v_null_period FROM public.installment_periods WHERE motorcycle_id IS NULL;

  IF v_period_missing > 0 OR v_period_extra > 0 OR v_period_dup > 0 OR v_null_period > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: installment_periods dataset mismatch (missing: %, extra: %, duplicate: %, null: %)',
      v_period_missing, v_period_extra, v_period_dup, v_null_period;
  END IF;

  -- ------------------------------------------------------------------
  -- 5. CONSTRAINTS, INDEXES & SEQUENCE SYNC
  -- ------------------------------------------------------------------
  ALTER TABLE public.down_payment_options 
    ALTER COLUMN motorcycle_id SET NOT NULL;

  ALTER TABLE public.installment_periods 
    ALTER COLUMN motorcycle_id SET NOT NULL;

  -- สร้าง Composite UNIQUE constraints โดยจำกัด schema public และ table ให้ชัดเจน
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
      AND c.relname = 'down_payment_options'
      AND con.contype = 'u'
      AND con.conname = 'uq_down_payment_options_moto_amount'
  ) THEN
    ALTER TABLE public.down_payment_options
      ADD CONSTRAINT uq_down_payment_options_moto_amount UNIQUE (motorcycle_id, amount);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
      AND c.relname = 'installment_periods'
      AND con.contype = 'u'
      AND con.conname = 'uq_installment_periods_moto_months'
  ) THEN
    ALTER TABLE public.installment_periods
      ADD CONSTRAINT uq_installment_periods_moto_months UNIQUE (motorcycle_id, months);
  END IF;

  -- สร้างดัชนีเพื่อประสิทธิภาพการสืบค้น
  CREATE INDEX IF NOT EXISTS idx_down_payment_options_motorcycle_id 
    ON public.down_payment_options (motorcycle_id ASC);

  CREATE INDEX IF NOT EXISTS idx_installment_periods_motorcycle_id 
    ON public.installment_periods (motorcycle_id ASC);

  -- ซิงค์ Sequence เพื่อให้ NextVal ปลอดภัย โดยตรวจสอบการมีอยู่ของ Sequence ก่อน
  IF pg_get_serial_sequence('public.down_payment_options', 'id') IS NULL THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: ไม่พบ Sequence สำหรับ public.down_payment_options.id';
  END IF;

  IF pg_get_serial_sequence('public.installment_periods', 'id') IS NULL THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: ไม่พบ Sequence สำหรับ public.installment_periods.id';
  END IF;

  PERFORM setval(
    pg_get_serial_sequence('public.down_payment_options', 'id'),
    COALESCE((SELECT MAX(id) FROM public.down_payment_options), 1)
  );

  PERFORM setval(
    pg_get_serial_sequence('public.installment_periods', 'id'),
    COALESCE((SELECT MAX(id) FROM public.installment_periods), 1)
  );

  -- ------------------------------------------------------------------
  -- 6. LEAST PRIVILEGE RLS POLICIES & PERMISSIONS
  -- ------------------------------------------------------------------
  ALTER TABLE public.down_payment_options ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.installment_periods ENABLE ROW LEVEL SECURITY;

  -- ลบนโยบายเก่าทั้งหมดแบบ Dynamic เพื่อไม่ให้มี Policy สิทธิ์กว้างเกินไปหลงเหลือ
  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'down_payment_options'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.down_payment_options', r.policyname);
  END LOOP;

  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'installment_periods'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.installment_periods', r.policyname);
  END LOOP;

  -- ลิดรอนสิทธิ์เดิมทั้งหมดออกจาก Table
  REVOKE ALL ON TABLE public.down_payment_options FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.installment_periods FROM PUBLIC, anon, authenticated;

  -- Public / Anon: สิทธิ์อ่านอย่างเดียว (SELECT ONLY)
  GRANT SELECT ON TABLE public.down_payment_options TO anon;
  GRANT SELECT ON TABLE public.installment_periods TO anon;

  -- Authenticated: สิทธิ์ SELECT, INSERT, UPDATE, DELETE (ถูกกรองด้วย RLS is_central_admin())
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.down_payment_options TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.installment_periods TO authenticated;

  -- Sequence Grants: ให้เฉพาะ Authenticated และตัดสิทธิ์ทั้งหมดออกจาก anon และ PUBLIC
  IF pg_get_serial_sequence('public.down_payment_options', 'id') IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon', 
      pg_get_serial_sequence('public.down_payment_options', 'id'));
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', 
      pg_get_serial_sequence('public.down_payment_options', 'id'));
  END IF;

  IF pg_get_serial_sequence('public.installment_periods', 'id') IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon', 
      pg_get_serial_sequence('public.installment_periods', 'id'));
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', 
      pg_get_serial_sequence('public.installment_periods', 'id'));
  END IF;

  -- นโยบายการอ่านสาธารณะ (SELECT)
  CREATE POLICY "Public Can View Down Payments" 
  ON public.down_payment_options FOR SELECT 
  TO anon, authenticated 
  USING (true);

  CREATE POLICY "Public Can View Installment Periods" 
  ON public.installment_periods FOR SELECT 
  TO anon, authenticated 
  USING (true);

  -- นโยบายการเขียนจำกัดเฉพาะ Central Admin ผ่าน is_central_admin()
  CREATE POLICY "Admin Full Control Down Payments" 
  ON public.down_payment_options FOR ALL 
  TO authenticated 
  USING (public.is_central_admin()) 
  WITH CHECK (public.is_central_admin());

  CREATE POLICY "Admin Full Control Installment Periods" 
  ON public.installment_periods FOR ALL 
  TO authenticated 
  USING (public.is_central_admin()) 
  WITH CHECK (public.is_central_admin());

  -- ------------------------------------------------------------------
  -- 7. POST-MIGRATION FINAL INTEGRITY AUDIT
  -- ------------------------------------------------------------------
  -- 7.1 ยืนยัน installment_plans ทั้ง 12 Records 100% ไม่เปลี่ยนแปลง
  WITH expected_plans_post AS (
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
  FROM expected_plans_post exp
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
    RAISE EXCEPTION 'MIGRATION ABORTED: installment_plans ถูกเปลี่ยนแปลงระหว่าง migration (พบความไม่ตรงกัน % จุด)', v_plans_mismatch;
  END IF;

  -- 7.2 ยืนยัน motorcycles ทั้ง 13 คันไม่เปลี่ยนแปลง
  WITH expected_motos_post AS (
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
  FROM expected_motos_post exp
  FULL OUTER JOIN public.motorcycles act
    ON exp.id = act.id AND exp.model = act.model
  WHERE exp.id IS NULL OR act.id IS NULL;

  IF v_moto_mismatch > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: motorcycles ถูกเปลี่ยนแปลงระหว่าง migration (พบความไม่ตรงกัน % จุด)', v_moto_mismatch;
  END IF;

  RAISE NOTICE 'Phase 4 Per-Motorcycle Migration v2.4 executed and verified successfully.';
END $$;
