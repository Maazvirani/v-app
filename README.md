# V-Agent Builder

Demo web app, API, and agent workspace source. The source archive is kept at the repository root; Render unpacks it during its build.

## Deploy this repository to Render

1. Create a PostgreSQL project in Neon and copy its pooled connection string.
2. In Render, choose **New → Blueprint** and connect this repository on the `main` branch.
3. When Render asks for `DATABASE_URL`, paste the Neon connection string. Keep the generated `APP_ENCRYPTION_KEY` and `PGSSLMODE=require` values.
4. Deploy. The Render build extracts the ZIP, installs the app dependencies, builds the web client, and starts the API server.
5. Open the Render URL. Check `/api/health` for `"ok":true`.

The free Render service sleeps after inactivity. Real AI requests need a provider key in the app's Connections page and may incur provider charges. Do not commit `.env` files or API keys.

The repository is currently public. Anyone can view and download its source archive. Change its visibility in GitHub repository **Settings → General → Danger Zone** if you want it private.
