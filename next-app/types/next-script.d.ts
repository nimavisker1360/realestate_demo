declare module 'next/script' {
  import type { JSX, ScriptHTMLAttributes } from 'react';

  type ScriptStrategy =
    | 'beforeInteractive'
    | 'afterInteractive'
    | 'lazyOnload'
    | 'worker';

  export interface ScriptProps extends ScriptHTMLAttributes<HTMLScriptElement> {
    id?: string;
    strategy?: ScriptStrategy;
    onReady?: () => void;
  }

  export default function Script(props: ScriptProps): JSX.Element;
}
