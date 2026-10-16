import type {AuthCookieSettings} from '@insforge/sdk/ssr';
// This app talks to InsForge only from its server. Neither token needs to be
// readable by browser JavaScript. Secure remains enforced by the SDK in prod.
export const authCookieSettings:AuthCookieSettings={options:{accessToken:{httpOnly:true,sameSite:'lax'},refreshToken:{httpOnly:true,sameSite:'lax'}}};
