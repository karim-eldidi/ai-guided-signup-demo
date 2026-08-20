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
  assert.ok(html.includes('data-area-search-input'), 'Area search input exists');
  assert.ok(html.includes('id="area-suggestions"'), 'Area suggestions container exists');
  assert.ok(html.includes('data-where-search-input'), 'Wherepick search input exists');
});
