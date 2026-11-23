#!/usr/bin/env node
/**
 * Read-only strict public exposure gate. Existing forbidden-asset checks remain
 * intact; additionally flags served tracked candidate GLBs whose commercial
 * rights are *not* verified. HEAD-only CT probes cannot prove byte identity.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditPublicAssets, REQUIRED_PUBLIC_PROBE_IDS } from './audit-live-anatomy-exposure.mjs';

export function evaluateStrictPublicExposure(report) {
  const results=Array.isArray(report?.results)?report.results:[];
  const missing=REQUIRED_PUBLIC_PROBE_IDS.filter(id=>results.filter(x=>x?.id===id).length!==1);
  // Positive allowlist: missing probes, unexpected HTTP statuses, redirects,
  // SPA fallbacks and unknown classifier values cannot silently become PASS.
  const unsafe=results.filter(x=>!x||!REQUIRED_PUBLIC_PROBE_IDS.includes(x.id)||
    x.severity==='critical'||x.result!=='not-served'||![403,404,410].includes(x.httpStatus));
  return {
    schema: 'medcoel.strict-public-rights-observation.v1',
    site: 'https://medcoel.com',
    releaseCleared: false, // never infer rights approval from website observations
    observedUnclearedOrUnverifiedAssets: unsafe.map(x =>
      ({ id: x?.id??null, route: x?.route??null, status: x?.httpStatus ?? null, issue: x?.result??'invalid-observation' })),
    missingOrDuplicateProbes:missing,
    strictExposureCheckPassed: missing.length===0&&unsafe.length===0,
    note: 'Read-only surface audit: does not inspect every deployed file or decide legal rights. Use a full release inventory and rights ledger for release clearance.'
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await auditPublicAssets();
  const strict = evaluateStrictPublicExposure(report);
  console.log(JSON.stringify(strict, null, 2));
  if (!strict.strictExposureCheckPassed) process.exitCode = 1;
}
