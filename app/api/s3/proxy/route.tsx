import { type NextRequest, NextResponse } from "next/server"
import { AwsSignatureV4 } from "@/lib/aws-signature-v4"

export async function POST(request: NextRequest) {
  try {
    const { config, method, path } = await request.json()

    console.log("=== S3 API Proxy Request ===")
    console.log("Method:", method)
    console.log("Path:", path)
    console.log("Endpoint:", config.endpoint)
    console.log("Region:", config.region)
    console.log("Access Key:", `${config.accessKeyId?.substring(0, 8)}...`)

    const endpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`
    const url = `${endpoint}${path}`

    console.log("Full URL:", url)

    try {
      // Create AWS Signature V4 signer
      console.log("Creating AWS Signature V4 signer...")
      const signer = new AwsSignatureV4(config.accessKeyId, config.secretAccessKey, config.region)

      // Sign the request
      console.log("Signing request...")
      const signedHeaders = await signer.signRequest(method, url)

      console.log("Signed headers keys:", Object.keys(signedHeaders))
      console.log("Authorization header:", `${signedHeaders.Authorization?.substring(0, 50)}...`)

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method,
        headers: {
          ...signedHeaders,
          "Content-Type": "application/xml",
        },
        signal: AbortSignal.timeout(15000),
      }

      console.log("Making fetch request...")
      console.log("Fetch options:", {
        method: fetchOptions.method,
        headers: Object.keys(fetchOptions.headers as Record<string, string>),
      })

      let response: Response
      try {
        response = await fetch(url, fetchOptions)
      } catch (fetchErr) {
        console.error("Fetch error details:", {
          name: fetchErr instanceof Error ? fetchErr.name : "Unknown",
          message: fetchErr instanceof Error ? fetchErr.message : "Unknown error",
          cause: fetchErr instanceof Error ? fetchErr.cause : undefined,
        })

        // Try without timeout to see if that's the issue
        console.log("Retrying without timeout...")
        try {
          response = await fetch(url, {
            ...fetchOptions,
            signal: undefined,
          })
        } catch (retryErr) {
          console.error("Retry also failed:", retryErr)
          throw fetchErr // Throw original error
        }
      }

      console.log("Response received:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      const responseText = await response.text()
      console.log("Response body length:", responseText.length)
      console.log("Response body preview:", responseText.substring(0, 500))

      // Return the response as-is
      return new NextResponse(responseText, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/xml",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (fetchError) {
      console.error("=== Fetch Error ===")
      console.error("Error type:", fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError)
      console.error("Error message:", fetchError instanceof Error ? fetchError.message : String(fetchError))
      console.error("Error stack:", fetchError instanceof Error ? fetchError.stack : "No stack trace")

      // Check for specific error types
      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError" || fetchError.message.includes("aborted")) {
          return NextResponse.json(
            {
              error: "TimeoutError",
              message: "S3 API isteği zaman aşımına uğradı (15 saniye)",
              details: "Endpoint erişilebilir değil veya yanıt çok yavaş. Endpoint ve ağ bağlantınızı kontrol edin.",
              endpoint: config.endpoint,
            },
            { status: 504 }
          )
        }

        if (
          fetchError.message.includes("ECONNREFUSED") ||
          fetchError.message.includes("ENOTFOUND") ||
          fetchError.message.includes("ETIMEDOUT")
        ) {
          return NextResponse.json(
            {
              error: "ConnectionError",
              message: "S3 endpoint'ine bağlanılamadı",
              details: `Endpoint adresi (${config.endpoint}) erişilebilir değil. DNS çözümlemesi veya ağ bağlantısı sorunlu olabilir.`,
              endpoint: config.endpoint,
            },
            { status: 503 }
          )
        }

        if (
          fetchError.message.includes("certificate") ||
          fetchError.message.includes("SSL") ||
          fetchError.message.includes("TLS")
        ) {
          return NextResponse.json(
            {
              error: "SSLError",
              message: "SSL/TLS sertifika hatası",
              details: "S3 endpoint'inin SSL sertifikası doğrulanamadı. Self-signed sertifika kullanılıyor olabilir.",
              endpoint: config.endpoint,
            },
            { status: 495 }
          )
        }

        if (fetchError.message.includes("Load failed")) {
          return NextResponse.json(
            {
              error: "NetworkError",
              message: "Ağ hatası - İstek tamamlanamadı",
              details:
                "Olası sebepler: 1) Endpoint CORS hatası 2) Firewall/Proxy engeli 3) Endpoint çalışmıyor 4) DNS sorunu",
              endpoint: config.endpoint,
              suggestion:
                "Tarayıcı konsolunda ağ sekmesini kontrol edin veya endpoint'i doğrudan tarayıcıda açmayı deneyin.",
            },
            { status: 500 }
          )
        }
      }

      return NextResponse.json(
        {
          error: "NetworkError",
          message: "S3 API'sine bağlanılamadı",
          details: fetchError instanceof Error ? fetchError.message : "Unknown error",
          errorType: fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError,
          endpoint: config.endpoint,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("=== Proxy Error ===")
    console.error("Error:", error)
    return NextResponse.json(
      {
        error: "ProxyError",
        message: "S3 API proxy hatası",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
