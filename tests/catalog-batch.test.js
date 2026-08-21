import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { VENUES, distanceKm, areaById } from '../src/venues.js';

const ROOT = path.resolve(import.meta.dirname, '..');

test('diagnose climbing near Wedding: exactly two climbing venues exist within 3km without inventing venues', () => {
  const wedding = areaById('wedding');
  assert.ok(wedding, 'Wedding area exists in dataset');

  // Find all climbing/bouldering venues in the real dataset within 3km of Wedding
  const climbingNearWedding = VENUES
    .map(v => ({ ...v, distanceKm: distanceKm(wedding, v) }))
    .filter(v => v.distanceKm <= 3.0 && (v.activities.includes('climbing') || v.activities.includes('bouldering')))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  assert.equal(climbingNearWedding.length, 2, 'Wedding climbing matches exactly 2 venues in the 3km radius');
  assert.deepEqual(
    climbingNearWedding.map(v => v.name),
    ['urban apes Wedding', 'das Elektra']
  );
  assert.equal(climbingNearWedding[0].distanceKm, 1);
  assert.equal(climbingNearWedding[1].distanceKm, 1.6);
});

test('standalone demo HTML contains accessible mobile close button and intentional two-result layout rules', () => {
  const html = readFileSync(path.join(ROOT, 'standalone/ai-guided-signup-demo.html'), 'utf8');
  
  // (1) Accessible close button on venue details sheet
  assert.ok(html.includes('venue-profile-header__close'), 'Mobile venue sheet has close button class');
  assert.ok(html.includes('data-close-sheet'), 'Close button has data-close-sheet attribute');
  assert.ok(html.includes('aria-label="Close venue details"'), 'Close button has accessible aria label');

  // (2) Wellbeing apps grid styling
  assert.ok(html.includes('grid-template-columns: repeat(auto-fill, minmax(185px, 1fr))'), 'Desktop apps use responsive grid');
  assert.ok(html.includes('border-radius: 12px'), 'App cards use 12px corners instead of pills');

  // (3) Intentional two-result layout
  assert.ok(html.includes('.venue-carousel-track--few'), 'Two-result carousel class exists');
  assert.ok(html.includes('.hits--two'), 'Two-result hits grid class exists');

  // (4) Searchable neighbourhood/postcode field & suggestions
  // (5) Plan box header idrow layout
  assert.ok(html.includes('class="planbox__idrow"'), 'Plan box header uses idrow wrapper for horizontal name/price alignment');

  // (6) Venue end card indicator
  assert.ok(html.includes('venue-end-card'), 'Venue catalog includes end-of-results indicator card');
  assert.ok(html.includes('All places shown'), 'Venue end card shows completion text');

  // (7) Hero photo in venue details on mobile
  assert.ok(html.includes('.venue-hero-media'), 'Venue hero media is styled');

  // (8) High-converting save modal perk banner & single primary CTA
  assert.ok(html.includes('save-perk-banner'), 'Save screen contains perk banner');
  assert.ok(html.includes('10% off voucher included'), 'Save perk banner mentions 10% voucher');
  assert.ok(html.includes('Email me my return link'), 'Save screen has unambiguous single primary CTA');
  assert.ok(html.includes('save-trust-line'), 'Save screen contains streamlined inline trust line');

  // (9) Venue results bar and grid completion footer
  assert.ok(html.includes('venue-results-bar'), 'Venue catalog has structured results bar');
  assert.ok(html.includes('venue-results-bar__title'), 'Venue catalog has structured results title');
  assert.ok(html.includes('venue-grid-end-summary'), 'Venue grid has completion summary footer');

  // (10) Refined payment screen layout with 3-card start date selector & sidebar CTA
  assert.ok(html.includes('pay-card-head'), 'Payment method has structured card head with inline step badge');
  assert.ok(html.includes('pay-startdate-block'), 'Payment screen has 3-card start date selector');
  assert.ok(html.includes('pay-sidebar-actions'), 'Primary CTA is positioned under Order Summary in sidebar');
  assert.ok(html.includes('pay-btn-back'), 'Back to details button has dedicated styling');
  assert.ok(html.includes('pay-btn-confirm'), 'Confirm button expands to fill primary action slot');
  assert.ok(!html.includes('Review your membership details and start date before confirming.'), 'Redundant yellow review note is removed');
});


