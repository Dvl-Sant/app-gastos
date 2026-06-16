const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
   throw new Error('JWT_SECRET must be set in production');
}

export const SECRET = JWT_SECRET || 'dev_only_insecure_secret';
