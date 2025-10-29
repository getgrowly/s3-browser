import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { bucketName, prefix } = await request.json()
    console.log("S3 List Objects called:", { bucketName, prefix })

    // Simulate AWS S3 SDK call
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Mock objects for demo
    const mockObjects = [
      {
        Key: "documents/report.pdf",
        LastModified: new Date("2024-02-15T10:30:00Z"),
        Size: 1024000,
        ETag: '"d41d8cd98f00b204e9800998ecf8427e"',
        StorageClass: "STANDARD",
      },
      {
        Key: "images/photo1.jpg",
        LastModified: new Date("2024-02-14T15:20:00Z"),
        Size: 2048000,
        ETag: '"098f6bcd4621d373cade4e832627b4f6"',
        StorageClass: "STANDARD",
      },
      {
        Key: "data/export.csv",
        LastModified: new Date("2024-02-13T09:15:00Z"),
        Size: 512000,
        ETag: '"5d41402abc4b2a76b9719d911017c592"',
        StorageClass: "STANDARD",
      },
    ]

    // Filter by prefix if provided
    const filteredObjects = prefix ? mockObjects.filter((obj) => obj.Key.startsWith(prefix)) : mockObjects

    return NextResponse.json({
      Contents: filteredObjects,
      Name: bucketName,
      Prefix: prefix || "",
      MaxKeys: 1000,
      IsTruncated: false,
    })
  } catch (error) {
    console.error("S3 List Objects error:", error)
    return NextResponse.json(
      { message: "Failed to list objects", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
