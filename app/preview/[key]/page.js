'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  HOME_DEFAULT,
  ABOUT_DEFAULT,
  CONTACT_PAGE_DEFAULT,
  PROMO_BAR_DEFAULT,
  FOOTER_DEFAULT,
  TERMS_DEFAULT,
} from '../../../lib/pageContent';
import HomeView from '../views/HomeView';
import AboutView from '../views/AboutView';
import ContactView from '../views/ContactView';
import TermsView from '../views/TermsView';
import PromoBarView from '../views/PromoBarView';
import FooterView from '../views/FooterView';
import '../preview.css';

// One template per editable content key. Each mirrors the markup of the live
// page (same classes, so the real CSS applies) with Editable fields swapped in.
const VIEWS = {
  home: HomeView,
  about: AboutView,
  contact: ContactView,
  terms: TermsView,
  promoBar: PromoBarView,
  footer: FooterView,
};

const DEFAULTS = {
  home: HOME_DEFAULT,
  about: ABOUT_DEFAULT,
  contact: CONTACT_PAGE_DEFAULT,
  promoBar: PROMO_BAR_DEFAULT,
  footer: FOOTER_DEFAULT,
  terms: TERMS_DEFAULT,
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Same shallow merge the public site uses (lib/siteContent.js getContent), so a
// saved row from before a field existed still shows that field's default here.
function withDefaults(pageKey, value) {
  const base = DEFAULTS[pageKey];
  if (isPlainObject(base) && isPlainObject(value)) return { ...base, ...value };
  return value ?? base ?? {};
}

// Talks to the admin's Visual tab (app/admin/(dash)/_components/VisualEditor.js)
// over postMessage. Same origin always (this only ever loads in an iframe the
// admin panel itself puts on the page), but we still check event.origin.
function usePreviewSync(pageKey) {
  const [content, setContent] = useState(() => withDefaults(pageKey, null));

  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (msg?.source !== 'oskelo-admin') return;
      if (msg.type === 'content') setContent(withDefaults(pageKey, msg.value));
    }
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ source: 'oskelo-preview', type: 'ready', key: pageKey }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [pageKey]);

  const update = useCallback((next) => {
    setContent(next);
    window.parent.postMessage({ source: 'oskelo-preview', type: 'change', value: next }, window.location.origin);
  }, []);

  return [content, update];
}

// The templates contain real links (header, footer, buttons). Inside the editor
// they must never navigate the iframe away from the page being edited.
function blockNavigation(e) {
  if (e.target.closest?.('a[href]')) e.preventDefault();
}

export default function PreviewPage() {
  const params = useParams();
  const key = params?.key;
  const [content, setContent] = usePreviewSync(key);
  const View = Object.hasOwn(VIEWS, key) ? VIEWS[key] : null;

  if (!View) return <p style={{ padding: 24 }}>No visual preview for "{key}" yet — use the Form or Raw JSON tab.</p>;

  return (
    <div onClickCapture={blockNavigation}>
      <View c={content} set={setContent} />
    </div>
  );
}
