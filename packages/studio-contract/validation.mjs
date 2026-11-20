// Deliberately small, dependency-free JSON Schema subset. Unknown keywords fail closed.
const keywords = new Set(['$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'const', 'enum', 'pattern', 'minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems', 'uniqueItems', 'items', 'required', 'properties', 'additionalProperties', 'anyOf']);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const error = (path, code, message) => ({ path, code, message });

export function validateSchema(schema, value) {
  const errors = [], seen = new Set();
  function inspect(node, path) {
    if (!object(node)) { errors.push(error(path, 'invalid-schema', 'Schema must be an object')); return; }
    if (seen.has(node)) return;
    seen.add(node);
    for (const key of Object.keys(node)) if (!keywords.has(key)) errors.push(error(path, 'unsupported-schema-keyword', key));
    if (node.$ref && (typeof node.$ref !== 'string' || !/^#\/\$defs\/[A-Za-z0-9_-]+$/.test(node.$ref) || !schema.$defs?.[node.$ref.split('/').at(-1)])) errors.push(error(path, 'invalid-schema-reference', String(node.$ref)));
    if (node.pattern) try { new RegExp(node.pattern); } catch { errors.push(error(path, 'invalid-schema-pattern', node.pattern)); }
    for (const [key, child] of Object.entries(node.properties || {})) inspect(child, path + '.properties.' + key);
    for (const [key, child] of Object.entries(node.$defs || {})) inspect(child, path + '.$defs.' + key);
    if (node.items) inspect(node.items, path + '.items');
    for (const child of node.anyOf || []) inspect(child, path + '.anyOf');
  }
  function walk(node, input, path, out, depth = 0) {
    const fail = (code, message) => out.push(error(path, code, message));
    if (depth > 100) { fail('depth-limit', 'Maximum validation depth exceeded'); return; }
    if (node.$ref) return walk(schema.$defs[node.$ref.split('/').at(-1)], input, path, out, depth + 1);
    const type = input === null ? 'null' : Array.isArray(input) ? 'array' : Number.isInteger(input) ? 'integer' : typeof input;
    if (node.type && ![].concat(node.type).includes(type) && !(type === 'integer' && [].concat(node.type).includes('number'))) { fail('type', `Expected ${node.type}; received ${type}`); return; }
    if (node.anyOf && !node.anyOf.some(child => { const nested = []; walk(child, input, path, nested, depth + 1); return nested.length === 0; })) fail('anyOf', 'No allowed alternative matched');
    if ('const' in node && input !== node.const) fail('const', 'Unexpected constant');
    if (node.enum && !node.enum.includes(input)) fail('enum', 'Value not in enum');
    if (typeof input === 'number' && (!Number.isFinite(input) || (node.minimum !== undefined && input < node.minimum) || (node.maximum !== undefined && input > node.maximum))) fail('range', 'Number outside permitted range');
    if (typeof input === 'string') {
      if (node.pattern && !new RegExp(node.pattern).test(input)) fail('pattern', `Does not match ${node.pattern}`);
      if (node.minLength !== undefined && input.length < node.minLength) fail('minLength', 'String too short');
      if (node.maxLength !== undefined && input.length > node.maxLength) fail('maxLength', 'String too long');
    }
    if (Array.isArray(input)) {
      if (node.minItems !== undefined && input.length < node.minItems) fail('minItems', 'Array too short');
      if (node.maxItems !== undefined && input.length > node.maxItems) fail('maxItems', 'Array too long');
      if (node.uniqueItems && new Set(input.map(v => JSON.stringify(v))).size !== input.length) fail('uniqueItems', 'Duplicate values');
      if (node.items) input.forEach((v, i) => walk(node.items, v, `${path}[${i}]`, out, depth + 1));
    }
    if (object(input)) {
      for (const key of node.required || []) if (!Object.hasOwn(input, key)) fail('required', `Missing ${key}`);
      for (const [key, v] of Object.entries(input)) {
        if (Object.hasOwn(node.properties || {}, key)) walk(node.properties[key], v, path + '.' + key, out, depth + 1);
        else if (node.additionalProperties === false) fail('additionalProperties', `Unknown field ${key}`);
      }
    }
  }
  try { inspect(schema, '$schema'); if (!errors.length) walk(schema, value, '$', errors); }
  catch { errors.push(error('$', 'invalid-input', 'Input or schema could not be validated')); }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}
