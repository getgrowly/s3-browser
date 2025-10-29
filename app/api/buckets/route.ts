import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  console.log("API /api/buckets GET called")

  try {
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get("configId")

    console.log("Received configId:", configId)

    if (!configId) {
      console.log("No configId provided")
      return NextResponse.json({ error: "Config ID gerekli" }, { status: 400 })
    }

    console.log("Calling db.getBuckets with configId:", Number.parseInt(configId))
    const buckets = await db.getBuckets(Number.parseInt(configId))
    console.log("Database returned buckets:", buckets)

    return NextResponse.json({ buckets })
  } catch (error) {
    console.error("Bucket listesi alınırken hata:", error)
    return NextResponse.json({ error: "Bucket listesi alınamadı" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log("API /api/buckets POST called")

  try {
    const body = await request.json()
    console.log("Request body:", body)

    const { configId, bucketName } = body

    if (!configId || !bucketName) {
      return NextResponse.json({ error: "Config ID ve bucket adı gerekli" }, { status: 400 })
    }

    // Validate bucket name
    if (!bucketName || bucketName.length < 3) {
      return NextResponse.json({ error: "Bucket adı en az 3 karakter olmalıdır" }, { status: 400 })
    }

    if (!/^[a-z0-9.-]+$/.test(bucketName)) {
      return NextResponse.json(
        { error: "Bucket adı sadece küçük harf, rakam, nokta ve tire içerebilir" },
        { status: 400 },
      )
    }

    if (bucketName.startsWith(".") || bucketName.endsWith(".")) {
      return NextResponse.json({ error: "Bucket adı nokta ile başlayamaz veya bitemez" }, { status: 400 })
    }

    // Check if bucket already exists
    const bucketExists = await db.bucketExists(configId, bucketName)
    if (bucketExists) {
      return NextResponse.json({ error: "Bu isimde bir bucket zaten mevcut" }, { status: 409 })
    }

    // Create new bucket
    const newBucket = {
      Name: bucketName,
      CreationDate: new Date(),
    }

    console.log("Creating bucket:", newBucket)
    await db.saveBucket(configId, newBucket)

    return NextResponse.json({ bucket: newBucket }, { status: 201 })
  } catch (error) {
    console.error("Bucket oluşturulurken hata:", error)
    return NextResponse.json({ error: "Bucket oluşturulamadı" }, { status: 500 })
  }
}
