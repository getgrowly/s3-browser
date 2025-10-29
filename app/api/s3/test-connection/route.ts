import { type NextRequest, NextResponse } from "next/server"
import { AwsSignatureV4 } from "@/lib/aws-signature-v4"

export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json()

    console.log("Testing S3 connection:", {
      endpoint: config.endpoint,
      region: config.region,
      accessKeyId: `${config.accessKeyId?.substring(0, 8)}...`,
    })

    try {
      const endpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`

      // Create AWS Signature V4 signer
      const signer = new AwsSignatureV4(config.accessKeyId, config.secretAccessKey, config.region)

      // Sign the request
      const headers = await signer.signRequest("GET", `${endpoint}/`)

      // Make a simple GET request with proper authentication
      const response = await fetch(`${endpoint}/`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      console.log("Connection test response:", {
        status: response.status,
        statusText: response.statusText,
      })

      // S3 API should return 200 OK if credentials are valid
      const isReachable = response.status === 200

      return NextResponse.json({
        success: isReachable,
        message: isReachable ? "S3 connection successful" : `Connection failed: ${response.status}`,
        status: response.status,
      })
    } catch (fetchError) {
      console.error("Connection test fetch error:", fetchError)

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          return NextResponse.json({
            success: false,
            message: "Connection timeout",
            error: "Request timed out after 5 seconds",
          })
        }
      }

      return NextResponse.json({
        success: false,
        message: "Connection failed",
        error: fetchError instanceof Error ? fetchError.message : "Unknown error",
      })
    }
  } catch (error) {
    console.error("Test connection error:", error)
    return NextResponse.json({
      success: false,
      message: "Connection test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
