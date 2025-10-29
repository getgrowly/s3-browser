import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ objectKey: string }> }) {
  try {
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get("configId")
    const bucketName = searchParams.get("bucketName")

    if (!configId || !bucketName) {
      return NextResponse.json({ error: "Config ID ve bucket adı gerekli" }, { status: 400 })
    }

    const { objectKey: rawObjectKey } = await params
    const objectKey = decodeURIComponent(rawObjectKey)

    // Check if bucket exists
    const bucketExists = await db.bucketExists(Number.parseInt(configId), bucketName)
    if (!bucketExists) {
      return NextResponse.json({ error: `Bucket '${bucketName}' bulunamadı` }, { status: 404 })
    }

    // Delete object
    await db.deleteObject(Number.parseInt(configId), bucketName, objectKey)

    return NextResponse.json({ message: "Dosya başarıyla silindi" })
  } catch (error) {
    console.error("Dosya silinirken hata:", error)
    return NextResponse.json({ error: "Dosya silinemedi" }, { status: 500 })
  }
}
