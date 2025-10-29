import type { S3Config, S3Bucket, S3Object } from "@/types/s3"
import { S3ClientBrowser } from "./s3-client-browser"

export class S3Service {
  private client: S3ClientBrowser

  constructor(config: S3Config) {
    // Always use browser client for direct CORS requests
    this.client = new S3ClientBrowser(config)
  }

  async testConnection(): Promise<boolean> {
    console.log("S3Service.testConnection - Testing connection")
    return await this.client.testConnection()
  }

  async listBuckets(): Promise<S3Bucket[]> {
    console.log("S3Service.listBuckets - Listing buckets")
    return await this.client.listBuckets()
  }

  async createBucket(bucketName: string): Promise<S3Bucket> {
    console.log("S3Service.createBucket - Creating bucket:", bucketName)
    return await this.client.createBucket(bucketName)
  }

  async deleteBucket(bucketName: string): Promise<void> {
    console.log("S3Service.deleteBucket - Deleting bucket:", bucketName)
    await this.client.deleteBucket(bucketName)
  }

  async listObjects(bucketName: string, prefix?: string): Promise<S3Object[]> {
    console.log("S3Service.listObjects - Listing objects:", { bucketName, prefix })
    return await this.client.listObjects(bucketName, prefix)
  }

  async uploadFile(
    bucketName: string,
    key: string,
    file: File,
    onProgress?: (progress: number, loaded: number, total: number) => void
  ): Promise<void> {
    console.log("S3Service.uploadFile - Uploading file:", { bucketName, key, size: file.size })
    await this.client.putObject(bucketName, key, file, onProgress)
  }

  async deleteObject(bucketName: string, key: string): Promise<void> {
    console.log("S3Service.deleteObject - Deleting object:", { bucketName, key })
    await this.client.deleteObject(bucketName, key)
  }

  async getSignedUrl(bucketName: string, key: string): Promise<string> {
    console.log("S3Service.getSignedUrl - Generating signed URL:", { bucketName, key })
    return await this.client.getSignedUrl(bucketName, key)
  }

  getPublicUrl(bucketName: string, key: string): string {
    console.log("S3Service.getPublicUrl - Generating public URL:", { bucketName, key })
    return this.client.getPublicUrl(bucketName, key)
  }
}
