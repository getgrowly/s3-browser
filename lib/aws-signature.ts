// AWS Signature v4 oluşturma
export async function createAwsSignature({
  method,
  url,
  region,
  service,
  accessKeyId,
  secretAccessKey,
  host,
  amzDate,
  dateStamp,
}: {
  method: string
  url: string
  region: string
  service: string
  accessKeyId: string
  secretAccessKey: string
  host: string
  amzDate: string
  dateStamp: string
}): Promise<string> {
  // Canonical request oluştur
  const canonicalUri = new URL(url).pathname
  const canonicalQueryString = new URL(url).search.substring(1)
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${amzDate}\n`
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date"

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n")

  // String to sign oluştur
  const algorithm = "AWS4-HMAC-SHA256"
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [algorithm, amzDate, credentialScope, await sha256(canonicalRequest)].join("\n")

  // Signing key oluştur
  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  const kSigning = await hmacSha256(kService, "aws4_request")

  // Signature hesapla
  const signature = await hmacSha256Hex(kSigning, stringToSign)

  // Authorization header oluştur
  return `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
}

// SHA256 hash fonksiyonu
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// HMAC-SHA256 fonksiyonu
async function hmacSha256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const keyBuffer = typeof key === "string" ? new TextEncoder().encode(key) : key
  const messageBuffer = new TextEncoder().encode(message)

  const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])

  return await crypto.subtle.sign("HMAC", cryptoKey, messageBuffer)
}

// HMAC-SHA256 hex string olarak
async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
  const signature = await hmacSha256(key, message)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}
