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
