const DEFAULT_GA_MEASUREMENT_ID = "G-KMXZ73K0CE";

function readPublicEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const GTM_ID = readPublicEnv("NEXT_PUBLIC_GTM_ID");
export const GA_MEASUREMENT_ID =
  readPublicEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID") ?? DEFAULT_GA_MEASUREMENT_ID;
export const GOOGLE_ADS_ID = readPublicEnv("NEXT_PUBLIC_GOOGLE_ADS_ID");
