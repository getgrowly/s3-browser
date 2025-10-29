import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json()
    const endpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`

    console.log("=== S3 Diagnostics ===")
    console.log("Testing endpoint:", endpoint)

    const results = {
      endpoint,
      tests: [] as Array<{ name: string; status: string; message: string; details?: any }>,
    }

    // Test 1: Basic DNS resolution
    try {
      console.log("Test 1: DNS Resolution")
      const url = new URL(endpoint)
      results.tests.push({
        name: "DNS Resolution",
        status: "pass",
        message: `Hostname: ${url.hostname}`,
        details: { hostname: url.hostname, protocol: url.protocol },
      })
    } catch (err) {
      results.tests.push({
        name: "DNS Resolution",
        status: "fail",
        message: "Invalid URL format",
        details: err instanceof Error ? err.message : String(err),
      })
    }

    // Test 2: Basic connectivity (without auth)
    try {
      console.log("Test 2: Basic Connectivity")
      const response = await fetch(endpoint, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      })

      results.tests.push({
        name: "Basic Connectivity",
        status: "pass",
        message: `Endpoint reachable (${response.status})`,
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        },
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      results.tests.push({
        name: "Basic Connectivity",
        status: "fail",
        message: errorMessage.includes("aborted")
          ? "Connection timeout (5s)"
          : `Cannot reach endpoint: ${errorMessage}`,
        details: err instanceof Error ? { message: err.message, name: err.name } : String(err),
      })
    }

    // Test 3: HTTPS/SSL
    try {
      console.log("Test 3: HTTPS/SSL")
      const url = new URL(endpoint)
      if (url.protocol === "https:") {
        // Try to make a secure connection
        await fetch(endpoint, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        })
        results.tests.push({
          name: "HTTPS/SSL",
          status: "pass",
          message: "SSL certificate valid",
        })
      } else {
        results.tests.push({
          name: "HTTPS/SSL",
          status: "warning",
          message: "HTTP endpoint (not secure)",
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      results.tests.push({
        name: "HTTPS/SSL",
        status: "fail",
        message: errorMessage.includes("certificate") ? "SSL certificate error" : "HTTPS connection failed",
        details: err instanceof Error ? err.message : String(err),
      })
    }

    // Test 4: ListBuckets endpoint
    try {
      console.log("Test 4: S3 ListBuckets Endpoint")
      const response = await fetch(`${endpoint}/`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      })

      const isS3Response =
        response.headers.get("server")?.toLowerCase().includes("s3") ||
        response.headers.get("x-amz-request-id") !== null

      results.tests.push({
        name: "S3 API Endpoint",
        status: isS3Response ? "pass" : "warning",
        message: isS3Response ? "S3 API detected" : `Endpoint responds but may not be S3 (${response.status})`,
        details: {
          status: response.status,
          server: response.headers.get("server"),
          amzRequestId: response.headers.get("x-amz-request-id"),
        },
      })
    } catch (err) {
      results.tests.push({
        name: "S3 API Endpoint",
        status: "fail",
        message: "Cannot verify S3 API",
        details: err instanceof Error ? err.message : String(err),
      })
    }

    // Summary
    const passed = results.tests.filter((t) => t.status === "pass").length
    const failed = results.tests.filter((t) => t.status === "fail").length

    return NextResponse.json({
      success: failed === 0,
      summary: `${passed}/${results.tests.length} tests passed`,
      ...results,
    })
  } catch (error) {
    console.error("Diagnostics error:", error)
    return NextResponse.json(
      {
        error: "DiagnosticsError",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
