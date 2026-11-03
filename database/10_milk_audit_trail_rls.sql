-- ============================================================
-- NutriVision — Database Migration 10
-- Fix: Milk Bank & Activity Audit Trail Visibility for All Users
--
-- WHY:
-- In database/02_rls.sql, the SELECT policy on public.audit_logs
-- restricted non-administrators to only see rows where user_id = auth.uid().
-- As a result, Nutrition Personnel could not see Milk Bank audit
-- trails (batch pasteurizations, shelf moves, dispensing, donations)
-- logged by administrators or other team members.
--
-- FIX:
-- Allow all authenticated users to read audit logs so all team members
-- see the unified audit trail across the Milk Bank and system.
-- (Main Audit Logs page in navigation remains guarded by admin role).
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;

CREATE POLICY "audit_logs_select"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);
