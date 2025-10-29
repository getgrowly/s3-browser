import { describe, it, expect, beforeEach } from "vitest"
import { useAppStore } from "@/lib/store"
import type { S3Config } from "@/types/s3"

describe("store", () => {
  beforeEach(() => {
    // Reset store before each test
    useAppStore.getState().reset()
  })

  describe("view management", () => {
    it("should set view correctly", () => {
      const { setView, view } = useAppStore.getState()
      expect(view).toBe("dashboard")

      setView("buckets")
      expect(useAppStore.getState().view).toBe("buckets")
    })
  })

  describe("configuration management", () => {
    it("should add configuration", () => {
      const config: S3Config = {
        id: 1,
        name: "Test Config",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        region: "us-east-1",
      }

      const { addConfig } = useAppStore.getState()
      addConfig(config)

      const { configs } = useAppStore.getState()
      expect(configs).toHaveLength(1)
      expect(configs[0]).toEqual(config)
    })

    it("should update configuration", () => {
      const config: S3Config = {
        id: 1,
        name: "Test Config",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        region: "us-east-1",
      }

      const { addConfig, updateConfig } = useAppStore.getState()
      addConfig(config)

      updateConfig(1, { name: "Updated Config" })

      const { configs } = useAppStore.getState()
      expect(configs[0].name).toBe("Updated Config")
    })

    it("should delete configuration", () => {
      const config: S3Config = {
        id: 1,
        name: "Test Config",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        region: "us-east-1",
      }

      const { addConfig, deleteConfig } = useAppStore.getState()
      addConfig(config)

      deleteConfig(1)

      const { configs } = useAppStore.getState()
      expect(configs).toHaveLength(0)
    })
  })

  describe("navigation helpers", () => {
    it("should navigate to buckets", () => {
      const config: S3Config = {
        id: 1,
        name: "Test Config",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        region: "us-east-1",
      }

      const { navigateToBuckets } = useAppStore.getState()
      navigateToBuckets(config)

      const state = useAppStore.getState()
      expect(state.view).toBe("buckets")
      expect(state.selectedConfig).toEqual(config)
      expect(state.selectedBucket).toBeNull()
    })

    it("should navigate to files", () => {
      const config: S3Config = {
        id: 1,
        name: "Test Config",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        region: "us-east-1",
      }

      const { navigateToFiles } = useAppStore.getState()
      navigateToFiles(config, "my-bucket")

      const state = useAppStore.getState()
      expect(state.view).toBe("files")
      expect(state.selectedConfig).toEqual(config)
      expect(state.selectedBucket).toBe("my-bucket")
    })

    it("should navigate back from files", () => {
      const { navigateBackFromFiles } = useAppStore.getState()

      // Set initial state
      useAppStore.setState({ view: "files", selectedBucket: "my-bucket" })

      navigateBackFromFiles()

      const state = useAppStore.getState()
      expect(state.view).toBe("buckets")
      expect(state.selectedBucket).toBeNull()
    })
  })
})
