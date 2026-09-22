export function getRuntimeEnv() {
  return {
    XMOV_APP_ID: process.env.XMOV_APP_ID,
    XMOV_APP_SECRET: process.env.XMOV_APP_SECRET,
    XMOV_GATEWAY: process.env.XMOV_GATEWAY,
    PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN,
  };
}
