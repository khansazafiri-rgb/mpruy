// GENERATED FILE. Do not edit. Run node scripts/generate-studio-server-contract.mjs.
'use strict';
// MEDCOEL independent typed-anatomy grading contract.
// Clinical terminology MUST be reviewer-approved before use; no bundled answer key.
// Portable on purpose: the PocketBase JSVM (goja) has no Unicode property escapes, so letters are matched after
// NFKD + combining-mark removal as ASCII. Indonesian, English and Latin anatomical terms are Latin-script.
const fold = text => (typeof text.normalize === 'function' ? text.normalize('NFKD') : text);
const normalizeTerm = value => fold(String(value ?? ''))
  .replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ß/g,'ss')
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const LEFT = new Set(['left','kiri','sinister','sinistra','sinistrum','sin']);
const RIGHT = new Set(['right','kanan','dexter','dextra','dextrum','dex']);
const CONFLICTS = [['ulna','ulnar'],['ileum','ilium'],['radius','radial'],['ureter','urethra']];
const sideOf = text => {
  const t = new Set(normalizeTerm(text).split(' '));
  const left = [...LEFT].some(v=>t.has(v)), right=[...RIGHT].some(v=>t.has(v));
  return left && right ? 'mixed' : left ? 'left' : right ? 'right' : null;
};
function distance(a,b,max) {
  // Bounded Damerau-Levenshtein for one- and two-character transpositions.
  if (Math.abs(a.length-b.length)>max) return max+1;
  const dp = Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++) dp[i][0]=i;
  for(let j=0;j<=b.length;j++) dp[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
    dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])dp[i][j]=Math.min(dp[i][j],dp[i-2][j-2]+1);
  }
  return dp[a.length][b.length];
}
function confusable(input,form) {
  const a=new Set(input.split(' ')),b=new Set(form.split(' '));
  return CONFLICTS.some(([x,y])=>(a.has(x)&&b.has(y))||(a.has(y)&&b.has(x)));
}
function checkTypedAnswer(input, target, terminology) {
  const wrong=(reason='incorrect')=>({verdict:'wrong',matched:null,canonical:target?.conceptId||null,language:null,reason});
  if (!target || typeof target.conceptId!=='string' || !terminology || terminology.status!=='approved' ||
      !Array.isArray(terminology.forms) || terminology.conceptId!==target.conceptId)
    return wrong('unreviewed-terminology');
  const value=normalizeTerm(input);
  if(!value || value.length>160)return wrong('invalid-input');
  const expectedSide=target.side||null, observedSide=sideOf(value);
  if(observedSide==='mixed' || (expectedSide && observedSide!==expectedSide))return wrong('laterality');
  const forms=terminology.forms.filter(f=>['id','en','la'].includes(f.language) &&
    typeof f.value==='string' && (!expectedSide || f.side===expectedSide));
  for(const form of forms){
    const f=normalizeTerm(form.value);
    if(value===f)return {verdict:'correct',matched:form.value,canonical:target.conceptId,language:form.language};
  }
  if(value.length<6 || /\d/.test(value))return wrong();
  let best=null,bestDist=Infinity;
  for(const form of forms){
    const f=normalizeTerm(form.value), max = Math.min(value.length,f.length)>=12?2:1;
    if (f.length<6 || /\d/.test(f) || confusable(value,f))continue;
    if (expectedSide && sideOf(f)!==expectedSide)continue;
    const d=distance(value,f,max);
    if(d>0&&d<=max&&d<bestDist){best=form;bestDist=d;}
  }
  if(best)return {verdict:'accepted-typo',matched:best.value,canonical:target.conceptId,language:best.language};
  return wrong();
}

module.exports = { normalizeTerm, checkTypedAnswer };
