import URDecoder from '@ngraveio/bc-ur/dist/urDecoder';
import UREncoder from '@ngraveio/bc-ur/dist/urEncoder';
import { generateSolSignRequest } from '../src/qr-protocol';

describe('UR round-trip', () => {
  it('multi-part UR can be assembled by receiving parts', () => {
    // Build a sign request large enough to force multi-part at 400-byte fragments
    const largePayload = Buffer.alloc(2000, 0xab);
    const { encoder } = generateSolSignRequest({
      requestId: '12345678-1234-4234-8234-123456789012',
      signData: largePayload,
      path: "m/44'/501'/0'",
      xfp: 'abcd1234',
    });

    const fragments = encoder.encodeWhole();
    expect(fragments.length).toBeGreaterThan(1); // must be multi-part

    // Simulate scanner feeding parts into a URDecoder one by one
    const decoder = new URDecoder();
    for (const fragment of fragments) {
      decoder.receivePart(fragment);
      if (decoder.isComplete()) break;
    }

    expect(decoder.isComplete()).toBe(true);
    expect(decoder.isSuccess()).toBe(true);
    expect(decoder.resultUR().type).toBe('sol-sign-request');
  });

  it('single-part UR completes on first receivePart', () => {
    const { encoder } = generateSolSignRequest({
      requestId: '12345678-1234-4234-8234-123456789012',
      signData: Buffer.from([1, 2, 3]),
      path: "m/44'/501'/0'",
      xfp: 'abcd1234',
    });
    const fragments = encoder.encodeWhole();

    const decoder = new URDecoder();
    decoder.receivePart(fragments[0]);
    expect(decoder.isComplete()).toBe(true);
  });

  it('encodeSinglePart produces a string decodable by URDecoder.decode', () => {
    // Verifies our scanQr() flow: after assembling multi-part UR,
    // we serialize it with encodeSinglePart and return it.
    // Downstream code calls URDecoder.decode(s) on the result.
    const { ur } = generateSolSignRequest({
      requestId: '12345678-1234-4234-8234-123456789012',
      signData: Buffer.from([9, 8, 7]),
      path: "m/44'/501'/0'",
      xfp: 'abcd1234',
    });

    const singlePart = UREncoder.encodeSinglePart(ur);
    expect(typeof singlePart).toBe('string');
    expect(singlePart.startsWith('ur:')).toBe(true);

    const reDecoded = URDecoder.decode(singlePart);
    expect(reDecoded.type).toBe(ur.type);
  });
});
