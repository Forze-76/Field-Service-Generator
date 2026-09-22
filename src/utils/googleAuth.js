export const GOOGLE_CLIENT_ID =
  "284199027991-okml5m042idto96bnbaa27gmb6069qmb.apps.googleusercontent.com";

let identityPromise;
export const loadGoogleIdentity = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (identityPromise) return identityPromise;
  identityPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { identityPromise = null; script.remove(); reject(new Error("Unable to load Google sign-in. Check your connection and try again.")); };
    document.head.appendChild(script);
  });
  return identityPromise;
};

export async function requestGoogleToken(scope) {
  await loadGoogleIdentity();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope,
      include_granted_scopes: false,
      callback: (response) => {
        if (response?.access_token && response.scope?.split(" ").includes(scope)) resolve(response.access_token);
        else reject(new Error(response?.error_description || "Google access was not granted."));
      },
      error_callback: () => reject(new Error("Google sign-in was cancelled.")),
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

