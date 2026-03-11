# That Cookie Dough

A structurally sound, Vercel-ready static application.

## Application Structure

All source logic has been strictly maintained to preserve 100% of the site's functionality. The architecture was refined for standard cloud deployments:

- **`public/`**: Contains static assets like images and branding.
- **`pages/`**: Contains all HTML files, separating structure from root level.
- **`scripts/`**: Houses all JavaScript files (e.g., UI interactions, ordering system).
- **`styles/`**: Central location for all cascading style files.
- **`backend/`**: Safely stores `Code.gs` Google Apps Script integrations.
- **`index.html`**: Entry point that gracefully redirects traffic to `homepage.html`.
- **`vercel.json`**: Explicitly directs frontend routing for static hosting in the cloud.

## Deployment with GitHub & Vercel

### Step 1: Uploading to GitHub

1. Install Git and open your terminal in this folder.
2. Initialize and push your project:

```bash
git init
git add .
git commit -m "Structural refinement"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Deploying to Vercel

1. Go to [Vercel](https://vercel.com/) and create a new project.
2. Import your GitHub repository.
3. Allow Vercel to default configuration (Framework Preset: Build Command `None`, Output `.` or root).
4. Click **Deploy**. Vercel will automatically look at `vercel.json` and serve `index.html`.
