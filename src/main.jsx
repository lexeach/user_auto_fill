import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import JSZip from 'jszip';
import './style.css';

const initialFields = [
  { key: 'CLIENT_NAME', label: 'Client name', type: 'text', required: true, defaultValue: '' },
  { key: 'CLIENT_EMAIL', label: 'Client email', type: 'email', required: false, defaultValue: '' },
  { key: 'CLIENT_MOBILE', label: 'Client mobile', type: 'tel', required: false, defaultValue: '' },
  { key: 'PROJECT_NAME', label: 'Project name', type: 'text', required: true, defaultValue: 'My Generated Project' },
];
const TEXT_EXT = /\.(txt|md|html?|css|scss|sass|less|js|jsx|ts|tsx|json|xml|ya?ml|toml|env|ini|conf|properties|sql|sh|bat|ps1|py|java|kt|dart|php|rb|go|rs|vue|svelte|svg)$/i;
const TOKEN_RE = /\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}/g;
const safeKey = s => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

function App() {
  const [zipFile, setZipFile] = useState(null);
  const [zip, setZip] = useState(null);
  const [files, setFiles] = useState([]);
  const [fields, setFields] = useState(initialFields);
  const [values, setValues] = useState({ CLIENT_NAME: '', CLIENT_EMAIL: '', CLIENT_MOBILE: '', PROJECT_NAME: 'My Generated Project' });
  const [projectSlug, setProjectSlug] = useState('generated-project');
  const [status, setStatus] = useState({ type: 'info', text: 'Upload a master ZIP to get started.' });
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState(null);
  const fileInput = useRef(null);

  const discoveredTokens = useMemo(() => {
    const set = new Set();
    for (const f of files) for (const t of (f.tokens || [])) set.add(t);
    return [...set].sort();
  }, [files]);
  const configuredKeys = new Set(fields.map(f => f.key));
  const missingTokens = discoveredTokens.filter(t => !configuredKeys.has(t));

  async function loadZip(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) { setStatus({ type: 'error', text: 'Please select a .zip file.' }); return; }
    if (file.size > 100 * 1024 * 1024) { setStatus({ type: 'error', text: 'ZIP is larger than the 100 MB safety limit.' }); return; }
    setBusy(true); setStatus({ type: 'info', text: 'Reading ZIP and scanning text files…' });
    try {
      const loaded = await JSZip.loadAsync(file, { checkCRC32: false });
      const list = [];
      for (const [path, entry] of Object.entries(loaded.files)) {
        if (entry.dir) continue;
        if (path.startsWith('/') || path.split('/').some(p => p === '..')) throw new Error(`Unsafe path detected: ${path}`);
        const textFile = TEXT_EXT.test(path) && !path.split('/').some(p => p === 'node_modules' || p === '.git' || p === 'dist' || p === 'build');
        let tokens = [];
        if (textFile) {
          const content = await entry.async('string');
          tokens = [...new Set([...content.matchAll(TOKEN_RE)].map(m => m[1]))];
        }
        list.push({ path, textFile, tokens });
      }
      setZip(loaded); setZipFile(file); setFiles(list); setValidation(null);
      const tokens = [...new Set(list.flatMap(f => f.tokens))].sort();
      if (tokens.length) {
        const known = new Set(fields.map(f => f.key));
        const additions = tokens.filter(t => !known.has(t)).map(key => ({ key, label: key.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()), type: 'text', required: false, defaultValue: '' }));
        if (additions.length) setFields(prev => [...prev, ...additions]);
        setValues(prev => Object.fromEntries([...Object.entries(prev), ...tokens.map(t => [t, prev[t] ?? ''])]));
      }
      setStatus({ type: 'success', text: `Loaded ${file.name}: ${list.length} files found. ${tokens.length} unique template token(s) detected.` });
    } catch (e) { setStatus({ type: 'error', text: `Could not read ZIP: ${e.message}` }); setZip(null); setFiles([]); }
    finally { setBusy(false); }
  }

  function addField() {
    const key = `FIELD_${fields.length + 1}`;
    setFields(prev => [...prev, { key, label: `Field ${prev.length + 1}`, type: 'text', required: false, defaultValue: '' }]);
    setValues(prev => ({ ...prev, [key]: '' }));
  }
  function updateField(index, patch) {
    setFields(prev => prev.map((f, i) => {
      if (i !== index) return f;
      const next = { ...f, ...patch };
      if (patch.label !== undefined && patch.key === undefined) next.key = safeKey(patch.label) || f.key;
      return next;
    }));
  }
  function removeField(index) {
    const field = fields[index]; setFields(prev => prev.filter((_, i) => i !== index));
    setValues(prev => { const n = { ...prev }; delete n[field.key]; return n; });
  }
  function setFieldValue(key, value) { setValues(prev => ({ ...prev, [key]: value })); }

  async function generate() {
    if (!zip) { setStatus({ type: 'error', text: 'Upload a master ZIP first.' }); return; }
    const errors = [];
    const keys = new Set();
    fields.forEach((f, i) => {
      if (!f.key || !/^[A-Z][A-Z0-9_]*$/.test(f.key)) errors.push(`Field ${i + 1}: use a unique uppercase key, e.g. CLIENT_NAME.`);
      if (keys.has(f.key)) errors.push(`Duplicate field key: ${f.key}`); keys.add(f.key);
      if (f.required && !String(values[f.key] ?? f.defaultValue ?? '').trim()) errors.push(`${f.label || f.key} is required.`);
      if (f.type === 'email' && String(values[f.key] || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values[f.key]).trim())) errors.push(`${f.label || f.key} must be a valid email.`);
    });
    if (missingTokens.length) errors.push(`Unconfigured template tokens: ${missingTokens.map(t => `{{${t}}}`).join(', ')}`);
    if (errors.length) { setValidation({ ok: false, errors, warnings: [] }); setStatus({ type: 'error', text: `Validation failed with ${errors.length} issue(s).` }); return; }
    setBusy(true); setStatus({ type: 'info', text: 'Generating and validating project…' });
    try {
      const output = new JSZip();
      const warnings = [];
      const replacementValues = Object.fromEntries(fields.map(f => [f.key, String(values[f.key] ?? f.defaultValue ?? '')]));
      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) { output.folder(path); continue; }
        if (path.startsWith('/') || path.split('/').some(p => p === '..')) throw new Error(`Unsafe path detected: ${path}`);
        if (TEXT_EXT.test(path) && !path.split('/').some(p => ['node_modules', '.git', 'dist', 'build'].includes(p))) {
          let content = await entry.async('string');
          content = content.replace(TOKEN_RE, (whole, key) => Object.prototype.hasOwnProperty.call(replacementValues, key) ? replacementValues[key] : whole);
          if (path.toLowerCase().endsWith('.json')) {
            try { JSON.parse(content); } catch (e) { throw new Error(`Invalid JSON after replacement in ${path}: ${e.message}`); }
          }
          output.file(path, content);
        } else {
          output.file(path, await entry.async('uint8array'));
        }
      }
      const report = {
        generatedAt: new Date().toISOString(), sourceZip: zipFile.name,
        projectName: values.PROJECT_NAME || projectSlug, templateFiles: files.length,
        replacementCount: discoveredTokens.length, fields: fields.map(f => ({ key: f.key, label: f.label, required: !!f.required })),
        note: 'Values are substituted only in explicit {{UPPERCASE_TOKEN}} placeholders in recognized text files. Binary files are copied unchanged.'
      };
      output.file('GENERATOR-REPORT.json', JSON.stringify(report, null, 2));
      const blob = await output.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const safeSlug = (projectSlug || 'generated-project').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'generated-project';
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeSlug}.zip`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
      const result = { ok: true, errors: [], warnings: [...warnings, 'This generator validates ZIP paths and JSON syntax, but does not run language-specific builds or tests. Run the generated project’s documented build/test commands before deployment.'] };
      setValidation(result); setStatus({ type: 'success', text: `Generated ${safeSlug}.zip successfully.` });
    } catch (e) { setValidation({ ok: false, errors: [e.message], warnings: [] }); setStatus({ type: 'error', text: `Generation failed: ${e.message}` }); }
    finally { setBusy(false); }
  }

  return <div className="app-shell">
    <header className="topbar"><div className="brandmark">PG</div><div><div className="eyebrow">TEMPLATE AUTOMATION WORKSPACE</div><h1>Complete Project Generator</h1></div><span className="local-pill"><span className="dot"/> Runs locally in your browser</span></header>
    <main>
      <section className="hero"><div><div className="eyebrow">MASTER ZIP → CUSTOMIZED PROJECT</div><h2>One template. Every client.<br/><em>Export a complete project.</em></h2><p>Upload your source ZIP, define the fields you need, replace explicit template tokens safely, validate the output, and export it as a ZIP.</p></div><div className="hero-art"><div className="folder-icon">▱</div><div className="hero-file">ZIP <span>↓</span></div><div className="hero-line"/><div className="hero-mini">{`{{DATA}}`}<br/>✓ Validated</div></div></section>
      <div className="layout">
        <section className="panel main-panel">
          <div className="section-head"><div><span className="step">01</span><h3>Master project</h3></div><span className="subtle">ZIP up to 100 MB</span></div>
          <div className={`dropzone ${zipFile ? 'has-file' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); loadZip(e.dataTransfer.files?.[0]); }}>
            <div className="upload-symbol">↑</div><strong>{zipFile ? zipFile.name : 'Upload your master ZIP'}</strong><p>{zipFile ? `${(zipFile.size / 1024).toFixed(1)} KB · ${files.length} files scanned` : 'Drag and drop your ZIP here, or browse files.'}</p>
            <button className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={busy}>{zipFile ? 'Choose another ZIP' : 'Browse ZIP files'}</button><input ref={fileInput} type="file" accept=".zip,application/zip" hidden onChange={e => loadZip(e.target.files?.[0])}/>
          </div>
          {zipFile && <div className="file-summary"><div><strong>{files.length}</strong><span>Files</span></div><div><strong>{discoveredTokens.length}</strong><span>Template tokens</span></div><div><strong>{files.filter(f => f.textFile).length}</strong><span>Text files scanned</span></div></div>}
          <div className="section-head schema-head"><div><span className="step">02</span><h3>Form schema & data</h3></div><button className="btn btn-small btn-secondary" onClick={addField}>＋ Add field</button></div>
          <p className="helper">Each field key maps to a token in your code. Example: key <code>CLIENT_NAME</code> replaces <code>{'{{CLIENT_NAME}}'}</code>. Only explicit tokens are replaced.</p>
          <div className="schema-list">{fields.map((f, i) => <div className="schema-card" key={`${i}-${f.key}`}>
            <div className="schema-card-top"><span className="field-number">FIELD {String(i + 1).padStart(2, '0')}</span><label className="required-check"><input type="checkbox" checked={f.required} onChange={e => updateField(i, { required: e.target.checked })}/> Required</label><button className="icon-button danger" title="Remove field" onClick={() => removeField(i)}>×</button></div>
            <div className="schema-grid"><label>Field label<input value={f.label} onChange={e => updateField(i, { label: e.target.value })} placeholder="Client name"/></label><label>Token key<input value={f.key} onChange={e => updateField(i, { key: safeKey(e.target.value) })} placeholder="CLIENT_NAME"/><small>Use uppercase letters, numbers, underscores</small></label></div>
            <div className="schema-grid value-grid"><label>Input type<select value={f.type} onChange={e => updateField(i, { type: e.target.value })}><option value="text">Text</option><option value="email">Email</option><option value="tel">Phone</option><option value="number">Number</option><option value="date">Date</option><option value="textarea">Long text</option><option value="url">URL</option></select></label><label>Value to insert<input type={['email','tel','number','date','url'].includes(f.type) ? f.type : 'text'} value={values[f.key] ?? f.defaultValue ?? ''} onChange={e => setFieldValue(f.key, e.target.value)} placeholder={f.defaultValue || `Enter ${f.label.toLowerCase()}`}/></label></div>
          </div>)}</div>
          {zipFile && <div className="token-box"><div className="token-title">Detected template tokens <span>{discoveredTokens.length}</span></div>{discoveredTokens.length ? <div className="token-chips">{discoveredTokens.map(t => <span className={`token-chip ${configuredKeys.has(t) ? 'matched' : 'unmatched'}`} key={t}>{`{{${t}}}`} {configuredKeys.has(t) ? '✓' : '!'}</span>)}</div> : <p className="helper">No tokens detected yet. Add tokens such as <code>{'{{CLIENT_NAME}}'}</code> to your master source files before generating.</p>}</div>}
        </section>
        <aside className="side-column">
          <section className="panel config-panel"><div className="section-head"><div><span className="step">03</span><h3>Export settings</h3></div></div><label className="standalone-label">Export file name<input value={projectSlug} onChange={e => setProjectSlug(e.target.value)} placeholder="generated-project"/><small>.zip will be added automatically</small></label><div className="security-note"><span className="lock">⌑</span><div><strong>Safe replacement mode</strong><p>Replaces only explicit tokens in recognized text files. Images, fonts and other binary assets are copied unchanged.</p></div></div><button className="btn btn-primary generate-btn" onClick={generate} disabled={busy || !zip}>{busy ? <><span className="spinner"/> Working…</> : 'Generate & export ZIP'} <span>↗</span></button><p className="privacy-note">Your uploaded ZIP is processed in this browser and is not sent to a server by this app.</p></section>
          <section className="panel validation-panel"><div className="section-head"><div><span className="step">04</span><h3>Validation</h3></div></div><div className={`status-banner ${status.type}`}><span className="status-dot"/><span>{status.text}</span></div>{validation && <div className="validation-details">{validation.errors?.length > 0 && <><strong className="error-text">Issues to fix</strong><ul>{validation.errors.map((e,i) => <li key={i}>{e}</li>)}</ul></>}{validation.warnings?.length > 0 && <><strong className="warning-text">Build note</strong><ul>{validation.warnings.map((w,i) => <li key={i}>{w}</li>)}</ul></>}{validation.ok && <div className="success-line">✓ ZIP generated and JSON files parsed successfully.</div>}</div>}<div className="checks"><div><span>✓</span> ZIP paths checked</div><div><span>✓</span> Required fields checked</div><div><span>✓</span> JSON syntax checked</div><div><span>✓</span> Unknown tokens blocked</div><div><span>!</span> Full app build requires project tools</div></div></section>
          <section className="tip-card"><strong>How to prepare a template</strong><p>In the master code, replace client-specific values with tokens. For JavaScript strings, use quoted tokens like <code>"{'{{CLIENT_NAME}}'}"</code>. For JSON string values, use <code>"{'{{PROJECT_NAME}}'}"</code>.</p><button className="text-button" onClick={() => { const guide = `TEMPLATE PREPARATION\n\n1. Make a backup of your master ZIP.\n2. Replace only values that should vary per client with explicit tokens, e.g. {{CLIENT_NAME}}, {{CLIENT_EMAIL}}, {{PROJECT_NAME}}.\n3. Keep tokens inside the correct string context. Example JS: const clientName = "{{CLIENT_NAME}}";\n4. JSON example: { "name": "{{PROJECT_NAME}}" }\n5. Upload the ZIP, fill each field, and generate.\n6. Run the generated project's own build/tests before deployment.\n\nSecurity: do not put passwords, private keys, API secrets, or sensitive credentials in templates or generated form values.`; const b = new Blob([guide], {type:'text/plain'}); const u = URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='TEMPLATE-PREPARATION.txt'; a.click(); URL.revokeObjectURL(u); }}>Download template guide ↗</button></section>
        </aside>
      </div>
      <footer><span>COMPLETE PROJECT GENERATOR</span><span>Local-first · Explicit tokens · ZIP export</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
