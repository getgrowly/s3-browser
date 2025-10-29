// AWS Signature Version 4 implementation
export class AwsSignatureV4 {
  private accessKeyId: string
  private secretAccessKey: string
  private region: string
  private service = "s3"

  constructor(accessKeyId: string, secretAccessKey: string, region: string) {
    this.accessKeyId = accessKeyId
    this.secretAccessKey = secretAccessKey
    this.region = region
  }

  async signRequest(
    method: string,
    url: string,
    headers: Record<string, string> = {},
    _body?: string
  ): Promise<Record<string, string>> {
    const urlObj = new URL(url)
    const host = urlObj.host
    const pathname = urlObj.pathname
    const search = urlObj.search

    // Create date strings
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
    const dateStamp = amzDate.substring(0, 8)

    // Add required headers
    const signedHeaders: Record<string, string> = {
      host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      ...headers,
    }

    // Create canonical request
    const canonicalUri = pathname || "/"
    const canonicalQueryString = search.substring(1)
    const canonicalHeaders = Object.keys(signedHeaders)
      .sort()
      .map((key) => `${key.toLowerCase()}:${signedHeaders[key].trim()}`)
      .join("\n")
    const signedHeadersList = Object.keys(signedHeaders)
      .sort()
      .map((key) => key.toLowerCase())
      .join(";")

    const canonicalRequest = [
      method.toUpperCase(),
      canonicalUri,
      canonicalQueryString,
      `${canonicalHeaders}\n`,
      signedHeadersList,
      "UNSIGNED-PAYLOAD",
    ].join("\n")

    // Create string to sign
    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await this.sha256(canonicalRequest)].join("\n")

    // Calculate signature
    const signature = await this.calculateSignature(dateStamp, stringToSign)

    // Create authorization header
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`

    return {
      ...signedHeaders,
      Authorization: authorizationHeader,
    }
  }

  private async calculateSignature(dateStamp: string, stringToSign: string): Promise<string> {
    const kDate = await this.hmacSha256(`AWS4${this.secretAccessKey}`, dateStamp)
    const kRegion = await this.hmacSha256(kDate, this.region)
    const kService = await this.hmacSha256(kRegion, this.service)
    const kSigning = await this.hmacSha256(kService, "aws4_request")
    const signature = await this.hmacSha256(kSigning, stringToSign)
    return this.toHex(signature)
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
    return this.toHex(hashBuffer)
  }

  private async hmacSha256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
    const keyBuffer = typeof key === "string" ? new TextEncoder().encode(key) : key
    const messageBuffer = new TextEncoder().encode(message)
    const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
    ])
    return await crypto.subtle.sign("HMAC", cryptoKey, messageBuffer)
  }

  private toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  async generatePresignedUrl(method: string, url: string, expiresIn: number = 3600): Promise<string> {
    const urlObj = new URL(url)

    // Create date strings
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
    const dateStamp = amzDate.substring(0, 8)

    // Create credential scope
    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`
    const credential = `${this.accessKeyId}/${credentialScope}`

    // Build query parameters for presigned URL
    const queryParams = new URLSearchParams(urlObj.search)
    queryParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
    queryParams.set("X-Amz-Credential", credential)
    queryParams.set("X-Amz-Date", amzDate)
    queryParams.set("X-Amz-Expires", expiresIn.toString())
    queryParams.set("X-Amz-SignedHeaders", "host")

    // Sort query parameters
    const sortedParams = Array.from(queryParams.entries()).sort()
    const canonicalQueryString = sortedParams
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&")

    // Create canonical request
    const canonicalUri = urlObj.pathname
    const canonicalHeaders = `host:${urlObj.host}\n`
    const signedHeaders = "host"

    const canonicalRequest = [
      method.toUpperCase(),
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      "UNSIGNED-PAYLOAD",
    ].join("\n")

    // Create string to sign
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await this.sha256(canonicalRequest)].join("\n")

    // Calculate signature
    const signature = await this.calculateSignature(dateStamp, stringToSign)

    // Build final presigned URL
    const presignedUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}?${canonicalQueryString}&X-Amz-Signature=${signature}`

    return presignedUrl
  }
}
