// src/utils/auth.ts

/**
 * Save the JWT or session token.
 */
export const saveToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * Retrieve the current token (or null if not set).
 */
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Remove the stored token.
 */
export const removeToken = (): void => {
  localStorage.removeItem('token');
};

/**
 * Quick boolean check for “am I logged in?”
 */
export const isLoggedIn = (): boolean => {
  return Boolean(getToken());
};

/**
 * Save the user’s email address.
 */
export const saveEmail = (email: string): void => {
  localStorage.setItem('email', email);
};

/**
 * Retrieve the stored email (or null).
 */
export const getEmail = (): string | null => {
  return localStorage.getItem('email');
};

/**
 * Remove the stored email.
 */
export const removeEmail = (): void => {
  localStorage.removeItem('email');
};

/**
 * Fully clear out the user’s session.
 */
export const signOut = (): void => {
  removeToken();
  removeEmail();
};
