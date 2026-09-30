#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, stat, writeFile, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sdk = process.env.TRISEAL_ANDROID_SDK || process.env.ANDROID_SDK_ROOT || path.join(homedir(), 'Library/Android/sdk');
const jdk = process.env.TRISEAL_JAVA_HOME || process.env.JAVA_HOME || '/opt/homebrew/opt/openjdk@17';
const buildTools = path.join(sdk, 'build-tools', process.env.TRISEAL_BUILD_TOOLS || '36.0.0');
const androidJar = path.join(sdk, 'platforms', 'android-36', 'android.jar');
const build = path.join(root, 'build/android');
const output = path.join(root, 'dist/triseal-android.apk');
const signing = process.env.TRISEAL_SIGNING_DIR || path.join(homedir(), '.config/triseal/android');
const keyStore = path.join(signing, 'release.jks');
const passwordFile = path.join(signing, 'store-password');
const env = { ...process.env, JAVA_HOME: jdk, PATH: `${path.join(jdk, 'bin')}${path.delimiter}${process.env.PATH || ''}` };

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} exited with ${result.status}`);
}

async function filesIn(directory, suffix) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await filesIn(target, suffix));
    else if (entry.isFile() && entry.name.endsWith(suffix)) found.push(target);
  }
  return found.sort();
}

if (!existsSync(androidJar) || !existsSync(path.join(jdk, 'bin/javac'))) {
  throw new Error('Install Android SDK platform/build-tools 36 and JDK 17+, or set TRISEAL_ANDROID_SDK / TRISEAL_JAVA_HOME.');
}
if (!existsSync(keyStore) || !existsSync(passwordFile)) {
  if (existsSync(keyStore) || existsSync(passwordFile)) throw new Error('Signing material is incomplete; restore it instead of creating a different key.');
  if (!process.argv.includes('--init-signing')) throw new Error('No signing key. First build only: use --init-signing. Keep the resulting private signing directory for every future APK.');
  await mkdir(signing, { recursive: true, mode: 0o700 });
  await chmod(signing, 0o700);
  await writeFile(passwordFile, `${randomBytes(32).toString('hex')}\n`, { mode: 0o600, flag: 'wx' });
  run(path.join(jdk, 'bin/keytool'), ['-genkeypair', '-noprompt', '-keystore', keyStore,
    '-storetype', 'PKCS12', '-alias', 'triseal', '-keyalg', 'RSA', '-keysize', '3072',
    '-validity', '10000', '-dname', 'CN=Triseal Development, O=Triseal',
    '-storepass:file', passwordFile, '-keypass:file', passwordFile]);
  await chmod(keyStore, 0o600);
  console.log('Created private app signing material outside the repository. Back up this directory securely:', signing);
}

// A strict runtime allowlist is shared by the installed APK and the OTA bundle.
run(process.execPath, [path.join(root, 'scripts/package-web.mjs')]);
await rm(build, { recursive: true, force: true });
for (const dir of ['assets', 'classes', 'dex', 'generated']) await mkdir(path.join(build, dir), { recursive: true });
await cp(path.join(root, 'dist/web'), path.join(build, 'assets/www'), { recursive: true });

run(path.join(buildTools, 'aapt2'), ['compile', '--dir', path.join(root, 'android/res'), '-o', path.join(build, 'resources.zip')]);
run(path.join(buildTools, 'aapt2'), ['link', '-o', path.join(build, 'unsigned.apk'),
  '--manifest', path.join(root, 'android/AndroidManifest.xml'), '-I', androidJar,
  '--java', path.join(build, 'generated'), '-A', path.join(build, 'assets'),
  path.join(build, 'resources.zip')]);
const sources = [...await filesIn(path.join(root, 'android'), '.java'), ...await filesIn(path.join(build, 'generated'), '.java')];
// Use the JDK's Java 8 lambda bootstrap while compiling Android API references.
// D8 then desugars lambdas for the supported Android API level.
run(path.join(jdk, 'bin/javac'), ['-encoding', 'UTF-8', '--release', '8',
  '-classpath', androidJar, '-d', path.join(build, 'classes'), ...sources]);
run(path.join(buildTools, 'd8'), ['--lib', androidJar, '--min-api', '26', '--output', path.join(build, 'dex'), ...await filesIn(path.join(build, 'classes'), '.class')]);
run('zip', ['-q', '-j', path.join(build, 'unsigned.apk'), ...await filesIn(path.join(build, 'dex'), '.dex')]);
run(path.join(buildTools, 'zipalign'), ['-f', '4', path.join(build, 'unsigned.apk'), path.join(build, 'aligned.apk')]);
run(path.join(buildTools, 'apksigner'), ['sign', '--ks', keyStore, '--ks-key-alias', 'triseal',
  '--ks-pass', `file:${passwordFile}`,
  '--out', output, path.join(build, 'aligned.apk')]);
// Signature verification is part of producing an installable package, not a gameplay test.
run(path.join(buildTools, 'apksigner'), ['verify', '--print-certs', output]);
const digest = createHash('sha256').update(await readFile(output)).digest('hex');
await writeFile(`${output}.sha256`, `${digest}  triseal-android.apk\n`);
console.log(`APK: ${output}\nSize: ${(await stat(output)).size} bytes\nSHA-256: ${digest}`);
