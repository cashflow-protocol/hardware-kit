import { encodeBase58 } from '../src/base58';

describe('encodeBase58', () => {
  it('encodes all-zero bytes as leading 1s', () => {
    const zeros = new Uint8Array(32);
    const result = encodeBase58(zeros);
    expect(result).toBe('1'.repeat(32));
  });

  it('encodes a known public key correctly', () => {
    // The system program address is all zeros = 32 leading 1s
    // But a single byte [1] should encode to "2"
    expect(encodeBase58(new Uint8Array([1]))).toBe('2');
    expect(encodeBase58(new Uint8Array([0, 1]))).toBe('12');
  });

  it('encodes a 32-byte key to a reasonable length base58 string', () => {
    const key = new Uint8Array(32);
    key[0] = 0x01;
    key[31] = 0xff;
    const result = encodeBase58(key);
    // Solana addresses are 32-44 chars in base58
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(44);
    // Only base58 characters
    expect(result).toMatch(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/);
  });

  it('accepts Buffer input', () => {
    const buf = Buffer.from([0x0a, 0x0b, 0x0c]);
    const result = encodeBase58(buf);
    expect(result.length).toBeGreaterThan(0);
  });
});
