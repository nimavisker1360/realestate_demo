import { auth } from "express-oauth2-jwt-bearer";
const jwtCheck = auth({
  audience: "N7a0UjSNt8egPgXFOZI5EZifFeCekPoP",
  issuerBaseURL: "https://dev-pdz8rd3zuiwyzqzo.us.auth0.com/",
  tokenSigningAlg: "RS256",
});

export default jwtCheck;
