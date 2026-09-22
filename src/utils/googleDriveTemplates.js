import { requestGoogleToken } from "./googleAuth";
import { identifyTemplate, saveTemplateFile } from "./templateStore";

export { GOOGLE_CLIENT_ID } from "./googleAuth";
export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export const TRIP_TEMPLATE_FOLDERS = {
  service: "1IaDAXtAaia1W89sm4oYGgg-bcDZJ4H8N",
  warranty: "157HhuAvuCtUr-p8T6MzNprrj3Vue5HfW",
  "start up": "1od01azDdvld46oUZPIdu0JlimfxRWVEe",
  startup: "1od01azDdvld46oUZPIdu0JlimfxRWVEe",
  inspection: "1SDPhFlbVtzyr0GWigWB_gzyOMeDSkvMI",
  supervision: "1MOaxPyRcHGJTKOGmyW-vIe8QR8yyzRNJ",
  training: "1bDKA5YUjpyysx2M131vmPprOStV-nOH_",
  "pm lift": "12GWTGpLLNGCknFpZ7gDxDNaDni7UVuGK",
  "pm cartveyor": "1dIbmHFqkB_adgAINj0mc_ttRJ18n3sGA",
  "startup cartveyor": "160Wz-HlHiJwewav12CUcfnordlhRLazW",
  ioq: "1DbxiE0mHnElgLFx7rwdMdFNTn4paW9_O",
  "go live": "1taVCPrRj5aREKqHw9fwpBhNUGyuI1nbr",
  "grand opening": "1hByKE21j-XS-8LsqdYH9I6HFQa0FCnJm",
  "google inspection": "1uGd8Ui5o61qIB_smk0rc35l59HW7XQV4",
};

export const templateFolderForTrip = (tripType = "") =>
  TRIP_TEMPLATE_FOLDERS[String(tripType).trim().toLowerCase()] || null;

export const requestGoogleDriveToken = () => requestGoogleToken(GOOGLE_DRIVE_SCOPE);

const driveFetch = async (url, token) => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status}).`);
  return response;
};

export async function syncGoogleTemplatesForTrip(tripType, token) {
  const folderId = templateFolderForTrip(tripType);
  if (!folderId) throw new Error(`No Google Drive template folder is configured for ${tripType || "this trip type"}.`);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent("files(id,name,mimeType,modifiedTime,size)");
  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=100`,
    token,
  );
  const listing = await response.json();
  const recognized = (listing.files || []).filter((file) => identifyTemplate(file.name));
  if (!recognized.length) throw new Error(`No recognized native templates were found for ${tripType}.`);

  const saved = [];
  for (const item of recognized) {
    const download = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.id)}?alt=media`,
      token,
    );
    const blob = await download.blob();
    const file = new File([blob], item.name, { type: item.mimeType || blob.type });
    const definition = await saveTemplateFile(file, undefined, {
      source: "google-drive",
      sourceId: item.id,
      sourceModifiedAt: item.modifiedTime,
      tripType,
    });
    saved.push(definition);
  }
  return saved;
}
