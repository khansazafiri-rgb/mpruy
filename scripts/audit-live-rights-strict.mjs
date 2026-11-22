#!/usr/bin/env node
/**
 * Read-only strict public exposure gate. Existing forbidden-asset checks remain
 * intact; additionally flags served tracked candidate GLBs whose commercial
 * rights are *not* verified. HEAD-only CT probes cannot prove byte identity.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditPublicAssets } from './audit-live-anatomy-exposure.mjs';

export function evaluateStrictPublicExposure(report) {
  const unsafe = report.results.filter(x =>
    x.severity === 'critical' ||
    x.result === 'matches-repository-candidate-not-commercially-cleared' ||
    x.result === 'unknown-live-release-bytes' ||
    x.result === 'served-ct-identity-unverified' ||
    x.result === 'cannot-verify-live-bytes' ||
    x.result === 'unreachable'
  );
  return {
    schema: 'medcoel.strict-public-rights-observation.v1',
    site: 'https://medcoel.com',
    releaseCleared: false, // never infer rights approval from website observations
    observedUnclearedOrUnverifiedAssets: unsafe.map(x =>
      ({ id: x.id, route: x.route, status: x.httpStatus ?? null, issue: x.result })),
    strictExposureCheckPassed: unsafe.length === 0,
    note: 'Read-only surface audit: does not inspect every deployed file or decide legal rights. Use a full release inventory and rights ledger for release clearance.'
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await auditPublicAssets();
  const strict = evaluateStrictPublicExposure(report);
  console.log(JSON.stringify(strict, null, 2));
  if (!strict.strictExposureCheckPassed) process.exitCode = 1;
}
