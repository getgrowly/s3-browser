import bcrypt from "bcryptjs"
import { db } from "./database"

const PASSWORD_HASH_KEY = "password_hash"
const SALT_ROUNDS = 10

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  console.log("PasswordUtils.hashPassword - Hashing password")
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  console.log("PasswordUtils.verifyPassword - Verifying password")
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error("PasswordUtils.verifyPassword - Error:", error)
    return false
  }
}

/**
 * Check if a password is set
 */
export async function hasPassword(): Promise<boolean> {
  console.log("PasswordUtils.hasPassword - Checking if password exists")
  const hash = await db.getAppSetting(PASSWORD_HASH_KEY)
  return hash !== null
}

/**
 * Set a new password
 */
export async function setPassword(password: string): Promise<void> {
  console.log("PasswordUtils.setPassword - Setting new password")
  
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long")
  }
  
  const hash = await hashPassword(password)
  await db.setAppSetting(PASSWORD_HASH_KEY, hash)
  console.log("PasswordUtils.setPassword - Password set successfully")
}

/**
 * Remove the password
 */
export async function removePassword(): Promise<void> {
  console.log("PasswordUtils.removePassword - Removing password")
  await db.setAppSetting(PASSWORD_HASH_KEY, null)
  console.log("PasswordUtils.removePassword - Password removed successfully")
}

/**
 * Verify if the entered password is correct
 */
export async function verifyAppPassword(password: string): Promise<boolean> {
  console.log("PasswordUtils.verifyAppPassword - Verifying app password")
  
  const hash = await db.getAppSetting(PASSWORD_HASH_KEY)
  if (!hash) {
    console.log("PasswordUtils.verifyAppPassword - No password set")
    return false
  }
  
  const isValid = await verifyPassword(password, hash)
  console.log("PasswordUtils.verifyAppPassword - Password valid:", isValid)
  return isValid
}

/**
 * Check password strength
 */
export function getPasswordStrength(password: string): { 
  score: number
  label: "weak" | "fair" | "good" | "strong"
  feedback: string
} {
  let score = 0
  
  // Length check
  if (password.length >= 6) {
    score++
  }
  if (password.length >= 8) {
    score++
  }
  if (password.length >= 12) {
    score++
  }
  
  // Character diversity checks
  if (/[a-z]/.test(password)) {
    score++
  }
  if (/[A-Z]/.test(password)) {
    score++
  }
  if (/[0-9]/.test(password)) {
    score++
  }
  if (/[^a-zA-Z0-9]/.test(password)) {
    score++
  }
  
  // Normalize score to 0-3 range
  const normalizedScore = Math.min(3, Math.floor(score / 2))
  
  const labels: Array<"weak" | "fair" | "good" | "strong"> = ["weak", "fair", "good", "strong"]
  const feedbacks = [
    "Too weak - add more characters",
    "Fair - consider adding numbers or symbols",
    "Good password",
    "Strong password"
  ]
  
  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    feedback: feedbacks[normalizedScore]
  }
}

