const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encode a 32-byte Ed25519 public key (or any Uint8Array) as a base58 string.
 * Used to convert raw public key bytes from hardware wallets into Solana addresses.
 */
export function encodeBase58(data: Uint8Array | Buffer): string {
  const bytes = Uint8Array.from(data);

  // Count leading zeros
  let zeros = 0;
  for (const byte of bytes) {
    if (byte === 0) zeros++;
    else break;
  }

  // Convert to big integer and then to base58
  let num = BigInt(0);
  for (const byte of bytes) {
    num = num * 256n + BigInt(byte);
  }

  let result = '';
  while (num > 0n) {
    const remainder = Number(num % 58n);
    num = num / 58n;
    result = ALPHABET[remainder] + result;
  }

  return '1'.repeat(zeros) + result;
}
