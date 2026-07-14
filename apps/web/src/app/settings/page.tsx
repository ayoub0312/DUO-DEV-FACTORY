import { requirePageOwner } from '../../server/guard';
import { SettingsContent } from './settings-content';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requirePageOwner('/settings');
  return <SettingsContent />;
}
