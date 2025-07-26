import pkg from 'elliptic';
import CryptoJS from 'crypto-js';
// import { configDotenv } from 'dotenv';

const EC = pkg.ec;
const ec = new EC('p256'); // or 'curve25519' if you prefer
// configDotenv();

// Derive ECDH keypair deterministically from user's private PIN
export const getECDHKeyPairFromPIN=(pin)=> {
  const derived = CryptoJS.PBKDF2(pin, "my-app-salt", {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256
  }).toString();

  const key = ec.keyFromPrivate(derived, 'hex');
  const pub = key.getPublic('hex');
  return { privateKey: key, publicKeyHex: pub };
}

export const deriveSharedSecret=(myPrivateKey, theirPublicKeyHex)=> {
  const theirKey = ec.keyFromPublic(theirPublicKeyHex, 'hex');
  const shared = myPrivateKey.derive(theirKey.getPublic()); // BN
  return shared.toString(16); // use this as AES key
}

export const encryptWithAES=(message, aesKeyHex)=> {
  return CryptoJS.AES.encrypt(message, aesKeyHex).toString();
}

export const decryptWithAES=(ciphertext, aesKeyHex)=> {
  const bytes = CryptoJS.AES.decrypt(ciphertext, aesKeyHex);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// 1. Simulate: User A logs in with their PIN
const userAPIN = "alice-secret-pin";
const userA = getECDHKeyPairFromPIN(userAPIN);
console.log("userA: ",userA);

// 2. Simulate: User B logs in with their PIN
const userBPIN = "bob-secret-pin";
const userB = getECDHKeyPairFromPIN(userBPIN);

// 3. User A wants to send encrypted message to B
// A has A's private key and B's public key
const sharedSecretA = deriveSharedSecret(userA.privateKey, userB.publicKeyHex);  // on client side store public key on server

// 4. A encrypts message using shared secret
const plaintext = "Hello Bob, this is Alice!";
const encrypted = encryptWithAES(plaintext, sharedSecretA);
console.log("🔒 Encrypted:", encrypted);

// 5. On B's side: Derive shared secret again using B's private key and A's public key
const sharedSecretB = deriveSharedSecret(userB.privateKey, userA.publicKeyHex);
console.log("comparing keys: ",sharedSecretA===sharedSecretB);
// 6. B decrypts message using shared secret
const decrypted = decryptWithAES(encrypted, sharedSecretB);
console.log("✅ Decrypted by B:", decrypted);

