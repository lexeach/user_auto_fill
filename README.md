# Complete Project Generator

A local-first React/Vite app that accepts a master ZIP, configures form fields, replaces explicit `{{UPPERCASE_TOKEN}}` placeholders in recognized text files, performs basic validation, and exports a customized ZIP.

## Requirements
- Node.js 18+ (Node.js 20+ recommended)
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL shown by Vite. To create a production build:
```bash
npm run build
npm run preview
```

## Workflow
1. Prepare a master project ZIP.
2. Replace variable client/project values in text source files with explicit tokens, e.g. `{{CLIENT_NAME}}`, `{{CLIENT_EMAIL}}`, `{{PROJECT_NAME}}`.
3. Upload the master ZIP. Detected tokens are added to the schema automatically.
4. Set labels, field types, required rules and values.
5. Generate and export the ZIP.
6. Run the generated project's own build and tests before deploying it.

## Safe replacement rules
- Only explicit `{{UPPERCASE_TOKEN}}` tokens are replaced.
- Only recognized text file extensions are scanned/replaced; binary assets are copied unchanged.
- ZIP absolute paths and parent-directory traversal paths are rejected.
- JSON files are parsed after replacements; invalid JSON prevents export.
- Unknown tokens block generation.
- Uploads are processed in the browser; this app has no backend or upload endpoint.

## Important limitations
This tool does not automatically infer every application's business logic or guarantee that a generated project compiles. It does not run arbitrary code from the uploaded ZIP. Build commands are project-specific and should be run separately. Replacements are literal text substitutions: keep placeholders in the appropriate string context and do not use this mechanism to insert untrusted source code.

## Example placeholders
JavaScript:
```js
const clientName = "{{CLIENT_NAME}}";
```
JSON:
```json
{ "name": "{{PROJECT_NAME}}" }
```
HTML:
```html
<title>{{PROJECT_NAME}}</title>
```

Do not put passwords, private keys, API secrets or other sensitive credentials in templates or form values.
