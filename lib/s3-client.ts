import type { S3Config, S3Bucket, S3Object } from "@/types/s3"

export class S3Client {
  private config: S3Config

  constructor(config: S3Config) {
    this.config = config
  }

  async listBuckets(): Promise<S3Bucket[]> {
    console.log("S3Client.listBuckets - Starting request")

    try {
      const response = await this.makeS3Request("GET", "/")
      console.log("S3Client.listBuckets - Response received:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`S3 API Error: ${response.status} - ${errorText}`)
      }

      const xmlText = await response.text()
      const buckets = this.parseS3BucketsXML(xmlText)
      console.log("S3Client.listBuckets - Successfully parsed buckets:", buckets.length)
      return buckets
    } catch (error) {
      console.error("S3Client.listBuckets - Error:", error)
      throw error
    }
  }

  async createBucket(bucketName: string): Promise<S3Bucket> {
    console.log("S3Client.createBucket - Creating bucket:", bucketName)

    try {
      const response = await this.makeS3Request("PUT", `/${bucketName}`)
      console.log("S3Client.createBucket - Response:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Bucket oluşturulamadı: ${response.status} - ${errorText}`)
      }

      return {
        Name: bucketName,
        CreationDate: new Date(),
      }
    } catch (error) {
      console.error("S3Client.createBucket - Error:", error)
      throw error
    }
  }

  async deleteBucket(bucketName: string): Promise<void> {
    console.log("S3Client.deleteBucket - Deleting bucket:", bucketName)

    try {
      const response = await this.makeS3Request("DELETE", `/${bucketName}`)
      console.log("S3Client.deleteBucket - Response:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Bucket silinemedi: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("S3Client.deleteBucket - Error:", error)
      throw error
    }
  }

  async listObjects(bucketName: string, prefix?: string): Promise<S3Object[]> {
    console.log("S3Client.listObjects - Listing objects:", { bucketName, prefix })

    try {
      const path = `/${bucketName}?list-type=2${prefix ? `&prefix=${encodeURIComponent(prefix)}` : ""}`
      const response = await this.makeS3Request("GET", path)
      console.log("S3Client.listObjects - Response:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Dosya listesi alınamadı: ${response.status} - ${errorText}`)
      }

      const xmlText = await response.text()
      const objects = this.parseS3ObjectsXML(xmlText)
      console.log("S3Client.listObjects - Parsed objects:", objects.length)
      return objects
    } catch (error) {
      console.error("S3Client.listObjects - Error:", error)
      throw error
    }
  }

  async putObject(bucketName: string, key: string, file: File): Promise<void> {
    console.log("S3Client.putObject - Uploading file:", { bucketName, key, size: file.size })

    try {
      const response = await this.makeS3Request("PUT", `/${bucketName}/${encodeURIComponent(key)}`)
      console.log("S3Client.putObject - Response:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Dosya yüklenemedi: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("S3Client.putObject - Error:", error)
      throw error
    }
  }

  async deleteObject(bucketName: string, key: string): Promise<void> {
    console.log("S3Client.deleteObject - Deleting object:", { bucketName, key })

    try {
      const response = await this.makeS3Request("DELETE", `/${bucketName}/${encodeURIComponent(key)}`)
      console.log("S3Client.deleteObject - Response:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Dosya silinemedi: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("S3Client.deleteObject - Error:", error)
      throw error
    }
  }

  async getSignedUrl(bucketName: string, key: string, expiresIn = 3600): Promise<string> {
    console.log("S3Client.getSignedUrl - Generating signed URL:", { bucketName, key })

    const baseUrl = this.config.endpoint || `https://${bucketName}.s3.${this.config.region}.amazonaws.com`
    const encodedKey = encodeURIComponent(key)
    const timestamp = Math.floor(Date.now() / 1000)

    // In production, this should use proper AWS Signature V4
    const signedUrl = `${baseUrl}/${encodedKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expiresIn}&X-Amz-Timestamp=${timestamp}`

    return signedUrl
  }

  getPublicUrl(bucketName: string, key: string): string {
    const baseUrl = this.config.endpoint || `https://${bucketName}.s3.${this.config.region}.amazonaws.com`
    return `${baseUrl}/${encodeURIComponent(key)}`
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log("S3Client.testConnection - Testing connection")
      const response = await fetch("/api/s3/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: this.config,
        }),
      })

      const data = await response.json()
      console.log("S3Client.testConnection - Result:", data)

      return data.success === true
    } catch (error) {
      console.error("S3Client.testConnection - Error:", error)
      return false
    }
  }

  private async makeS3Request(method: string, path: string): Promise<Response> {
    console.log("S3Client.makeS3Request - Making request:", { method, path })

    const response = await fetch("/api/s3/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: this.config,
        method,
        path,
      }),
    })

    console.log("S3Client.makeS3Request - Proxy response:", {
      status: response.status,
      ok: response.ok,
    })

    return response
  }

  private parseS3BucketsXML(xml: string): S3Bucket[] {
    if (!xml || xml.trim() === "") {
      throw new Error("Empty XML response")
    }

    const buckets: S3Bucket[] = []
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")

    const parseError = doc.querySelector("parsererror")
    if (parseError) {
      throw new Error("Invalid XML response")
    }

    const errorNode = doc.querySelector("Error")
    if (errorNode) {
      const code = errorNode.querySelector("Code")?.textContent
      const message = errorNode.querySelector("Message")?.textContent
      throw new Error(`S3 API Error: ${code} - ${message}`)
    }

    const bucketNodes = doc.querySelectorAll("Bucket")
    bucketNodes.forEach((bucketNode) => {
      const name = bucketNode.querySelector("Name")?.textContent
      const creationDate = bucketNode.querySelector("CreationDate")?.textContent

      if (name && creationDate) {
        buckets.push({
          Name: name,
          CreationDate: new Date(creationDate),
        })
      }
    })

    return buckets
  }

  private parseS3ObjectsXML(xml: string): S3Object[] {
    if (!xml || xml.trim() === "") {
      throw new Error("Empty XML response")
    }

    const objects: S3Object[] = []
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")

    const parseError = doc.querySelector("parsererror")
    if (parseError) {
      throw new Error("Invalid XML response")
    }

    const errorNode = doc.querySelector("Error")
    if (errorNode) {
      const code = errorNode.querySelector("Code")?.textContent
      const message = errorNode.querySelector("Message")?.textContent
      throw new Error(`S3 API Error: ${code} - ${message}`)
    }

    const contentNodes = doc.querySelectorAll("Contents")
    contentNodes.forEach((contentNode) => {
      const key = contentNode.querySelector("Key")?.textContent
      const lastModified = contentNode.querySelector("LastModified")?.textContent
      const size = contentNode.querySelector("Size")?.textContent
      const eTag = contentNode.querySelector("ETag")?.textContent
      const storageClass = contentNode.querySelector("StorageClass")?.textContent

      if (key && lastModified && size && eTag && storageClass) {
        objects.push({
          Key: key,
          LastModified: new Date(lastModified),
          Size: Number.parseInt(size, 10),
          ETag: eTag,
          StorageClass: storageClass,
        })
      }
    })

    return objects
  }
}
