// Prints a VAPID key pair. Run once:  npm run keys
import { generateKeyPairSync } from 'node:crypto';
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const j = privateKey.export({ format: 'jwk' });
const b = (s) => Buffer.from(s, 'base64url');
const pub = Buffer.concat([Buffer.from([4]), b(j.x), b(j.y)]).toString('base64url');
console.log('VAPID_PUBLIC  =', pub, '   <- also paste into web/index.html as PUSH_KEY');
console.log('VAPID_PRIVATE =', j.d, '   <- secret: npx wrangler secret put VAPID_PRIVATE');
