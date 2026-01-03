import { useState, useRef } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { createEpisode, updateEpisode } from './api'
import { uploadEpisodeVideo, uploadEpisodePDF } from '@/lib/storage'
import { PlayCircle, FileText, Eye, EyeOff, Video, FileVideo, File, Upload } from 'lucide-react'
import { cn, parseDurationToSeconds } from '@/lib/utils'
import type { ContentStatus, MediaType } from '@/lib/database.types'

interface CreateEpisodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  subjectId: string
}

export function CreateEpisodeModal({ isOpen, onClose, onSuccess, subjectId }: CreateEpisodeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    primary_media_type: 'video_url' as MediaType,
    video_url: '',
    duration_minutes: '', // Store as minutes in form, convert to seconds when saving
    points_reward: '',
    status: 'draft' as ContentStatus,
  })

  const handleMediaTypeChange = (type: MediaType) => {
    setFormData({
      ...formData,
      primary_media_type: type,
      video_url: '',
    })
    setVideoFile(null)
    setPdfFile(null)
    if (videoInputRef.current) videoInputRef.current.value = ''
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alert('กรุณาเลือกไฟล์วิดีโอเท่านั้น')
      return
    }

    if (file.size > 500 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 500MB')
      return
    }

    setVideoFile(file)
  }

  const handlePDFFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('กรุณาเลือกไฟล์ PDF เท่านั้น')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 50MB')
      return
    }

    setPdfFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate media based on type
      let videoUrl: string | null = null
      let videoPath: string | null = null
      let pdfPath: string | null = null

      if (formData.primary_media_type === 'video_url') {
        if (!formData.video_url.trim()) {
          throw new Error('กรุณากรอก Video URL')
        }
        videoUrl = formData.video_url.trim()
      } else if (formData.primary_media_type === 'video_upload') {
        if (!videoFile) {
          throw new Error('กรุณาเลือกไฟล์วิดีโอ')
        }
      } else if (formData.primary_media_type === 'pdf') {
        if (!pdfFile) {
          throw new Error('กรุณาเลือกไฟล์ PDF')
        }
      }

      // Create episode first
      const episode = await createEpisode({
        subject_id: subjectId,
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        primary_media_type: formData.primary_media_type,
        video_url: videoUrl,
        video_path: null,
        pdf_path: null,
        duration_seconds: formData.duration_minutes ? parseDurationToSeconds(formData.duration_minutes) : null, // Parse "minutes" or "minutes:seconds" to seconds
        points_reward: formData.points_reward ? parseInt(formData.points_reward) : null,
      })

      // Upload media if needed
      if (formData.primary_media_type === 'video_upload' && videoFile) {
        try {
          videoPath = await uploadEpisodeVideo(videoFile, episode.id)
          await updateEpisode(episode.id, { video_path: videoPath })
        } catch (uploadError: any) {
          console.error('Error uploading video:', uploadError)
          throw new Error(`ไม่สามารถอัปโหลดวิดีโอ: ${uploadError.message}`)
        }
      } else if (formData.primary_media_type === 'pdf' && pdfFile) {
        try {
          pdfPath = await uploadEpisodePDF(pdfFile, episode.id)
          await updateEpisode(episode.id, { pdf_path: pdfPath })
        } catch (uploadError: any) {
          console.error('Error uploading PDF:', uploadError)
          throw new Error(`ไม่สามารถอัปโหลด PDF: ${uploadError.message}`)
        }
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        primary_media_type: 'video_url',
        video_url: '',
        duration_minutes: '',
        points_reward: '',
        status: 'draft',
      })
      setVideoFile(null)
      setPdfFile(null)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้าง EP')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setFormData({
      title: '',
      description: '',
      primary_media_type: 'video_url',
      video_url: '',
      duration_minutes: '',
      points_reward: '',
      status: 'draft',
    })
    setVideoFile(null)
    setPdfFile(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="เพิ่ม EP ใหม่"
      description="สร้างบทเรียนใหม่"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        <Input
          label="ชื่อ EP"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          leftIcon={<PlayCircle className="w-5 h-5" />}
          placeholder="เช่น EP 1: Introduction"
          required
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              คำอธิบาย
            </span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="อธิบายเกี่ยวกับ EP นี้..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Media Type Selection */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            ประเภทสื่อ
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleMediaTypeChange('video_url')}
              className={cn(
                'p-4 border-2 rounded-lg text-center transition-colors relative',
                formData.primary_media_type === 'video_url'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Video className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium">Video URL</p>
              <span className="absolute top-1 right-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                แนะนำ
              </span>
              <p className="text-xs text-gray-500 mt-1">ง่าย • เร็ว • ประหยัด</p>
            </button>
            <button
              type="button"
              onClick={() => handleMediaTypeChange('video_upload')}
              className={cn(
                'p-4 border-2 rounded-lg text-center transition-colors',
                formData.primary_media_type === 'video_upload'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <FileVideo className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium">Upload Video</p>
              <p className="text-xs text-gray-500 mt-1">สำหรับเนื้อหาลับ</p>
            </button>
            <button
              type="button"
              onClick={() => handleMediaTypeChange('pdf')}
              className={cn(
                'p-4 border-2 rounded-lg text-center transition-colors',
                formData.primary_media_type === 'pdf'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <File className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium">PDF</p>
              <p className="text-xs text-gray-500 mt-1">เอกสาร</p>
            </button>
          </div>
        </div>

        {/* Media Input based on type */}
        {formData.primary_media_type === 'video_url' && (
          <div>
            <Input
              label="Video URL"
              type="url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              leftIcon={<Video className="w-5 h-5" />}
              placeholder="https://youtube.com/watch?v=... หรือ https://vimeo.com/..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 แนะนำ: ใช้ YouTube/Vimeo URL - ไม่เสียค่าใช้จ่าย storage, โหลดเร็ว, รองรับหลายคุณภาพ
            </p>
          </div>
        )}

        {formData.primary_media_type === 'video_upload' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              อัปโหลดวิดีโอ
            </label>
            <div className="flex items-center gap-4">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {videoFile ? videoFile.name : 'เลือกไฟล์วิดีโอ'}
              </button>
              {videoFile && (
                <span className="text-sm text-gray-600">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ หมายเหตุ: อัพโหลดไฟล์จะใช้ storage และ bandwidth ของ Supabase (อาจมีค่าใช้จ่าย)
              <br />
              💡 แนะนำใช้ Video URL สำหรับเนื้อหาทั่วไป
            </p>
          </div>
        )}

        {formData.primary_media_type === 'pdf' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              อัปโหลด PDF
            </label>
            <div className="flex items-center gap-4">
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePDFFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {pdfFile ? pdfFile.name : 'เลือกไฟล์ PDF'}
              </button>
              {pdfFile && (
                <span className="text-sm text-gray-600">
                  {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              รองรับไฟล์ PDF (สูงสุด 50MB)
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="ระยะเวลา (นาที:วินาที)"
            type="text"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
            placeholder="เช่น 10 หรือ 10:30"
          />
          <Input
            label="แต้มรางวัล (ไม่บังคับ)"
            type="number"
            value={formData.points_reward}
            onChange={(e) => setFormData({ ...formData, points_reward: e.target.value })}
            placeholder="ถ้าไม่ระบุใช้ค่า default"
            min="0"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            <span className="flex items-center gap-2">
              {formData.status === 'published' ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              สถานะ
            </span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="published"
                checked={formData.status === 'published'}
                onChange={() => setFormData({ ...formData, status: 'published' })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700">เผยแพร่</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={formData.status === 'draft'}
                onChange={() => setFormData({ ...formData, status: 'draft' })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700">ร่าง</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="hidden"
                checked={formData.status === 'hidden'}
                onChange={() => setFormData({ ...formData, status: 'hidden' })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700">ซ่อน</span>
            </label>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={loading}>
            สร้าง EP
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

