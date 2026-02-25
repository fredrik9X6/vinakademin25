'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDocumentInfo, useField, useForm } from '@payloadcms/ui'

type UploadStatus = 'idle' | 'requesting' | 'uploading' | 'processing' | 'ready' | 'errored'

export const MuxDirectUploadField: React.FC<{
  field: { name: string }
  path: string
}> = ({ path }) => {
  const { id, collectionSlug } = useDocumentInfo()
  const { dispatchFields } = useForm()

  // Watch muxData fields
  const muxDataBasePath = path.replace(/\.muxUploader$/, '')
  const muxDataPath = muxDataBasePath.endsWith('preview')
    ? 'previewMuxData'
    : 'muxData'

  const assetIdField = useField<string>({ path: `${muxDataPath}.assetId` })
  const playbackIdField = useField<string>({ path: `${muxDataPath}.playbackId` })
  const statusField = useField<string>({ path: `${muxDataPath}.status` })

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derive initial state from existing muxData
  useEffect(() => {
    const status = statusField.value
    if (status === 'ready' && playbackIdField.value) {
      setUploadStatus('ready')
    } else if (status === 'preparing') {
      setUploadStatus('processing')
    } else if (status === 'errored') {
      setUploadStatus('errored')
      setErrorMessage('Video processing failed')
    }
  }, [statusField.value, playbackIdField.value])

  // Poll for status when processing
  useEffect(() => {
    if (uploadStatus !== 'processing' || !id) return

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/${collectionSlug}/${id}?depth=0`)
        if (!res.ok) return
        const doc = await res.json()

        const data = muxDataPath === 'previewMuxData' ? doc.previewMuxData : doc.muxData
        if (data?.status === 'ready') {
          setUploadStatus('ready')
          // Update form fields so admin UI reflects new state
          dispatchFields({
            type: 'UPDATE',
            path: `${muxDataPath}.status`,
            value: 'ready',
          })
          dispatchFields({
            type: 'UPDATE',
            path: `${muxDataPath}.playbackId`,
            value: data.playbackId,
          })
          if (pollingRef.current) clearInterval(pollingRef.current)
        } else if (data?.status === 'errored') {
          setUploadStatus('errored')
          setErrorMessage(data.errorMessage || 'Video processing failed')
          dispatchFields({
            type: 'UPDATE',
            path: `${muxDataPath}.status`,
            value: 'errored',
          })
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [uploadStatus, id, collectionSlug, muxDataPath, dispatchFields])

  const requestUploadUrl = useCallback(async () => {
    if (!id || !collectionSlug) {
      setErrorMessage('Save the document first before uploading a video')
      setUploadStatus('errored')
      return null
    }

    setUploadStatus('requesting')
    try {
      const res = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionSlug, documentId: String(id) }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to create upload URL')
      }

      const { uploadUrl } = await res.json()
      setUploadUrl(uploadUrl)
      return uploadUrl
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create upload URL')
      setUploadStatus('errored')
      return null
    }
  }, [id, collectionSlug])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith('video/')) {
        setErrorMessage('Please select a video file')
        setUploadStatus('errored')
        return
      }

      const url = await requestUploadUrl()
      if (!url) return

      setUploadStatus('uploading')
      setUploadProgress(0)

      try {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(pct)
          }
        })

        await new Promise<void>((resolve, reject) => {
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          })
          xhr.addEventListener('error', () => reject(new Error('Upload failed')))
          xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

          xhr.open('PUT', url)
          xhr.send(file)
        })

        // Upload complete — now Mux processes the video
        setUploadStatus('processing')
        dispatchFields({
          type: 'UPDATE',
          path: `${muxDataPath}.status`,
          value: 'preparing',
        })
      } catch (err: any) {
        setErrorMessage(err.message || 'Upload failed')
        setUploadStatus('errored')
      }
    },
    [requestUploadUrl, muxDataPath, dispatchFields],
  )

  const handleReplaceVideo = useCallback(() => {
    setUploadStatus('idle')
    setUploadUrl(null)
    setUploadProgress(0)
    setErrorMessage('')
  }, [])

  const playbackId = playbackIdField.value
  const thumbnailUrl = playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.png?width=640&height=360&fit_mode=smartcrop`
    : null

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}
      >
        Video Upload (Mux Direct)
      </label>

      {/* Ready state — show thumbnail and replace option */}
      {uploadStatus === 'ready' && thumbnailUrl && (
        <div style={{ position: 'relative' }}>
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            style={{
              width: '100%',
              maxWidth: '480px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#dcfce7',
                color: '#166534',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Ready
            </span>
            <button
              type="button"
              onClick={handleReplaceVideo}
              style={{
                padding: '4px 12px',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              Replace video
            </button>
          </div>
        </div>
      )}

      {/* Processing state */}
      {uploadStatus === 'processing' && (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#fffbeb',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '2rem',
              height: '2rem',
              margin: '0 auto 0.75rem',
              border: '3px solid #fbbf24',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Processing video...</p>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            Mux is encoding your video. This page will update automatically.
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Uploading state */}
      {uploadStatus === 'uploading' && (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
            Uploading... {uploadProgress}%
          </p>
          <div
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: '#e5e7eb',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${uploadProgress}%`,
                height: '100%',
                borderRadius: '4px',
                backgroundColor: '#f97316',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {uploadStatus === 'errored' && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #fca5a5',
            backgroundColor: '#fef2f2',
            marginBottom: '0.75rem',
          }}
        >
          <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '0.25rem' }}>
            Error
          </p>
          <p style={{ color: '#991b1b', fontSize: '0.875rem' }}>{errorMessage}</p>
          <button
            type="button"
            onClick={handleReplaceVideo}
            style={{
              marginTop: '0.5rem',
              padding: '4px 12px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #fca5a5',
              backgroundColor: '#fff',
              color: '#991b1b',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Idle state — file picker */}
      {(uploadStatus === 'idle' || uploadStatus === 'requesting') && (
        <div
          style={{
            padding: '2rem',
            borderRadius: '8px',
            border: '2px dashed #d1d5db',
            backgroundColor: '#f9fafb',
            textAlign: 'center',
            cursor: uploadStatus === 'requesting' ? 'wait' : 'pointer',
            opacity: uploadStatus === 'requesting' ? 0.6 : 1,
          }}
          onClick={() => {
            if (uploadStatus !== 'requesting') {
              fileInputRef.current?.click()
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
            {uploadStatus === 'requesting'
              ? 'Preparing upload...'
              : 'Click to select a video file'}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {!id
              ? 'Save the document first, then upload a video'
              : 'Video will be uploaded directly to Mux for processing'}
          </p>
        </div>
      )}
    </div>
  )
}
