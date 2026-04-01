import {
  solanaBip44Path,
  parseDerivationPath,
  derivationPathToBuffer,
} from '../src/derivation';

describe('solanaBip44Path', () => {
  it('generates path without change index', () => {
    expect(solanaBip44Path(0)).toBe("m/44'/501'/0'");
    expect(solanaBip44Path(3)).toBe("m/44'/501'/3'");
  });

  it('generates path with change index', () => {
    expect(solanaBip44Path(0, 0)).toBe("m/44'/501'/0'/0'");
    expect(solanaBip44Path(2, 1)).toBe("m/44'/501'/2'/1'");
  });
});

describe('parseDerivationPath', () => {
  const H = 0x80000000;

  it('parses standard Solana path', () => {
    const result = parseDerivationPath("m/44'/501'/0'/0'");
    expect(result).toEqual([44 + H, 501 + H, 0 + H, 0 + H]);
  });

  it('parses path without change', () => {
    const result = parseDerivationPath("m/44'/501'/0'");
    expect(result).toEqual([44 + H, 501 + H, 0 + H]);
  });

  it('handles non-hardened components', () => {
    const result = parseDerivationPath('m/44/501/0');
    expect(result).toEqual([44, 501, 0]);
  });

  it('throws on invalid component', () => {
    expect(() => parseDerivationPath("m/44'/abc'/0'")).toThrow(
      'Invalid derivation path component',
    );
  });
});

describe('derivationPathToBuffer', () => {
  it('encodes path as buffer with length prefix', () => {
    const buf = derivationPathToBuffer("m/44'/501'/0'/0'");
    // First byte is number of components
    expect(buf[0]).toBe(4);
    // Total length: 1 + 4*4 = 17
    expect(buf.length).toBe(17);
    // First component: 44 + 0x80000000 = 0x8000002C
    expect(buf.readUInt32BE(1)).toBe(0x8000002c);
    // Second component: 501 + 0x80000000 = 0x800001F5
    expect(buf.readUInt32BE(5)).toBe(0x800001f5);
  });
});
