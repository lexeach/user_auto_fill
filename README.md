# Complete Project Generator — Master ZIP edition

This browser-only React/Vite app is tailored to the supplied Rahul Chrome Extension ZIP. It detects a simple `const formData = { ... }` object in a JS/TS file, creates one input per primitive property, and exports a new ZIP after updating only those property values. Other files and binary assets are copied unchanged.

## Requirements
- Node.js 20+ (pinned for Netlify in `.nvmrc` and `netlify.toml`)
- npm

## Run locally
```bash
npm install
npm run dev
```
Build and preview:
```bash
npm run build
npm run preview
```

## Deploy to Netlify
Import the GitHub repository. If the repository contains this folder as a subfolder, set Base directory to `project-generator`; otherwise leave Base directory blank. Build command: `npm run build`; publish directory: `dist`. The included `netlify.toml` sets Node 20 and these build settings.

## Workflow
1. Upload the original Master ZIP.
2. The app scans JS/TS text files for a simple `formData` object with literal primitive properties.
3. The app creates matching data inputs and pre-fills them with values found in the master ZIP.
4. Edit values and choose an output filename.
5. Generate a ZIP with the same paths/files; only detected `formData` property values and explicit `{{UPPERCASE_TOKEN}}` tokens in recognized text files are changed.

## Limitations and safety
- ZIP is processed in the browser; there is no upload backend.
- This parser supports simple primitive properties on separate lines. Nested/computed values, object spreads, and complex syntax need a custom parser.
- It does not execute the uploaded project or guarantee its build. Test the exported extension on an authorized test page before real use.
- Do not upload projects containing credentials or secrets.
