# NewsDesk AI

Newsroom adaptation of Version2: compare journalist portfolios with a reporting brief and organize verification, reporting, research and coordination tasks.

## Local use

Install the declared dependencies, copy `.env.example` to `.env`, configure Firebase values and a server-only `NVIDIA_API_KEY`, then run `npm run dev -- --host 127.0.0.1 --port 8082`.

Routes: `/` landing page, `/resume-comparator` profile review, `/auth` Firebase sign-in, `/app` signed-in cloud dashboard, `/workspace-demo` explicitly labelled browser-local preview. Preview tasks and conversation use local browser storage; they are separate from Firestore.

The local Vite proxy injects the NVIDIA credential on the server. Browser requests do not contain it. Production hosting needs an equivalent authenticated server endpoint with quotas and request validation; a static build alone does not provide that endpoint.

## Verification

`npm test`, `npm run build`, and `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` pass for the reviewed adaptation. Live checks cover newsroom profile comparison and a source-verification task restored after local-preview reload. Current Google OAuth and cloud persistence were not reauthenticated in this adaptation session.

AI scores are non-calibrated coverage estimates, not journalism quality ratings or hiring recommendations. Suggested tasks do not establish that sources have actually been verified. Legacy stored category IDs map to Verification (`dsa`), Reporting (`project`), Research (`learning`), and Coordination (`other`); `semester` is presented as planning cycle for schema compatibility.
