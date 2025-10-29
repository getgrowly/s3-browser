import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get("configId")
    const bucketName = searchParams.get("bucketName")
    const prefix = searchParams.get("prefix")

    if (!configId || !bucketName) {
      return NextResponse.json({ error: "Config ID ve bucket adı gerekli" }, { status: 400 })
    }

    // Check if bucket exists
    const bucketExists = await db.bucketExists(Number.parseInt(configId), bucketName)
    if (!bucketExists) {
      return NextResponse.json({ error: `Bucket '${bucketName}' bulunamadı` }, { status: 404 })
    }

    let objects = await db.getObjects(Number.parseInt(configId), bucketName)

    // Filter by prefix if provided
    if (prefix) {
      objects = objects.filter((obj) => obj.Key.startsWith(prefix))
    }

    return NextResponse.json({ objects })
  } catch (error) {
    console.error("Object listesi alınırken hata:", error)
    return NextResponse.json({ error: "Object listesi alınamadı" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const configId = formData.get("configId") as string
    const bucketName = formData.get("bucketName") as string
    const file = formData.get("file") as File

    if (!configId || !bucketName || !file) {
      return NextResponse.json({ error: "Config ID, bucket adı ve dosya gerekli" }, { status: 400 })
    }

    // Validate file size
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "Dosya çok büyük (maksimum 100MB)" }, { status: 400 })
    }

    // Check if bucket exists
    const bucketExists = await db.bucketExists(Number.parseInt(configId), bucketName)
    if (!bucketExists) {
      return NextResponse.json({ error: `Bucket '${bucketName}' bulunamadı` }, { status: 404 })
    }

    // Create the uploaded file object
    const newObject = {
      Key: file.name,
      LastModified: new Date(),
      Size: file.size,
      ETag: `"${Math.random().toString(36).substring(7)}"`,
      StorageClass: "STANDARD",
    }

    // Save to database
    await db.saveObject(Number.parseInt(configId), bucketName, newObject)

    return NextResponse.json({ object: newObject }, { status: 201 })
  } catch (error) {
    console.error("Dosya yüklenirken hata:", error)
    return NextResponse.json({ error: "Dosya yüklenemedi" }, { status: 500 })
  }
}
