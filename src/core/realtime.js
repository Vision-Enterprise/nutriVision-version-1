/**
 * Realtime Synchronization Service
 *
 * Listens to postgres changes across commodities, batches, and releases.
 * When an insertion, update, or deletion occurs on any client/account/deployment,
 * automatically triggers router.refresh() to keep all views synchronized in real time.
 */

import { supabase } from './supabase.js';
import { router } from './router.js';

let _channel = null;
let _debounceTimer = null;

export function initRealtimeSync() {
  if (_channel) return _channel;

  try {
    _channel = supabase
      .channel('inventory_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commodities' },
        (payload) => _handleRealtimeChange('commodities', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'batches' },
        (payload) => _handleRealtimeChange('batches', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'releases' },
        (payload) => _handleRealtimeChange('releases', payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeSync] Connected to Supabase real-time channel.');
        }
      });
  } catch (err) {
    console.warn('[RealtimeSync] Could not initialize real-time listener:', err);
  }

  return _channel;
}

export function destroyRealtimeSync() {
  if (_channel) {
    try {
      supabase.removeChannel(_channel);
    } catch {}
    _channel = null;
  }
  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
}

function _handleRealtimeChange(table, payload) {
  // Do not refresh if an interactive modal is currently open so user work isn't interrupted
  const activeModal = document.querySelector('.modal-overlay');
  if (activeModal) {
    return;
  }

  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    console.log(`[RealtimeSync] Data change in ${table} (${payload.eventType || 'event'}), refreshing view...`);
    router.refresh();
  }, 400);
}
