
export type StoredRefresh = {
  encryptedRefreshToken: string;
  scopes?: string[];
  spotifyUserId?: string;
  // TODO: store more metadata if needed
};

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  scope: string;
};