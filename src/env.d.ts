/// <reference types="vite/client" />
// Virtual modules are typed via tsconfig "paths" → src/types/virtual-*.d.ts

interface ImportMetaEnv {
  /** Backend base URL (Railway). Empty → same origin. */
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Web push public key (VAPID). Optional. */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  /** 'memory' for the single-file preview build (route kept in memory, not in the URL). */
  readonly VITE_ROUTER?: string;
}
