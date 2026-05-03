import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseBrowserClient, resolveSupabaseEnv, supabaseEnvIssueMessage } from '../lib/supabaseClient.js';
import {
  rowToPin,
  sortPinsByCapturedAtDesc,
  shouldTriggerCriticalRealtimeAlert
} from '../lib/pinMappers.js';
import { FALLBACK_PINS } from '../data/railData.js';

const TABLE = 'pins';

function applyRealtimePayload(prevPins, payload) {
  const { eventType, new: nextRow, old: prevRow } = payload;
  if (eventType === 'INSERT' && nextRow) {
    const pin = rowToPin(nextRow);
    if (prevPins.some((p) => p.id === pin.id)) return prevPins;
    return sortPinsByCapturedAtDesc([...prevPins, pin]);
  }
  if (eventType === 'UPDATE' && nextRow) {
    const pin = rowToPin(nextRow);
    return sortPinsByCapturedAtDesc(prevPins.map((p) => (p.id === pin.id ? pin : p)));
  }
  if (eventType === 'DELETE' && prevRow?.id != null) {
    const rid = String(prevRow.id);
    return prevPins.filter((p) => p.id !== rid);
  }
  return prevPins;
}

/**
 * Loads defect pins from Supabase and subscribes to realtime changes.
 * Uses {@link FALLBACK_PINS} only when Supabase env is completely unset (local demo).
 * If env is set but invalid, or the query fails, shows an error and empty pins (no fake data).
 *
 * @param {{ onCriticalSeverity?: (pin: object) => void }} [options]
 */
export function useRailPins(options = {}) {
  const onCriticalSeverityRef = useRef(null);
  onCriticalSeverityRef.current = options.onCriticalSeverity;
  const envSnapshot = useMemo(() => resolveSupabaseEnv(), []);
  const client = useMemo(() => getSupabaseBrowserClient(), []);

  const [pins, setPins] = useState(() => {
    if (client) return [];
    if (envSnapshot.issue === 'unconfigured') return FALLBACK_PINS;
    return [];
  });
  const [status, setStatus] = useState(() => {
    if (client) return 'loading';
    if (envSnapshot.issue === 'unconfigured') return 'local';
    return 'config_error';
  });
  const [error, setError] = useState(() => {
    if (client) return null;
    if (envSnapshot.issue !== 'unconfigured' && envSnapshot.issue !== 'none') {
      return supabaseEnvIssueMessage(envSnapshot.issue);
    }
    return null;
  });

  useEffect(() => {
    if (!client) {
      if (envSnapshot.issue === 'unconfigured') {
        setPins(FALLBACK_PINS);
        setStatus('local');
        setError(null);
      } else {
        setPins([]);
        setStatus('config_error');
        setError(supabaseEnvIssueMessage(envSnapshot.issue));
      }
      return undefined;
    }

    let cancelled = false;

    async function load() {
      setStatus('loading');
      setError(null);
      const { data, error: fetchError } = await client
        .from(TABLE)
        .select('*')
        .order('captured_at', { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        console.warn('[useRailPins]', fetchError.message, fetchError);
        setError(
          `${fetchError.message} — check RLS policies (SELECT for anon) and that the table is public.pins.`
        );
        setPins([]);
        setStatus('error');
        return;
      }

      const mapped = (data ?? []).map(rowToPin);
      setPins(sortPinsByCapturedAtDesc(mapped));
      setStatus('remote');
    }

    load();

    const channel = client
      .channel(`realtime:${TABLE}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE },
        (payload) => {
          const { eventType, new: nextRow, old: prevRow } = payload;
          if (
            (eventType === 'INSERT' || eventType === 'UPDATE') &&
            nextRow &&
            shouldTriggerCriticalRealtimeAlert(
              eventType === 'INSERT' ? null : prevRow,
              nextRow
            )
          ) {
            onCriticalSeverityRef.current?.(rowToPin(nextRow));
          }
          setPins((prev) => applyRealtimePayload(prev, payload));
        }
      )
      .subscribe((subStatus, subErr) => {
        if (subErr) console.warn('[useRailPins] realtime', subErr.message);
        if (subStatus === 'CHANNEL_ERROR') {
          setError((prev) => prev || 'Realtime channel error — enable Realtime for table `pins` in Supabase.');
        }
      });

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  }, [client, envSnapshot.issue]);

  const openPinCount = useMemo(
    () => pins.filter((p) => p.sev !== 'resolved').length,
    [pins]
  );

  const resolvedPinCount = useMemo(
    () => pins.filter((p) => p.sev === 'resolved').length,
    [pins]
  );

  return {
    pins,
    status,
    error,
    openPinCount,
    resolvedPinCount,
    usingRemote: status === 'remote'
  };
}
