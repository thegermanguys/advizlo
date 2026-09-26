/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// On Vercel, Neon URLs belong to the API project. Fail that project's web
// build if they were pasted here by mistake. Local shells may export the
// same names for `backend/`, so this check runs only in a Vercel build.
if (process.env.VERCEL) {
  const databaseEnv = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED'].filter(
    (name) => process.env[name],
  );
  if (databaseEnv.length > 0) {
    const verb = databaseEnv.length > 1 ? 'are' : 'is';
    throw new Error(
      `${databaseEnv.join(' and ')} ${verb} set on the web app. Remove ${databaseEnv.length > 1 ? 'them' : 'it'} from this Vercel project (root directory web). Set Neon URLs on the API project (root directory backend) only.`,
    );
  }
}

module.exports = nextConfig;
