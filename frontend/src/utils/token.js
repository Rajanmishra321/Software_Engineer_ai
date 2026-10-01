// One definition of where the auth token lives, so the axios client, the
// socket connection and the auth screens can't drift apart.
const TOKEN_KEY = "Token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
