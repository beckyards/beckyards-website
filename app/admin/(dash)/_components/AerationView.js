'use client';

import SignupListView from './SignupListView';
import { AERATION_SEASON } from '../../../../lib/seasons';

const CONFIG = {
  endpoint: '/api/admin/aeration',
  title: 'Aeration List',
  lead:
    'Everyone who signed up for aeration & overseeding through the site, grouped by season. ' +
    "Click any name, phone, email, or address to edit it, add what you're charging, check them off " +
    "once done, and drag a row by its handle to reorder the list however you'd like to work through them.",
  listName: 'aeration list',
  currentSeason: AERATION_SEASON,
  serviceLabels: {
    aeration: 'Aeration Only',
    aeration_overseeding: 'Aeration + Overseeding',
  },
};

export default function AerationView() {
  return <SignupListView config={CONFIG} />;
}
