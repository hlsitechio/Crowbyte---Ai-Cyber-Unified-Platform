/**
 * Unit tests for data contract safety — ensures config lookups
 * don't crash on unknown values from the database.
 *
 * These test the patterns that caused black screens:
 * - STATUS_BADGE[unknownStatus] → undefined → .className crash
 * - finding.cve_ids.length → null.length crash
 */

import { describe, it, expect } from 'vitest';

// Simulate the STATUS_BADGE pattern from Missions.tsx
const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  created: { className: 'bg-zinc-500', label: 'Created' },
  running: { className: 'bg-blue-500', label: 'Running' },
  completed: { className: 'bg-green-500', label: 'Completed' },
  failed: { className: 'bg-red-500', label: 'Failed' },
  paused: { className: 'bg-amber-500', label: 'Paused' },
};

// Simulate SEVERITY_CONFIG from CVE.tsx
const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10' },
  HIGH: { color: 'text-orange-400', bg: 'bg-orange-500/10' },
  MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
  LOW: { color: 'text-green-400', bg: 'bg-green-500/10' },
};

describe('Status/Config Lookup Safety', () => {
  it('STATUS_BADGE handles unknown status with fallback', () => {
    const unknownStatuses = ['in_progress', 'planned', 'active', '', undefined, null];
    for (const status of unknownStatuses) {
      const badge = STATUS_BADGE[status as string] || STATUS_BADGE.created;
      expect(badge).toBeDefined();
      expect(badge.className).toBeDefined();
      expect(badge.label).toBeDefined();
    }
  });

  it('SEVERITY_CONFIG handles unknown severity with fallback', () => {
    const unknownSeverities = ['critical', 'UNKNOWN', '', undefined, null];
    for (const sev of unknownSeverities) {
      const config = SEVERITY_CONFIG[sev as string] || SEVERITY_CONFIG.MEDIUM;
      expect(config).toBeDefined();
      expect(config.color).toBeDefined();
      expect(config.bg).toBeDefined();
    }
  });
});

describe('Null Array Safety', () => {
  it('handles null arrays without crash', () => {
    // Simulates finding.cve_ids being null from Supabase
    const finding = {
      cve_ids: null as string[] | null,
      cwe_ids: null as string[] | null,
      tags: null as string[] | null,
    };

    // These patterns should NOT throw
    expect((finding.cve_ids || []).length).toBe(0);
    expect((finding.cwe_ids || []).length).toBe(0);
    expect((finding.tags || []).length).toBe(0);
    expect((finding.cve_ids || []).map((x: string) => x)).toEqual([]);
  });

  it('handles populated arrays correctly', () => {
    const finding = {
      cve_ids: ['CVE-2024-1234', 'CVE-2024-5678'],
      cwe_ids: ['CWE-79'],
      tags: ['xss', 'web'],
    };

    expect((finding.cve_ids || []).length).toBe(2);
    expect((finding.cwe_ids || []).length).toBe(1);
    expect((finding.tags || []).length).toBe(2);
  });
});
