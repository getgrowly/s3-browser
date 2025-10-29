import { useState, useEffect, useMemo } from "react"
import { db } from "@/lib/database"
import type { S3Object, S3Bucket } from "@/types/s3"

export function useSearch(_configId: number | undefined) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching] = useState(false)

  return {
    searchQuery,
    setSearchQuery,
    isSearching,
  }
}

export function useObjectSearch(configId: number | undefined, bucketName: string | null) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<S3Object[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Perform search with 500ms debounce to reduce CPU usage
  useEffect(() => {
    if (!configId || !bucketName || !searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    // Set searching state immediately for UX feedback
    setIsSearching(true)

    // Debounce the actual search by 500ms
    const debounceTimer = setTimeout(async () => {
      try {
        const results = await db.searchObjects(configId, bucketName, searchQuery)
        setSearchResults(results)
      } catch (error) {
        console.error("Search error:", error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 500)

    // Cleanup: cancel pending search if query changes
    return () => {
      clearTimeout(debounceTimer)
      setIsSearching(false)
    }
  }, [configId, bucketName, searchQuery])

  // Memoize the clear function to prevent unnecessary re-renders
  const clearSearch = useMemo(
    () => () => {
      setSearchQuery("")
      setSearchResults([])
    },
    []
  )

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasResults: searchResults.length > 0,
    clearSearch,
  }
}

export function useGlobalObjectSearch(configId: number | undefined) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Array<S3Object & { bucketName: string }>>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!configId || !searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const search = async () => {
      setIsSearching(true)
      try {
        const results = await db.searchAllObjects(configId, searchQuery)
        setSearchResults(results)
      } catch (error) {
        console.error("Global search error:", error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(search, 300)
    return () => clearTimeout(debounceTimer)
  }, [configId, searchQuery])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasResults: searchResults.length > 0,
    clearSearch: () => {
      setSearchQuery("")
      setSearchResults([])
    },
  }
}

export function useBucketSearch(configId: number | undefined) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<S3Bucket[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!configId || !searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const search = async () => {
      setIsSearching(true)
      try {
        const results = await db.searchBuckets(configId, searchQuery)
        setSearchResults(results)
      } catch (error) {
        console.error("Bucket search error:", error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(search, 300)
    return () => clearTimeout(debounceTimer)
  }, [configId, searchQuery])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasResults: searchResults.length > 0,
    clearSearch: () => {
      setSearchQuery("")
      setSearchResults([])
    },
  }
}

