import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const androidDir = path.join(root, 'android')
const isWin = process.platform === 'win32'
const gradlew = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew')

const javaCandidates = [
  'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.12.8-hotspot',
  'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.8+9-hotspot',
  'C:\\Program Files\\Eclipse Adoptium\\jdk-21',
  process.env.JAVA_HOME,
  'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.18.8-hotspot',
  'C:\\Program Files\\Eclipse Adoptium\\jdk-17',
  '/usr/lib/jvm/java-21-openjdk',
  '/usr/lib/jvm/java-17-openjdk',
].filter(Boolean)

function javaMajor(javaHome) {
  const javaBin = path.join(javaHome, 'bin', isWin ? 'java.exe' : 'java')
  if (!fs.existsSync(javaBin)) return 0
  const result = spawnSync(javaBin, ['-version'], { encoding: 'utf8' })
  const out = `${result.stderr || ''}${result.stdout || ''}`
  const match = out.match(/version "(\d+)/)
  return match ? Number(match[1]) : 0
}

/** Gradle 8.14: JDK 17–23. Capacitor 8 plugins: toolchain 21 (foojay download). */
function isUsableGradleJvm(javaHome) {
  const major = javaMajor(javaHome)
  return major >= 17 && major <= 23
}

const javaHome = javaCandidates.find(isUsableGradleJvm)
if (!javaHome) {
  console.error(
    'Java 17–23 required to run Gradle (JDK 25+ is too new for Gradle 8.14). Install Temurin JDK 21.',
  )
  process.exit(1)
}

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  ANDROID_SDK_ROOT:
    process.env.ANDROID_SDK_ROOT ||
    process.env.ANDROID_HOME ||
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  PATH: `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH || ''}`,
}

const localProps = path.join(androidDir, 'local.properties')
if (!fs.existsSync(localProps) && env.ANDROID_HOME) {
  const sdkDir = env.ANDROID_HOME.replace(/\\/g, '\\\\')
  fs.writeFileSync(localProps, `sdk.dir=${sdkDir}\n`)
}

console.log(`Using JAVA_HOME=${javaHome}`)
const result = isWin
  ? spawnSync('cmd.exe', ['/c', 'gradlew.bat', 'assembleDebug', '--no-daemon'], {
      cwd: androidDir,
      env,
      stdio: 'inherit',
      windowsHide: true,
    })
  : spawnSync(gradlew, ['assembleDebug', '--no-daemon'], {
      cwd: androidDir,
      env,
      stdio: 'inherit',
    })

if (result.status !== 0) process.exit(result.status || 1)

const apkSrc = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const apkDest = path.join(root, 'Lider-Manager-debug.apk')
const repoApks = path.join(root, '..', 'apks', 'lider-manager-debug.apk')
fs.copyFileSync(apkSrc, apkDest)
try {
  fs.mkdirSync(path.dirname(repoApks), { recursive: true })
  fs.copyFileSync(apkSrc, repoApks)
} catch { /* optional */ }
console.log(`\nAPK ready:\n  ${apkSrc}\n  ${apkDest}`)
