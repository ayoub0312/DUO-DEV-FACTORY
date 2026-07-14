import { TONE_DOT, type Tone } from '../lib/workflow-ui';

export function StatusDot({ tone }: { tone: Tone }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${TONE_DOT[tone]}`} aria-hidden />;
}
