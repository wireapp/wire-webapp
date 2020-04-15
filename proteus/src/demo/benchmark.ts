/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import * as sodium from 'libsodium-wrappers-sumo';
import * as ed2curve from 'ed2curve';
import * as os from 'os';
import * as proteus from '@wireapp/proteus';

const ITERATIONS = 100_000;

const convertToMs = (start: bigint, end: bigint): string => {
  const nanoSeconds = end - start;
  const milliseconds = Number(nanoSeconds) / 1_000_000;
  return milliseconds.toFixed(2);
};

const getDuration = (action: (...options: any[]) => any): string => {
  const start = process.hrtime.bigint();
  for (let index = 0; index <= ITERATIONS; index++) {
    action();
  }
  const end = process.hrtime.bigint();

  return convertToMs(start, end);
};

(async () => {
  const cpuModel = `${os.cpus().length}x ${os.cpus()[0].model}`;
  const memory = `${(os.totalmem() / 0x40000000).toFixed(1)} GB RAM`;
  const operatingSystem = `${os.type()} ${os.release()}`;
  const architecture = os.arch();

  console.info(`Setup:\n  ${cpuModel}\n  ${memory}\n  ${operatingSystem} (${architecture})\n`);
  console.info(`Running benchmarks with ${ITERATIONS.toLocaleString()} iterations each ...`);

  await sodium.ready;

  const ed25519Keypair = sodium.crypto_sign_keypair();

  const signKeyPairDuration = getDuration(() => sodium.crypto_sign_keypair());
  console.info(`Duration for sodium.crypto_sign_keypair: ${signKeyPairDuration} ms`);

  const ed2curveConvertSkDuration = getDuration(() => ed2curve.convertSecretKey(ed25519Keypair.privateKey));
  console.info(`Duration for ed2curve.convertSecretKey: ${ed2curveConvertSkDuration} ms`);

  const sodiumConvertSkDuration = getDuration(() =>
    sodium.crypto_sign_ed25519_sk_to_curve25519(ed25519Keypair.privateKey),
  );
  console.info(`Duration for sodium.sign_ed25519_sk_to_curve25519: ${sodiumConvertSkDuration} ms`);

  const ed2curveConvertPkDuration = getDuration(() => ed2curve.convertPublicKey(ed25519Keypair.publicKey));
  console.info(`Duration for ed2curve.convertPublicKey: ${ed2curveConvertPkDuration} ms`);

  const sodiumConvertPkDuration = getDuration(() =>
    sodium.crypto_sign_ed25519_pk_to_curve25519(ed25519Keypair.publicKey),
  );
  console.info(`Duration for sodium.crypto_sign_ed25519_pk_to_curve25519: ${sodiumConvertPkDuration} ms`);

  const alice = await proteus.keys.KeyPair.new();
  const bob = await proteus.keys.KeyPair.new();

  const proteusSharedSecred = getDuration(() => alice.secret_key.shared_secret(bob.public_key));
  console.info(`Duration for shared_secret: ${proteusSharedSecred} ms`);
})().catch(console.error);
