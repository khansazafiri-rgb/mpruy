// Localize authored React presentation at build time. Form values, URLs, keys,
// styles, event handlers, and source clinical HTML are never rewritten.
export default function bilingual({ types: t }) {
  const attrs = new Set(['title', 'label', 'hint', 'placeholder', 'aria-label', 'alt', 'description', 'eyebrow', 'note']);
  const skipFiles = /[/\\](i18n|RichContent|LanguageSwitch)([/\\]|\.)/;
  const untouched = /(?:^|\.)(?:email|loginId|whatsapp|body|code|filename|fileName)$/;
  function suppressed(path) {
    return !!path.findParent((p) => p.isJSXElement() && p.node.openingElement.attributes.some((a) => t.isJSXAttribute(a) && a.name.name === 'translate' && (a.value?.value === 'no' || a.value?.expression?.value === false)));
  }
  const call = (e) => t.callExpression(t.identifier('__uiText'), [e]);
  return { visitor: {
    Program: {
      enter(path, state) { state.enabled = !skipFiles.test(state.filename || ''); state.used = false; },
      exit(path, state) {
        if (!state.used) return;
        path.unshiftContainer('body', t.importDeclaration([
          t.importSpecifier(t.identifier('__uiText'), t.identifier('translate')),
          t.importSpecifier(t.identifier('__useLanguage'), t.identifier('useLanguage')),
        ], t.stringLiteral('@/i18n')));
        // Subscribe components, never callbacks, so state and timers survive.
        path.traverse({ Function(p) {
          const name = p.node.id?.name || (p.parentPath.isVariableDeclarator() ? p.parentPath.node.id?.name : '');
          if (!/^[A-Z]/.test(name || '') || p.getFunctionParent()) return;
          if (!p.get('body').isBlockStatement()) {
            const body = p.node.body; p.node.body = t.blockStatement([t.returnStatement(body)]);
          }
          p.node.body.body.unshift(t.expressionStatement(t.callExpression(t.identifier('__useLanguage'), [])));
        } });
      },
    },
    JSXText(path, state) {
      if (!state.enabled || suppressed(path)) return;
      const lines = path.node.value.split(/\r\n|\n|\r/);
      const value = lines.map((line, i) => {
        let s = line.replace(/\t/g, ' ');
        if (i !== 0) s = s.replace(/^ +/, '');
        if (i !== lines.length - 1) s = s.replace(/ +$/, '');
        return s;
      }).filter(Boolean).join(' ');
      if (!value.trim()) return;
      state.used = true; path.replaceWith(t.jsxExpressionContainer(call(t.stringLiteral(value)))); path.skip();
    },
    JSXExpressionContainer(path, state) {
      if (!state.enabled || suppressed(path) || t.isJSXEmptyExpression(path.node.expression)) return;
      if (path.parentPath.isJSXAttribute() && !attrs.has(path.parentPath.node.name.name)) return;
      const e = path.node.expression;
      if (t.isCallExpression(e) && ['__uiText', 'translate'].includes(e.callee?.name)) return;
      if (t.isJSXElement(e) || t.isJSXFragment(e) || t.isArrowFunctionExpression(e)) return;
      if (t.isMemberExpression(e) && !e.computed && untouched.test('.' + e.property.name)) return;
      if ((t.isMemberExpression(e) || t.isOptionalMemberExpression(e)) && e.property.name === 'name' && /^(me|user|usr|author|recipient)$/.test(e.object.name || '')) return;
      state.used = true; path.node.expression = call(e);
    },
    JSXAttribute(path, state) {
      if (!state.enabled || suppressed(path) || !attrs.has(path.node.name.name) || !t.isStringLiteral(path.node.value)) return;
      state.used = true; path.node.value = t.jsxExpressionContainer(call(t.stringLiteral(path.node.value.value))); path.skip();
    },
  } };
}
