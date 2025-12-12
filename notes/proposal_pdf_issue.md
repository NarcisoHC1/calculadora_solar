# Proposal PDF download still hitting legacy API base

## Observed symptoms
- Browser console shows requests to `https://calculadora-backend-v2.netlify.app/api/proposal_pdf` returning 404 with CORS errors.
- Deploy preview URL: `https://deploy-preview-31--calculadora-solarya.netlify.app`.
- VITE_API_BASE reportedly removed from Netlify UI; VITE_PROPOSAL_API_BASE not defined.

## Relevant code paths
- `src/Proposal.tsx` builds the PDF API URL at build time: `const apiBase = import.meta.env.VITE_PROPOSAL_API_BASE ?? import.meta.env.VITE_API_BASE ?? '';` and calls `${apiBase}/api/proposal_pdf`.
- If both env vars are empty, the bundled JS should fetch `/api/proposal_pdf` on the **same** origin (so CORS would not apply because redirect in `netlify.toml` points to `/.netlify/functions/proposal_pdf`).

## Why the request still goes to the legacy domain
- The compiled preview bundle is still receiving a non-empty `VITE_API_BASE` during build, so the fetch URL is baked in as `https://calculadora-backend-v2.netlify.app/api/proposal_pdf`.
- This means the legacy env var is still present in the Netlify build environment (e.g., context-specific variables for Deploy Previews, or a cached build that hasn’t been redeployed after removing the variable). Removing it only from Production or from the UI without redeploying can leave the value in the preview build artifacts.
- Because the function and redirect exist only on `calculadora-solarya.netlify.app`, hitting the old domain returns 404 and triggers the CORS error seen in the console.

## What would resolve it
- Ensure **both** `VITE_PROPOSAL_API_BASE` and `VITE_API_BASE` are unset for the Deploy Preview context and trigger a fresh deploy so Vite inlines an empty string; the client will then call the same-origin `/api/proposal_pdf` route handled by the Netlify function.
- Clearing any Netlify cached build or enabling a new preview deploy helps guarantee the bundle is rebuilt without the legacy env var baked in.
