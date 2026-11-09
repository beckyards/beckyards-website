'use client';

import SignupListView from './SignupListView';
import { LEAF_CLEANUP_SEASON } from '../../../../lib/seasons';

const CONFIG = {
  endpoint: '/api/admin/leaf-cleanup',
  title: 'Leaf Cleanup List',
  lead:
    'Everyone who signed up for a fall leaf cleanup through the site, grouped by season. ' +
    "Click any name, phone, email, address, or note to edit it, add what you're charging, check them off " +
    'once done, and drag a row by its handle to set the order you want to work through them.',
  listName: 'leaf cleanup list',
  currentSeason: LEAF_CLEANUP_SEASON,
  showNotes: true,
};

export default function LeafCleanupView() {
  return <SignupListView config={CONFIG} />;
}
