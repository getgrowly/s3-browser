import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ bucketName: string }> }) {
  try {
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get("configId")

    if (!configId) {
      return NextResponse.json({ error: "Config ID gerekli" }, { status: 400 })
    }

    const { bucketName } = await params

    // Check if bucket has objects
    const objects = await db.getObjects(Number.parseInt(configId), bucketName)
    if (objects.length > 0) {
      return NextResponse.json({ error: "Bucket silinmeden önce içindeki tüm dosyalar silinmelidir" }, { status: 400 })
    }

    // Check if bucket exists
    const bucketExists = await db.bucketExists(Number.parseInt(configId), bucketName)
    if (!bucketExists) {
      return NextResponse.json({ error: "Bucket bulunamadı" }, { status: 404 })
    }

    // Delete bucket
    await db.deleteBucket(Number.parseInt(configId), bucketName)

    return NextResponse.json({ message: "Bucket başarıyla silindi" })
  } catch (error) {
    console.error("Bucket silinirken hata:", error)
    return NextResponse.json({ error: "Bucket silinemedi" }, { status: 500 })
  }
}
