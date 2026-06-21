/**
 * codePrompt.ts — a small HTML overlay for typing a code.
 *
 * Phaser has no native text input, so we drop a styled, RTL HTML dialog over the
 * canvas with a real <input>. Resolves with the typed string (or null if
 * cancelled). Kept framework-free so any scene can `await showCodePrompt()`.
 */

export function showCodePrompt(): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.dir = 'rtl';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
      fontFamily: 'Rubik, system-ui, sans-serif',
    } as CSSStyleDeclaration);

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#2a2d55',
      border: '3px solid #ffd23f66',
      borderRadius: '24px',
      padding: '28px 32px',
      width: 'min(440px, 86vw)',
      textAlign: 'center',
      color: '#fff',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    } as CSSStyleDeclaration);

    const title = document.createElement('div');
    title.textContent = '🔑 הכנס קוד';
    Object.assign(title.style, { fontSize: '28px', fontWeight: '900', marginBottom: '6px' } as CSSStyleDeclaration);

    const sub = document.createElement('div');
    sub.textContent = 'קוד עולם כדי להמשיך מאיפה שעצרת';
    Object.assign(sub.style, { fontSize: '15px', opacity: '0.8', marginBottom: '16px' } as CSSStyleDeclaration);

    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'הקלד כאן…';
    Object.assign(input.style, {
      width: '100%',
      boxSizing: 'border-box',
      fontSize: '24px',
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      padding: '12px',
      borderRadius: '14px',
      border: 'none',
      outline: 'none',
      marginBottom: '18px',
    } as CSSStyleDeclaration);

    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', gap: '12px', justifyContent: 'center' } as CSSStyleDeclaration);

    const mkBtn = (label: string, bg: string, fg: string) => {
      const b = document.createElement('button');
      b.textContent = label;
      Object.assign(b.style, {
        flex: '1',
        fontSize: '20px',
        fontWeight: '900',
        fontFamily: 'inherit',
        padding: '12px 0',
        borderRadius: '999px',
        border: 'none',
        cursor: 'pointer',
        background: bg,
        color: fg,
      } as CSSStyleDeclaration);
      return b;
    };
    const ok = mkBtn('אישור', '#4caf50', '#fff');
    const cancel = mkBtn('ביטול', '#14152b', '#fff');

    const close = (val: string | null) => {
      document.body.removeChild(overlay);
      resolve(val);
    };
    ok.onclick = () => close(input.value);
    cancel.onclick = () => close(null);
    input.onkeydown = (e) => {
      if (e.key === 'Enter') close(input.value);
      if (e.key === 'Escape') close(null);
    };

    row.append(ok, cancel);
    box.append(title, sub, input, row);
    overlay.append(box);
    document.body.append(overlay);
    setTimeout(() => input.focus(), 30);
  });
}
