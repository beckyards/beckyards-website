'use client';

import Editable from '../Editable';
import { Bar, set } from '../helpers';
import '../../components/chrome.css';

export default function PromoBarView({ c, set: setC }) {
  const edit = (key, extra) => ({ value: c[key], onCommit: (v) => setC(set(c, key, v)), ...extra });
  return (
    <div className="pv-root">
      <Bar label="Top promo bar" />
      <main id="main">
        <div className="promo-bar">
          <span className="promo-bar-inner">
            <span className="promo-bar-text">
              <Editable {...edit('message', { placeholder: 'Banner message' })} />
            </span>
            <span className="promo-bar-link">
              <span className="promo-bar-link-label">
                <Editable {...edit('linkLabel', { placeholder: 'Link label' })} />
              </span>
            </span>
          </span>
        </div>
        <p className="pv-note" style={{ padding: 24 }}>
          This banner sits above the header on every page (except the admin area) and links to the quote form.
          Clear the message to hide the banner; clear the link label to show the message only.
        </p>
      </main>
    </div>
  );
}
