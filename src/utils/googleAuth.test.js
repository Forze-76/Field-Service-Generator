import { afterEach, expect, it, vi } from "vitest";
import { requestGoogleToken } from "./googleAuth";
import { GMAIL_SCOPE } from "./gmailInvites";
afterEach(() => vi.unstubAllGlobals());
it("requests only read-only Gmail access and returns an in-memory token", async () => {
  const requestAccessToken = vi.fn();
  const initTokenClient = vi.fn((config) => {
    requestAccessToken.mockImplementation(() => config.callback({ access_token:"test-token", scope:GMAIL_SCOPE }));
    return {requestAccessToken};
  });
  vi.stubGlobal("google", { accounts:{ oauth2:{initTokenClient} } });
  expect(await requestGoogleToken(GMAIL_SCOPE)).toBe("test-token");
  expect(initTokenClient.mock.calls[0][0]).toMatchObject({scope:GMAIL_SCOPE,include_granted_scopes:false});
  expect(requestAccessToken).toHaveBeenCalledWith({prompt:"consent"});
});
it("rejects declined permissions and closed sign-in windows", async () => {
  vi.stubGlobal("google", {accounts:{oauth2:{initTokenClient: (config) => ({requestAccessToken: () => config.callback({access_token:"wrong-scope",scope:"openid"})})}}});
  await expect(requestGoogleToken(GMAIL_SCOPE)).rejects.toThrow(/not granted/);
  vi.stubGlobal("google", {accounts:{oauth2:{initTokenClient: (config) => ({requestAccessToken: () => config.error_callback()})}}});
  await expect(requestGoogleToken(GMAIL_SCOPE)).rejects.toThrow(/cancelled/);
});
