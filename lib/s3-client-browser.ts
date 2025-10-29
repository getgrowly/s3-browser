import type { S3Config, S3Bucket, S3Object } from "@/types/s3"
import { AwsSignatureV4 } from "@/lib/aws-signature-v4"

export class S3ClientBrowser {
  private config: S3Config
  private signer: AwsSignatureV4

  constructor(config: S3Config) {
    this.config = config
    this.signer = new AwsSignatureV4(config.accessKeyId, config.secretAccessKey, config.region)
  }

  async listBuckets(): Promise<S3Bucket[]> {
    console.log("S3ClientBrowser.listBuckets - Starting direct browser request")

    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
    const url = `${endpoint}/`

    try {
      // Sign the request
      const headers = await this.signer.signRequest("GET", url)

      console.log("Making direct fetch from browser...")
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...headers,
        },
        mode: "cors",
      })

      console.log("Browser response:", {
        status: response.status,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`S3 API Error: ${response.status} - ${errorText.substring(0, 200)}`)
      }

      const xmlText = await response.text()
      return this.parseS3BucketsXML(xmlText)
    } catch (error) {
      console.error("S3ClientBrowser.listBuckets - Error:", error)

      // Provide more helpful error messages
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        throw new Error(
          "CORS hatası: S3 endpoint'i tarayıcıdan erişime izin vermiyor. Bu endpoint'in CORS ayarlarını kontrol edin veya sunucu taraflı proxy kullanın.",
        )
      }

      throw error
    }
  }

  async createBucket(bucketName: string): Promise<S3Bucket> {
    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
    const url = `${endpoint}/${bucketName}`

    const headers = await this.signer.signRequest("PUT", url)

    const response = await fetch(url, {
      method: "PUT",
      headers,
      mode: "cors",
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Bucket oluşturulamadı: ${response.status} - ${errorText}`)
    }

    return {
      Name: bucketName,
      CreationDate: new Date(),
    }
  }

  async deleteBucket(bucketName: string): Promise<void> {
    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
    const url = `${endpoint}/${bucketName}`

    const headers = await this.signer.signRequest("DELETE", url)

    const response = await fetch(url, {
      method: "DELETE",
      headers,
      mode: "cors",
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Bucket silinemedi: ${response.status} - ${errorText}`)
    }
  }

  async listObjects(bucketName: string, prefix?: string): Promise<S3Object[]> {
    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
    const path = `/${bucketName}?list-type=2${prefix ? `&prefix=${encodeURIComponent(prefix)}` : ""}`
    const url = `${endpoint}${path}`

    const headers = await this.signer.signRequest("GET", url)

    const response = await fetch(url, {
      method: "GET",
      headers,
      mode: "cors",
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Dosya listesi alınamadı: ${response.status} - ${errorText}`)
    }

    const xmlText = await response.text()
    return this.parseS3ObjectsXML(xmlText)
  }

  async putObject(
    bucketName: string,
    key: string,
    file: File,
    onProgress?: (progress: number, loaded: number, total: number) => void
  ): Promise<void> {
    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
    const url = `${endpoint}/${bucketName}/${encodeURIComponent(key)}`

    const headers = await this.signer.signRequest("PUT", url)

    // Use XMLHttpRequest for upload progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100)
            onProgress(progress, e.loaded, e.total)
          }
        })
      }

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Dosya yüklenemedi: ${xhr.status} - ${xhr.responseText}`))
        }
      })

      // Handle errors
      xhr.addEventListener("error", () => {
        reject(new Error("Dosya yüklenirken ağ hatası oluştu"))
      })

      xhr.addEventListener("abort", () => {
        reject(new Error("Dosya yükleme iptal edildi"))
      })

      // Open connection and set headers
      xhr.open("PUT", url)
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value)
      }

      // Send file
      xhr.send(file)
    })
  }

  async deleteObject(bucketName: string, key: string): Promise<void> {
    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
    const url = `${endpoint}/${bucketName}/${encodeURIComponent(key)}`

    const headers = await this.signer.signRequest("DELETE", url)

    const response = await fetch(url, {
      method: "DELETE",
      headers,
      mode: "cors",
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Dosya silinemedi: ${response.status} - ${errorText}`)
    }
  }

  async getSignedUrl(bucketName: string, key: string, expiresIn = 3600): Promise<string> {
    // For custom endpoints, use path-style: endpoint/bucket/key
    // For AWS S3, use virtual-hosted style: bucket.s3.region.amazonaws.com/key
    let baseUrl: string
    if (this.config.endpoint) {
      // Path-style for custom endpoints
      baseUrl = `${this.config.endpoint}/${bucketName}/${key}`
    } else {
      // Virtual-hosted style for AWS S3
      baseUrl = `https://${bucketName}.s3.${this.config.region}.amazonaws.com/${key}`
    }
    
    console.log("S3ClientBrowser.getSignedUrl - Base URL:", baseUrl)
    
    // Generate properly signed presigned URL using AWS Signature V4
    const signedUrl = await this.signer.generatePresignedUrl('GET', baseUrl, expiresIn)
    
    console.log("S3ClientBrowser.getSignedUrl - Signed URL:", signedUrl)
    return signedUrl
  }

  getPublicUrl(bucketName: string, key: string): string {
    // For custom endpoints, use path-style: endpoint/bucket/key
    // For AWS S3, use virtual-hosted style: bucket.s3.region.amazonaws.com/key
    if (this.config.endpoint) {
      // Path-style for custom endpoints
      return `${this.config.endpoint}/${bucketName}/${key}`
    } else {
      // Virtual-hosted style for AWS S3
      return `https://${bucketName}.s3.${this.config.region}.amazonaws.com/${key}`
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.listBuckets()
      return true
    } catch (error) {
      console.error("Connection test failed:", error)
      return false
    }
  }

  private parseS3BucketsXML(xml: string): S3Bucket[] {
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
