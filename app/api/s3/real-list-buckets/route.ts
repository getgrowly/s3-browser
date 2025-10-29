import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()
    console.log("Real S3 API call with config:", {
      endpoint: config.endpoint,
      region: config.region,
      accessKeyId: `${config.accessKeyId?.substring(0, 8)}...`,
    })

    // Gerçek S3 API çağrısı yapalım
    const s3Endpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`

    // AWS Signature v4 oluşturalım
    const now = new Date()
    const dateStamp = now.toISOString().split("T")[0].replace(/-/g, "")
    const timeStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, "")

    // Canonical request oluştur
    const canonicalRequest = [
      "GET",
      "/",
      "",
      `host:${new URL(s3Endpoint).host}`,
      `x-amz-date:${timeStamp}`,
      "",
      "host;x-amz-date",
      "UNSIGNED-PAYLOAD",
    ].join("\n")

    // String to sign oluştur
    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`
    const stringToSign = ["AWS4-HMAC-SHA256", timeStamp, credentialScope, await sha256(canonicalRequest)].join("\n")

    // Signature hesapla
    const signature = await calculateSignature(config.secretAccessKey, dateStamp, config.region, stringToSign)

    // Authorization header oluştur
    const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-date, Signature=${signature}`

    console.log("Making real S3 API call to:", s3Endpoint)

    // Gerçek S3 API çağrısı
    const response = await fetch(s3Endpoint, {
      method: "GET",
      headers: {
        Host: new URL(s3Endpoint).host,
        "X-Amz-Date": timeStamp,
        Authorization: authorization,
        "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
      },
    })

    console.log("S3 API Response status:", response.status)
    console.log("S3 API Response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("S3 API Error:", errorText)

      // Hata durumunda boş liste döndür
      return NextResponse.json({
        Buckets: [],
        Owner: {
          DisplayName: "S3 User",
          ID: config.accessKeyId,
        },
        error: `S3 API Error: ${response.status} - ${errorText.substring(0, 200)}`,
        isReal: false,
      })
    }

    // XML response'u parse et
    const xmlText = await response.text()
    console.log("S3 API XML Response:", `${xmlText.substring(0, 500)}...`)

    // Basit XML parsing (gerçek projede xml2js kullanın)
    const buckets = parseS3BucketsXML(xmlText)

    return NextResponse.json({
      Buckets: buckets,
      Owner: {
        DisplayName: "S3 User",
        ID: config.accessKeyId,
      },
      isReal: true,
    })
  } catch (error) {
    console.error("Real S3 API call failed:", error)

    // Hata durumunda boş liste döndür
    return NextResponse.json({
      Buckets: [],
      Owner: {
        DisplayName: "S3 User",
        ID: "unknown",
      },
      error: error instanceof Error ? error.message : "Unknown error",
      isReal: false,
    })
  }
}

// SHA256 hash fonksiyonu
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// AWS Signature v4 hesaplama
async function calculateSignature(
  secretKey: string,
  dateStamp: string,
  region: string,
  stringToSign: string
): Promise<string> {
  const kDate = await hmacSha256(`AWS4${secretKey}`, dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, "s3")
  const kSigning = await hmacSha256(kService, "aws4_request")
  const signature = await hmacSha256(kSigning, stringToSign)

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// HMAC-SHA256 fonksiyonu
async function hmacSha256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const keyBuffer = typeof key === "string" ? new TextEncoder().encode(key) : key
  const messageBuffer = new TextEncoder().encode(message)

  const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])

  return await crypto.subtle.sign("HMAC", cryptoKey, messageBuffer)
}

// Basit S3 XML parser
function parseS3BucketsXML(xmlText: string): any[] {
  const buckets: any[] = []

  // Basit regex ile bucket'ları parse et
  const bucketMatches = xmlText.match(/<Bucket>[\s\S]*?<\/Bucket>/g) || []

  for (const bucketMatch of bucketMatches) {
    const nameMatch = bucketMatch.match(/<Name>(.*?)<\/Name>/)
    const dateMatch = bucketMatch.match(/<CreationDate>(.*?)<\/CreationDate>/)

    if (nameMatch && dateMatch) {
      buckets.push({
        Name: nameMatch[1],
        CreationDate: new Date(dateMatch[1]),
      })
    }
  }

  return buckets
}
