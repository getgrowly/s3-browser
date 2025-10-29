import type { S3Config, S3Bucket, S3Object } from "@/types/s3"
import { S3Service } from "./s3-service"

class ApiClient {
  async testConnection(config: S3Config): Promise<boolean> {
    console.log("ApiClient.testConnection - Testing connection")
    try {
      const s3Service = new S3Service(config)
      return await s3Service.testConnection()
    } catch (error) {
      console.error("ApiClient.testConnection - Error:", error)
      return false
    }
  }

  async getBuckets(config: S3Config): Promise<S3Bucket[]> {
    console.log("ApiClient.getBuckets - Starting request")
    try {
      const s3Service = new S3Service(config)
      const buckets = await s3Service.listBuckets()
      console.log("ApiClient.getBuckets - Success:", buckets.length, "buckets")
      return buckets
    } catch (error) {
      console.error("ApiClient.getBuckets - Error:", error)
      throw error
    }
  }

  async createBucket(config: S3Config, bucketName: string): Promise<S3Bucket> {
    console.log("ApiClient.createBucket - Creating bucket:", bucketName)
    try {
      const s3Service = new S3Service(config)
      const bucket = await s3Service.createBucket(bucketName)
      console.log("ApiClient.createBucket - Success:", bucket)
      return bucket
    } catch (error) {
      console.error("ApiClient.createBucket - Error:", error)
      throw error
    }
  }

  async deleteBucket(config: S3Config, bucketName: string): Promise<void> {
    console.log("ApiClient.deleteBucket - Deleting bucket:", bucketName)
    try {
      const s3Service = new S3Service(config)
      await s3Service.deleteBucket(bucketName)
      console.log("ApiClient.deleteBucket - Success")
    } catch (error) {
      console.error("ApiClient.deleteBucket - Error:", error)
      throw error
    }
  }

  async getObjects(config: S3Config, bucketName: string, prefix?: string): Promise<S3Object[]> {
    console.log("ApiClient.getObjects - Listing objects:", { bucketName, prefix })
    try {
      const s3Service = new S3Service(config)
      const objects = await s3Service.listObjects(bucketName, prefix)
      console.log("ApiClient.getObjects - Success:", objects.length, "objects")
      return objects
    } catch (error) {
      console.error("ApiClient.getObjects - Error:", error)
      throw error
    }
  }

  async uploadFile(config: S3Config, bucketName: string, file: File): Promise<S3Object> {
    console.log("ApiClient.uploadFile - Uploading file:", { bucketName, fileName: file.name, size: file.size })
    try {
      const s3Service = new S3Service(config)
      await s3Service.uploadFile(bucketName, file.name, file)
      console.log("ApiClient.uploadFile - Success")

      // Yüklenen dosya bilgilerini döndür
      return {
        Key: file.name,
        LastModified: new Date(),
        Size: file.size,
        ETag: `"${Math.random().toString(36).substring(7)}"`,
        StorageClass: "STANDARD",
      }
    } catch (error) {
      console.error("ApiClient.uploadFile - Error:", error)
      throw error
    }
  }

  async deleteObject(config: S3Config, bucketName: string, objectKey: string): Promise<void> {
    console.log("ApiClient.deleteObject - Deleting object:", { bucketName, objectKey })
    try {
      const s3Service = new S3Service(config)
      await s3Service.deleteObject(bucketName, objectKey)
      console.log("ApiClient.deleteObject - Success")
    } catch (error) {
      console.error("ApiClient.deleteObject - Error:", error)
      throw error
    }
  }

  async getSignedUrl(config: S3Config, bucketName: string, objectKey: string): Promise<string> {
    console.log("ApiClient.getSignedUrl - Generating signed URL:", { bucketName, objectKey })
    try {
      const s3Service = new S3Service(config)
      const url = await s3Service.getSignedUrl(bucketName, objectKey)
      console.log("ApiClient.getSignedUrl - Success")
      return url
    } catch (error) {
      console.error("ApiClient.getSignedUrl - Error:", error)
      throw error
    }
  }

  async getPublicUrl(config: S3Config, bucketName: string, objectKey: string): Promise<string> {
    console.log("ApiClient.getPublicUrl - Generating public URL:", { bucketName, objectKey })
    try {
      const s3Service = new S3Service(config)
      const url = s3Service.getPublicUrl(bucketName, objectKey)
      console.log("ApiClient.getPublicUrl - Success")
      return url
    } catch (error) {
      console.error("ApiClient.getPublicUrl - Error:", error)
      throw error
    }
  }
}

export const apiClient = new ApiClient()
