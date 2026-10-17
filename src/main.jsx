import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import JSZip from 'jszip';
import './style.css';
import { BANK_LIST, CATEGORY_LIST, STATE_DISTRICT_DATA } from './dropdownData.js';

const TEXT_EXT = /\.(txt|md|html?|css|scss|sass|less|js|jsx|ts|tsx|json|xml|ya?ml|toml|env|ini|conf|properties|sql|sh|bat|ps1|py|java|kt|dart|php|rb|go|rs|vue|svelte|svg)$/i;
const TOKEN_RE = /\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}/g;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);
const safeKey = s => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
const labelFor = s => String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
const typeFor = (key, value) => /email/i.test(key) ? 'email' : /mobile|phone|tel/i.test(key) ? 'tel' : /dob|birth|date/i.test(key) && /^\d{4}-\d\d-\d\d$/.test(value) ? 'date' : 'text';
const normalizeField = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
// These personal fields are hidden in the generator UI and removed from the exported Master ZIP.
const REMOVED_FIELDS = new Set([
  'firstname', 'middlename', 'lastname', 'gender', 'dateofbirth', 'dob',
  'panno', 'pancardno', 'aadhaarno', 'aadharno', 'email', 'mobileno',
  'mobile', 'phoneno'
]);
const isRemovedField = field => REMOVED_FIELDS.has(
  normalizeField(`${field.sourceKey || ''} ${field.label || ''}`).split(' ').join('')
) || REMOVED_FIELDS.has(normalizeField(field.sourceKey || '')) ||
  REMOVED_FIELDS.has(normalizeField(field.label || ''));

function optionsForField(field) {
  const k = normalizeField(`${field.sourceKey || ''} ${field.label || ''}`);
  if (k.includes('bankname') || k === 'bank') return { kind: 'select', options: BANK_LIST };
  if (k.includes('category') || k.includes('reservationcategory')) return { kind: 'select', options: CATEGORY_LIST };
  if (k === 'state' || k.endsWith('state')) return { kind: 'select', options: Object.keys(STATE_DISTRICT_DATA) };
  if (k === 'district' || k.endsWith('district')) return { kind: 'district' };
  if (k === 'region' || k.endsWith('region')) return { kind: 'select', options: ['Delhi', 'Outside Delhi'] };
  if (k.includes('maritalstatus') || k === 'marital') return { kind: 'select', options: ['Married', 'Single'] };
  return { kind: 'text' };
}
const isMaritalField = f => /maritalstatus|marital/i.test(normalizeField(`${f.sourceKey || ''} ${f.label || ''}`));
const isSpouseField = f => /spousename/i.test(normalizeField(`${f.sourceKey || ''} ${f.label || ''}`));
const isStateField = f => /(^|\s)state($|\s)/i.test(`${f.sourceKey || ''} ${f.label || ''}`) || normalizeField(f.label) === 'state';
const isDistrictField = f => normalizeField(f.label) === 'district' || normalizeField(f.sourceKey) === 'district';


// Finds a plain object assigned to `const formData = { ... }` and returns only primitive properties.
function parseFormDataObject(source) {
  const marker = /\b(?:const|let|var)\s+formData\s*=\s*\{/g;
  const match = marker.exec(source);
  if (!match) return null;
  const open = source.indexOf('{', match.index);
  let depth = 0, quote = '', escaped = false, close = -1;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (quote) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}' && --depth === 0) { close = i; break; }
  }
  if (close < 0) return null;
  const body = source.slice(open + 1, close);
  const props = [];
  const lineRe = /^[ \t]*([A-Za-z_$][\w$]*)[ \t]*:[ \t]*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|true|false|null|undefined|-?\d+(?:\.\d+)?)[ \t]*,?[ \t]*(?:\/\/.*)?$/gm;
  let p;
  while ((p = lineRe.exec(body))) {
    let value;
    try {
      if (p[2].startsWith('"')) value = JSON.parse(p[2]);
      else if (p[2].startsWith("'")) value = p[2].slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      else if (p[2] === 'true') value = true;
      else if (p[2] === 'false') value = false;
      else if (p[2] === 'null') value = null;
      else if (p[2] === 'undefined') value = '';
      else value = Number(p[2]);
    } catch { continue; }
    const start = open + 1 + p.index + p[0].indexOf(p[2]);
    props.push({ sourceKey: p[1], literal: p[2], value: value == null ? '' : String(value), start, end: start + p[2].length });
  }
  return props.length ? { open, close, props } : null;
}

function App() {
  const [zipFile, setZipFile] = useState(null);
  const [zip, setZip] = useState(null);
  const [files, setFiles] = useState([]);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [bindings, setBindings] = useState([]);
  const [dataFilePath, setDataFilePath] = useState('');
  const [projectSlug, setProjectSlug] = useState('customized-project');
  const [status, setStatus] = useState({ type: 'info', text: 'Upload your original Master ZIP. The generator will inspect its formData object.' });
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState(null);
  const fileInput = useRef(null);

  const discoveredTokens = useMemo(() => [...new Set(files.flatMap(f => f.tokens || []))].sort(), [files]);
  const configuredKeys = new Set(fields.map(f => f.key));
  const missingTokens = discoveredTokens.filter(t => !configuredKeys.has(t));

  async function loadZip(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) { setStatus({ type: 'error', text: 'Please select a .zip file.' }); return; }
    if (file.size > 100 * 1024 * 1024) { setStatus({ type: 'error', text: 'ZIP is larger than the 100 MB safety limit.' }); return; }
    setBusy(true); setStatus({ type: 'info', text: 'Inspecting Master ZIP and searching for formData…' });
    try {
      const loaded = await JSZip.loadAsync(file, { checkCRC32: false });
      const list = []; let found = null; let foundPath = '';
      for (const [path, entry] of Object.entries(loaded.files)) {
        if (entry.dir) continue;
        if (path.startsWith('/') || path.split('/').some(p => p === '..')) throw new Error(`Unsafe ZIP path detected: ${path}`);
        const textFile = TEXT_EXT.test(path) && !path.split('/').some(p => SKIP_DIRS.has(p));
        let tokens = [];
        if (textFile) {
          const content = await entry.async('string');
          tokens = [...new Set([...content.matchAll(TOKEN_RE)].map(m => m[1]))];
          if (!found && /\.jsx?$|\.tsx?$/.test(path)) {
            const parsed = parseFormDataObject(content);
            if (parsed) { found = parsed; foundPath = path; }
          }
        }
        list.push({ path, textFile, tokens });
      }
      let newFields = [], newValues = {}, newBindings = [];
      if (found) {
        // Name is a UI-only naming field: it is deliberately not added to bindings/formData.
        newFields = [{
          key: 'NAMING_ONLY_NAME',
          sourceKey: 'namingOnlyName',
          label: 'Name (ZIP and extension naming only)',
          type: 'text',
          required: false,
          defaultValue: '',
          namingOnly: true
        }];
        newValues.NAMING_ONLY_NAME = '';
        newFields.push(...found.props.filter(p => !isRemovedField({ sourceKey: p.sourceKey, label: labelFor(p.sourceKey) })).map((p, i) => {
          const key = `DATA_${safeKey(p.sourceKey) || `FIELD_${i+1}`}`;
          newValues[key] = p.value;
          newBindings.push({ fieldKey: key, sourceKey: p.sourceKey });
          return { key, sourceKey: p.sourceKey, label: labelFor(p.sourceKey), type: typeFor(p.sourceKey, p.value), required: false, defaultValue: p.value };
        }));
      }
      const hasMaritalStatus = newFields.some(isMaritalField);
      if (hasMaritalStatus && !newFields.some(isSpouseField)) {
        const spouseKey = 'DATA_SPOUSE_NAME';
        newFields.push({ key: spouseKey, sourceKey: 'spouseName', label: 'Spouse Name', type: 'text', required: false, defaultValue: '', conditionalSpouse: true, generatedProperty: true });
        newValues[spouseKey] = '';
        newBindings.push({ fieldKey: spouseKey, sourceKey: 'spouseName', generatedProperty: true });
      }
      const tokens = [...new Set(list.flatMap(f => f.tokens))].sort();
      for (const token of tokens) {
        if (!newFields.some(f => f.key === token)) {
          newFields.push({ key: token, label: labelFor(token), type: /email/i.test(token) ? 'email' : 'text', required: false, defaultValue: '' });
          newValues[token] = '';
        }
      }
      setZip(loaded); setZipFile(file); setFiles(list); setFields(newFields); setValues(newValues); setBindings(newBindings); setDataFilePath(foundPath); setValidation(null);
      setProjectSlug(file.name.replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase() + '-customized');
      if (found) setStatus({ type: 'success', text: `Loaded ${file.name}. Found ${found.props.length} editable formData fields in ${foundPath}. Original project files will be preserved.` });
      else setStatus({ type: 'error', text: `Loaded ${file.name}, but no simple formData object was detected. This template needs a custom field extractor.` });
    } catch (e) { setStatus({ type: 'error', text: `Could not read ZIP: ${e.message}` }); setZip(null); setFiles([]); setFields([]); }
    finally { setBusy(false); }
  }

  function updateField(index, patch) { setFields(prev => prev.map((f, i) => i === index ? { ...f, ...patch } : f)); }
  function setFieldValue(key, value) { setValues(prev => { const next = { ...prev, [key]: value }; const field = fields.find(f => f.key === key); if (field && isMaritalField(field) && String(value).trim().toLowerCase() !== 'married') { const spouse = fields.find(f => f.conditionalSpouse || /spouse.?name/i.test(`${f.key} ${f.label}`)); if (spouse) next[spouse.key] = ''; } return next; }); }

  async function generate() {
    if (!zip || !dataFilePath || !bindings.length) { setStatus({ type: 'error', text: 'Upload a supported Master ZIP containing a formData object first.' }); return; }
    const errors = [];
    fields.forEach(f => {
      const v = String(values[f.key] ?? '');
      if (f.required && !v.trim()) errors.push(`${f.label} is required.`);
      if (f.type === 'email' && v.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) errors.push(`${f.label} must be a valid email.`);
    });
    if (missingTokens.length) errors.push(`Unconfigured template tokens: ${missingTokens.map(t => `{{${t}}}`).join(', ')}`);
    if (errors.length) { setValidation({ ok: false, errors, warnings: [] }); setStatus({ type: 'error', text: `Validation failed with ${errors.length} issue(s).` }); return; }
    setBusy(true); setStatus({ type: 'info', text: 'Replacing only the detected formData values and rebuilding ZIP…' });
    try {
      const output = new JSZip(); let replacementCount = 0;
      const valueFor = (...patterns) => {
        const field = fields.find(f => patterns.some(pattern => pattern.test(`${f.key} ${f.label} ${f.sourceKey || ''}`)));
        return field ? String(values[field.key] ?? '').trim() : '';
      };
      const personName = valueFor(/naming.?only.?name/i) || [valueFor(/first.?name/i), valueFor(/middle.?name/i), valueFor(/last.?name|surname/i)].filter(Boolean).join(' ') || valueFor(/^name$/i, /full.?name/i);
      const fatherName = valueFor(/father.?name/i, /fathername/i);
      const displayName = [personName, fatherName].filter(Boolean).join(' / ') || personName || 'Selected Profile';
      const bindMap = new Map(bindings.map(b => [b.sourceKey, String(values[b.fieldKey] ?? '')]));
      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) { output.folder(path); continue; }
        if (path.startsWith('/') || path.split('/').some(p => p === '..')) throw new Error(`Unsafe ZIP path detected: ${path}`);
        if (path === dataFilePath) {
          let source = await entry.async('string');
          const parsed = parseFormDataObject(source);
          if (!parsed) throw new Error(`Could not re-parse formData object in ${path}.`);
          // Replace values from right to left so offsets stay valid. Only literal values inside formData are changed.
          const edits = parsed.props.filter(p => bindMap.has(p.sourceKey)).map(p => ({ start: p.start, end: p.end, value: JSON.stringify(bindMap.get(p.sourceKey)), remove: false }));
          // Remove the requested keys from the generated formData object itself, not just from the UI.
          for (const p of parsed.props.filter(p => isRemovedField({ sourceKey: p.sourceKey, label: labelFor(p.sourceKey) }))) {
            const lineStart = source.lastIndexOf('\\n', p.start - 1) + 1;
            const nextNewline = source.indexOf('\\n', p.end);
            const lineEnd = nextNewline < 0 ? source.length : nextNewline + 1;
            edits.push({ start: lineStart, end: lineEnd, value: '', remove: true });
          }
          edits.sort((a,b) => b.start-a.start);
          for (const edit of edits) {
            source = source.slice(0, edit.start) + edit.value + source.slice(edit.end);
            replacementCount++;
          }
          const existingKeys = new Set(parsed.props.map(p => p.sourceKey));
          const generatedSpouse = bindings.find(b => b.generatedProperty && b.sourceKey === 'spouseName');
          const maritalBinding = bindings.find(b => /maritalstatus|marital/i.test(normalizeField(b.sourceKey)));
          const maritalValue = maritalBinding ? String(values[maritalBinding.fieldKey] ?? '').trim().toLowerCase() : '';
          if (generatedSpouse && maritalValue === 'married' && !existingKeys.has('spouseName')) {
            const closeAt = parsed.close;
            const before = source.slice(0, closeAt).replace(/\s+$/, '');
            const comma = before.endsWith(',') ? '' : ',';
            source = before + comma + '\n  spouseName: ' + JSON.stringify(String(values[generatedSpouse.fieldKey] ?? '')) + '\n' + source.slice(closeAt);
            replacementCount++;
          }
          output.file(path, source);
          continue;
        }
        if (TEXT_EXT.test(path) && !path.split('/').some(p => SKIP_DIRS.has(p))) {
          let content = await entry.async('string');
          const basename = path.split('/').pop().toLowerCase();
          if (basename === 'manifest.json') {
            try {
              const manifest = JSON.parse(content);
              manifest.name = displayName;
              content = JSON.stringify(manifest, null, 2) + '\n';
              replacementCount++;
            } catch (e) { throw new Error(`Could not customize manifest name in ${path}: ${e.message}`); }
          }
          if (basename === 'popup.html') {
            const buttonLabel = `Fill ${displayName} Detail`;
            const buttonPattern = /(<button\b[^>]*\bid=["']fillBtn["'][^>]*>)[\s\S]*?(<\/button>)/i;
            if (buttonPattern.test(content)) {
              content = content.replace(buttonPattern, (_match, start, end) => `${start}${buttonLabel}${end}`);
              replacementCount++;
            }
          }
          content = content.replace(TOKEN_RE, (whole, key) => { if (!Object.prototype.hasOwnProperty.call(values, key)) return whole; replacementCount++; return String(values[key] ?? ''); });
          if (path.toLowerCase().endsWith('.json')) { try { JSON.parse(content); } catch (e) { throw new Error(`Invalid JSON after replacement in ${path}: ${e.message}`); } }
          output.file(path, content);
        } else output.file(path, await entry.async('uint8array'));
      }
      const safeSlug = ([personName, fatherName].filter(Boolean).join('-') || projectSlug || 'customized-project').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'customized-project';
      const blob = await output.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeSlug}.zip`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
      setValidation({ ok: true, errors: [], warnings: ['The original ZIP structure and non-target files are preserved. The generator does not execute or compile the exported project; test the extension on a safe, authorized test page.'] });
      setStatus({ type: 'success', text: `Exported ${safeSlug}.zip. Updated ${replacementCount} value(s) in the detected formData object and explicit tokens.` });
    } catch (e) { setValidation({ ok: false, errors: [e.message], warnings: [] }); setStatus({ type: 'error', text: `Generation failed: ${e.message}` }); }
    finally { setBusy(false); }
  }

  return <div className="app-shell">
    <header className="topbar"><div className="brandmark">PG</div><div><div className="eyebrow">MASTER-TEMPLATE CUSTOMIZER</div><h1>Complete Project Generator</h1></div><span className="local-pill"><span className="dot"/> Browser-only processing</span></header>
    <main>
      <section className="hero"><div><div className="eyebrow">YOUR MASTER ZIP → YOUR CUSTOMIZED ZIP</div><h2>Keep the original project.<br/><em>Change only the user data.</em></h2><p>Upload the original ZIP. The generator detects a simple JavaScript formData object, creates matching input fields, updates only those values, and exports a new ZIP with the same file structure.</p></div><div className="hero-art"><div className="folder-icon">▱</div><div className="hero-file">ZIP <span>↓</span></div><div className="hero-line"/><div className="hero-mini">formData<br/>✓ Preserved</div></div></section>
      <div className="layout"><section className="panel main-panel">
        <div className="section-head"><div><span className="step">01</span><h3>Upload your actual Master ZIP</h3></div><span className="subtle">ZIP up to 100 MB</span></div>
        <div className={`dropzone ${zipFile ? 'has-file' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); loadZip(e.dataTransfer.files?.[0]); }}><div className="upload-symbol">↑</div><strong>{zipFile ? zipFile.name : 'Upload Master ZIP'}</strong><p>{zipFile ? `${(zipFile.size/1024).toFixed(1)} KB · ${files.length} files inspected` : 'Choose the same original ZIP you sent us.'}</p><button className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={busy}>{zipFile ? 'Choose another ZIP' : 'Browse ZIP files'}</button><input ref={fileInput} type="file" accept=".zip,application/zip" hidden onChange={e => loadZip(e.target.files?.[0])}/></div>
        {zipFile && <div className="file-summary"><div><strong>{files.length}</strong><span>Original files</span></div><div><strong>{bindings.length}</strong><span>formData fields</span></div><div><strong>{discoveredTokens.length}</strong><span>Explicit tokens</span></div></div>}
        <div className="section-head schema-head"><div><span className="step">02</span><h3>Detected user data fields</h3></div></div>
        <p className="helper">Master ZIP ke fields yahan automatically aayenge. Sirf New Value bhariye; field names aur source code background mein locked rahenge.</p>
        {dataFilePath && <div className="status-banner success" style={{marginBottom:14}}><span className="status-dot"/><span>Detected in: <strong>{dataFilePath}</strong></span></div>}
        <div className="schema-list">{fields.map((f,i)=>{
          const fieldOptions = optionsForField(f);
          const maritalField = fields.find(isMaritalField);
          const maritalValue = maritalField ? String(values[maritalField.key] ?? '').trim().toLowerCase() : '';
          if ((f.conditionalSpouse || /spouse.?name/i.test(`${f.key} ${f.label}`)) && maritalValue !== 'married') return null;
          let options = fieldOptions.options || [];
          if (fieldOptions.kind === 'district') {
            const stateField = fields.find(isStateField);
            const stateValue = stateField ? values[stateField.key] : '';
            options = STATE_DISTRICT_DATA[stateValue] || [];
          }
          const useSelect = fieldOptions.kind === 'select' || fieldOptions.kind === 'district';
          return <div className="schema-card simple-field-card" key={`${f.key}-${i}`}><label className="simple-field-label">Field label<input className="locked-field" value={f.label} readOnly aria-readonly="true" tabIndex={-1}/></label><label className="simple-value-label">New value{useSelect ? <select value={values[f.key] ?? ''} onChange={e=>{setFieldValue(f.key,e.target.value); if (fieldOptions.kind === 'select' && normalizeField(f.label)==='state') { const district=fields.find(isDistrictField); if(district) setFieldValue(district.key,''); }}} disabled={fieldOptions.kind==='district' && options.length===0}><option value="">{fieldOptions.kind==='district' ? 'Select state first' : `Select ${f.label}`}</option>{options.map(option=><option key={option} value={option}>{option}</option>)}</select> : <input type={['email','tel','number','date','url'].includes(f.type)?f.type:'text'} value={values[f.key] ?? ''} onChange={e=>setFieldValue(f.key,e.target.value)} placeholder={`Enter ${f.label.toLowerCase()}`} autoComplete="off"/>}</label></div>;
        })}</div>
        {zipFile && !bindings.length && <div className="status-banner error">No editable formData properties detected. This template needs a custom parser.</div>}
      </section><aside className="side-column simple-export-column">
        <section className="panel config-panel simple-export-panel"><div className="section-head"><div><span className="step">03</span><h3>Download project</h3></div></div><p className="helper">Aapke bhare hue data ko Master ZIP mein update karke nayi ZIP banegi. Baaki files aur code preserve rahenge.</p><button className="btn btn-primary generate-btn" onClick={generate} disabled={busy||!zip||!bindings.length}>{busy?<><span className="spinner"/> Preparing ZIP…</>:'Generate & download ZIP'}<span>↗</span></button><p className="privacy-note">Aapki ZIP isi browser mein process hoti hai.</p><div className={`status-banner ${status.type}`} style={{marginTop:14}}><span className="status-dot"/><span>{status.text}</span></div>{validation&&<div className="validation-details">{validation.errors?.length>0&&<><strong className="error-text">Issues to fix</strong><ul>{validation.errors.map((e,i)=><li key={i}>{e}</li>)}</ul></>}{validation.warnings?.length>0&&<><strong className="warning-text">Note</strong><ul>{validation.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></>}{validation.ok&&<div className="success-line">✓ ZIP downloaded successfully.</div>}</div>}</section>
      </aside></div><footer><span>COMPLETE PROJECT GENERATOR</span><span>Original template · Field detection · ZIP export</span></footer>
    </main></div>;
}
createRoot(document.getElementById('root')).render(<App />);
