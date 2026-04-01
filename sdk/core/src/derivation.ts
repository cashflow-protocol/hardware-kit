const SOLANA_COIN_TYPE = 501;
const HARDENED_OFFSET = 0x80000000;

/**
 * Generate a standard Solana BIP-44 derivation path.
 * @param account - Account index (0-based)
 * @param change - Optional change index (0 for external). Some wallets omit this.
 * @returns e.g. "m/44'/501'/0'/0'" or "m/44'/501'/0'"
 */
export function solanaBip44Path(account: number, change?: number): string {
  const base = `m/44'/${SOLANA_COIN_TYPE}'/${account}'`;
  return change !== undefined ? `${base}/${change}'` : base;
}

/**
 * Parse a BIP-44 derivation path string into numeric components.
 * Hardened components (marked with ') include the HARDENED_OFFSET.
 * @returns Array of numbers, e.g. [0x8000002C, 0x800001F5, 0x80000000, 0x80000000]
 */
export function parseDerivationPath(path: string): number[] {
  const parts = path.replace(/^m\//, '').split('/');
  return parts.map((part) => {
    const hardened = part.endsWith("'");
    const index = parseInt(hardened ? part.slice(0, -1) : part, 10);
    if (isNaN(index)) {
      throw new Error(`Invalid derivation path component: ${part}`);
    }
    return hardened ? index + HARDENED_OFFSET : index;
  });
}

/**
 * Convert a derivation path to the Buffer format Ledger expects.
 * Each path component is written as a 4-byte big-endian uint32.
 */
export function derivationPathToBuffer(path: string): Buffer {
  const components = parseDerivationPath(path);
  const buffer = Buffer.alloc(1 + components.length * 4);
  buffer.writeUInt8(components.length, 0);
  components.forEach((component, i) => {
    buffer.writeUInt32BE(component, 1 + i * 4);
  });
  return buffer;
}
