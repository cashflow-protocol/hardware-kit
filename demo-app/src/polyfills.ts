/**
 * Polyfills required for hardware wallet SDKs in React Native.
 *
 * Import this file at the top of your app entry point (index.js)
 * BEFORE any other imports.
 */

// Must come first — provides crypto.getRandomValues for crypto-browserify
import 'react-native-get-random-values';

// Buffer polyfill
import {Buffer} from 'buffer';
(globalThis as any).Buffer = Buffer;

// Process polyfill
import process from 'process';
(globalThis as any).process = process;
