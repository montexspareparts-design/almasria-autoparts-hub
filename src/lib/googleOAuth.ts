const OAUTH_BASE_URL = "https://oauth.lovable.app/initiate";

const getProjectId = () => import.meta.env.VITE_SUPABASE_PROJECT_ID;

export const startGoogleOAuth = (redirectUri: string) => {
  const projectId = getProjectId();

  if (!projectId) {
    throw new Error("GOOGLE_OAUTH_PROJECT_ID_MISSING");
  }

  const url = new URL(OAUTH_BASE_URL);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("project_id", projectId);

  window.location.assign(url.toString());
};