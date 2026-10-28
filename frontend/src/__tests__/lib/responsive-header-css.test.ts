import { describe, expect, it } from 'vitest';
import appSource from '@/App.vue?raw';

// Regresi header publik: di HP enam elemen header pernah bertumpuk di
// tengah. Header kini dua tingkat di ≤640px, identitas terpotong rapi,
// dan tautan navigasi dilipat ke satu tombol Menu.
const mobileCss = appSource.slice(appSource.indexOf('@media (max-width: 640px)'));

describe('responsive public header', () => {
  it('has a mobile breakpoint that wraps the header into two tiers', () => {
    expect(appSource).toContain('@media (max-width: 640px)');
    expect(mobileCss).toMatch(/\.app-header \{[^}]*flex-wrap: wrap;/);
    expect(mobileCss).toMatch(/\.home-header \{[^}]*justify-content: space-between;/);
    expect(mobileCss).toMatch(/\.header-actions \{[^}]*display: contents;/);
  });

  it('keeps only the logo and the logout button on the top tier', () => {
    expect(mobileCss).toMatch(/\.app-header \.app-logo \{[^}]*order: 1;/);
    expect(mobileCss).toMatch(/\.header-logout \{[^}]*order: 2;/);
  });

  it('renders the identity as a truncated chip that cannot overlap the logo', () => {
    expect(mobileCss).toMatch(/\.header-identity \{[^}]*min-width: 0;/);
    expect(mobileCss).toMatch(/\.header-identity \{[^}]*white-space: nowrap;/);
    expect(mobileCss).toMatch(/\.header-identity \{[^}]*text-overflow: ellipsis;/);
    expect(mobileCss).toMatch(/\.header-identity \{[^}]*border-radius: 999px;/);
  });

  it('folds the navigation links into a single Menu button on mobile only', () => {
    // Desktop: tombol Menu tersembunyi dan nav melebur ke header-actions.
    expect(appSource).toMatch(/\.header-menu-button \{\s*display: none;/);
    expect(appSource).toMatch(/\.header-links \{\s*display: contents;/);
    // Mobile: tombol tampil, nav tersembunyi sampai dibuka.
    expect(mobileCss).toMatch(/\.header-menu-button \{[^}]*display: inline-flex;/);
    expect(mobileCss).toMatch(/\.header-links \{\s*display: none;/);
    expect(mobileCss).toMatch(/\.header-links\.is-open \{[^}]*display: flex;/);
  });

  it('wires the Menu button accessibly to the navigation panel', () => {
    expect(appSource).toContain('aria-controls="app-header-links"');
    expect(appSource).toContain(':aria-expanded="menuOpen"');
    expect(appSource).toContain('id="app-header-links"');
  });
});
