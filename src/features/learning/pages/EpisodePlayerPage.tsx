
import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, Badge, Spinner, Button } from '@/components/ui'
import {
  ArrowLeft,
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  Clock,
  FileText,
  BookOpen,
  Lock,
} from 'lucide-react'
import { useEpisode, useEpisodesInSubject, useSubject } from '@/hooks/useLearning'
import { saveEpisodeProgress } from '../api'
import { completeEpisode } from '@/features/rewards/api'
import { getEpisodeMediaUrl } from '@/lib/storage'
import { formatDuration } from '@/lib/utils'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabaseClient'
import type { UserProgress } from '@/lib/database.types'
import { formatPoints } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

let youtubeApiPromise: Promise<void> | null = null

function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window is not available'))
  }

  if (window.YT && window.YT.Player) {
    return Promise.resolve()
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-youtube-iframe-api="true"]')
    const previousReady = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      if (previousReady) {
        previousReady()
      }
      resolve()
    }

    if (!existingScript) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.dataset.youtubeIframeApi = 'true'
      script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'))
      document.head.appendChild(script)
    }
  })

  return youtubeApiPromise
}

function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&?\s]{11})/, // youtube.com/watch?v=...
    /(?:youtube\.com\/embed\/)([^&?\s]{11})/, // youtube.com/embed/...
    /(?:youtu\.be\/)([^&?\s]{11})/, // youtu.be/...
    /(?:youtube\.com\/v\/)([^&?\s]{11})/, // youtube.com/v/...
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

const SEEK_BUFFER_SECONDS = 2

export function EpisodePlayerPage() {
  const { subjectId, episodeId } = useParams<{ subjectId: string; episodeId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { success } = useToast()
  const queryClient = useQueryClient()

  // Helper function to invalidate progress queries
  const invalidateProgressQueries = () => {
    if (user?.id && subjectId) {
      queryClient.invalidateQueries({ queryKey: ['subjects-progress'] })
      queryClient.invalidateQueries({ queryKey: ['subject-progress', user.id, subjectId] })
      queryClient.invalidateQueries({ queryKey: ['categories-progress'] })
      queryClient.invalidateQueries({ queryKey: ['user-progress'] })
    }
  }

  // Helper function to show points notification
  const showPointsNotification = (result: {
    gainedEpisodePoints?: number
    gainedSubjectPoints?: number
    gainedStreakPoints?: number
  }) => {
    const messages: string[] = []
    
    if (result.gainedEpisodePoints && result.gainedEpisodePoints > 0) {
      messages.push(`ได้ ${formatPoints(result.gainedEpisodePoints)} แต้ม (จบบทเรียน)`)
    }
    
    if (result.gainedSubjectPoints && result.gainedSubjectPoints > 0) {
      messages.push(`ได้ ${formatPoints(result.gainedSubjectPoints)} แต้ม (จบทั้งวิชา)`)
    }
    
    if (result.gainedStreakPoints && result.gainedStreakPoints > 0) {
      messages.push(`ได้ ${formatPoints(result.gainedStreakPoints)} แต้ม (Streak)`)
    }

    if (messages.length > 0) {
      const totalPoints = (result.gainedEpisodePoints || 0) + 
                         (result.gainedSubjectPoints || 0) + 
                         (result.gainedStreakPoints || 0)
      success(`🎉 ${messages.join(' + ')} (รวม ${formatPoints(totalPoints)} แต้ม)`, 6000)
    }
  }

  const { data: episode, isLoading: episodeLoading } = useEpisode(episodeId)
  const { data: episodes = [], isLoading: episodesLoading } = useEpisodesInSubject(subjectId)
  const { data: subjectData } = useSubject(subjectId)

  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [loadingMedia, setLoadingMedia] = useState(true)
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [watchedPercent, setWatchedPercent] = useState(0)
  const [lastPosition, setLastPosition] = useState(0)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const youtubeContainerRef = useRef<HTMLDivElement>(null)
  const youtubePlayerRef = useRef<YT.Player | null>(null)
  const progressSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const youtubeProgressInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPositionRef = useRef(0)
  const youtubeSeekedRef = useRef(false)
  const maxWatchedRef = useRef(0)
  const seekGuardRef = useRef(false)
  const userRef = useRef(user)
  const progressRef = useRef(progress)
  const completeEpisodeCalledRef = useRef(false)

  const subject = subjectData?.subject
  const isYouTube = Boolean(youtubeVideoId)

  useEffect(() => {
    lastPositionRef.current = lastPosition
  }, [lastPosition])

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    maxWatchedRef.current = Math.max(maxWatchedRef.current, lastPosition)
  }, [lastPosition])

  useEffect(() => {
    youtubeSeekedRef.current = false
    maxWatchedRef.current = 0
    seekGuardRef.current = false
    completeEpisodeCalledRef.current = false
  }, [episodeId, youtubeVideoId])

  // Find current episode index
  const currentIndex = episodes.findIndex((e) => e.id === episodeId)
  const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null
  const nextEpisode = currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null

  // Check if current episode is completed
  const isCurrentEpisodeCompleted = (progress?.watched_percent ?? 0) >= 90

  // Check if next episode is locked (for sequential mode)
  const isNextEpisodeLocked = useMemo(() => {
    if (!nextEpisode) return false
    if (currentIndex < 0) return false

    // Require current episode completion before moving to next
    return !isCurrentEpisodeCompleted
  }, [nextEpisode, currentIndex, isCurrentEpisodeCompleted])

  // Check if current episode is locked and redirect if needed
  useEffect(() => {
    async function checkEpisodeLock() {
      if (!user || !subject || !episode || currentIndex < 0) return
      if (subject.unlock_mode === 'open') return
      if (currentIndex === 0) return // First episode is always unlocked

      // Check if previous episode is completed
      const previousEpisode = episodes[currentIndex - 1]
      if (!previousEpisode) return

      const { data: prevProgress } = await supabase
        .from('user_episode_progress')
        .select('completed_at, watched_percent')
        .eq('user_id', user.id)
        .eq('episode_id', previousEpisode.id)
        .maybeSingle()

      const progressData = prevProgress as { completed_at: string | null; watched_percent: number } | null
      const isPrevCompleted = progressData?.completed_at !== null || (progressData?.watched_percent ?? 0) >= 90

      if (!isPrevCompleted) {
        // Redirect to subject detail page with message
        alert('กรุณาเรียนบทเรียนก่อนหน้าจบก่อน')
        navigate(`/subjects/${subjectId}`)
      }
    }

    if (episodes.length > 0 && subject && episode) {
      checkEpisodeLock()
    }
  }, [user, subject, episode, episodes, currentIndex, subjectId, navigate])

  // Load media URL
  useEffect(() => {
    async function loadMedia() {
      if (!episode) return

      setLoadingMedia(true)
      setVideoError(null)
      let isYouTubeUrl = false

      try {
        console.log('Loading media for episode:', {
          id: episode.id,
          type: episode.primary_media_type,
          video_url: episode.video_url,
          video_path: episode.video_path,
          pdf_path: episode.pdf_path,
        })

        if (episode.primary_media_type === 'video_url' && episode.video_url) {
          console.log('Using video URL:', episode.video_url)
          const videoId = getYouTubeVideoId(episode.video_url)

          if (videoId) {
            const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`
            console.log('Converted to YouTube embed URL:', embedUrl, 'from videoId:', videoId)
            setMediaUrl(embedUrl)
            setYoutubeVideoId(videoId)
            isYouTubeUrl = true
          } else {
            setYoutubeVideoId(null)
            setMediaUrl(episode.video_url)
          }
        } else if (episode.primary_media_type === 'video_upload' && episode.video_path) {
          setYoutubeVideoId(null)
          console.log('Loading video from path:', episode.video_path)
          const url = await getEpisodeMediaUrl(episode.video_path)
          console.log('Got signed URL:', url ? 'Yes' : 'No')
          if (url) {
            setMediaUrl(url)
          } else {
            setVideoError('ไม่สามารถโหลดวิดีโอได้ กรุณาลองใหม่อีกครั้ง')
          }
        } else if (episode.primary_media_type === 'pdf' && episode.pdf_path) {
          setYoutubeVideoId(null)
          console.log('Loading PDF from path:', episode.pdf_path)
          const url = await getEpisodeMediaUrl(episode.pdf_path)
          console.log('Got signed URL:', url ? 'Yes' : 'No')
          if (url) {
            setMediaUrl(url)
          } else {
            setVideoError('ไม่สามารถโหลด PDF ได้ กรุณาลองใหม่อีกครั้ง')
          }
        } else {
          setYoutubeVideoId(null)
          console.warn('No media found for episode')
          setVideoError('ไม่พบสื่อการเรียนในบทเรียนนี้')
        }
      } catch (error: any) {
        console.error('Error loading media:', error)
        setVideoError(error.message || 'เกิดข้อผิดพลาดในการโหลดสื่อ')
      } finally {
        if (!isYouTubeUrl) {
          setLoadingMedia(false)
        }
      }
    }

    loadMedia()
  }, [episode])

  // Initialize YouTube player and progress tracking
  useEffect(() => {
    if (!youtubeVideoId || !youtubeContainerRef.current) {
      if (youtubeProgressInterval.current) {
        clearInterval(youtubeProgressInterval.current)
        youtubeProgressInterval.current = null
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy()
        youtubePlayerRef.current = null
      }
      return
    }

    let cancelled = false
    const lastSaved = { percent: 0, time: Date.now() }

    const updateYouTubeProgress = async () => {
      const currentUser = userRef.current
      if (!currentUser || !episodeId) return

      const player = youtubePlayerRef.current
      if (
        !player ||
        typeof player.getDuration !== 'function' ||
        typeof player.getCurrentTime !== 'function' ||
        typeof player.seekTo !== 'function'
      ) {
        return
      }

      const duration = player.getDuration()
      const currentTime = player.getCurrentTime()
      if (!duration || duration <= 0 || currentTime < 0) return

      if (seekGuardRef.current) {
        seekGuardRef.current = false
        return
      }

      const maxAllowed = maxWatchedRef.current + SEEK_BUFFER_SECONDS
      if (currentTime > maxAllowed) {
        seekGuardRef.current = true
        player.seekTo(maxWatchedRef.current, true)
        return
      }

      maxWatchedRef.current = Math.max(maxWatchedRef.current, currentTime)

      const percent = Math.min((currentTime / duration) * 100, 100)
      const percentToSave = Math.round(percent)
      const timeToSave = Math.floor(currentTime)

      setWatchedPercent(percent)
      setLastPosition(timeToSave)

      const now = Date.now()
      const shouldSave =
        Math.abs(percentToSave - lastSaved.percent) > 1 ||
        (now - lastSaved.time) > 5000

      if (shouldSave && percentToSave > 0) {
        try {
          const savedProgress = await saveEpisodeProgress(episodeId, percentToSave, timeToSave)
          if (savedProgress) {
            setProgress(savedProgress)
            lastSaved.percent = percentToSave
            lastSaved.time = now
            
            // Call complete-episode when >= 90% and not yet called
            if (percentToSave >= 90 && !completeEpisodeCalledRef.current) {
              completeEpisodeCalledRef.current = true
              try {
                const result = await completeEpisode(episodeId)
                if (result.ok) {
                  console.log('Episode completed (>=90%) - points awarded:', {
                    episode: result.gainedEpisodePoints,
                    subject: result.gainedSubjectPoints,
                    streak: result.gainedStreakPoints,
                  })
                  showPointsNotification(result)
                  invalidateProgressQueries()
                } else {
                  console.log('Episode completion result:', result.reason || result.error)
                  // Reset if failed so we can try again
                  completeEpisodeCalledRef.current = false
                }
              } catch (error) {
                console.error('Error calling complete-episode:', error)
                // Reset if error so we can try again
                completeEpisodeCalledRef.current = false
              }
            }
          }
        } catch (error) {
          console.error('Error saving YouTube progress:', error)
        }
      }
    }

    const markYouTubeStarted = async () => {
      const currentUser = userRef.current
      if (!currentUser || !episodeId) return
      if (progressRef.current) return

      try {
        const savedProgress = await saveEpisodeProgress(episodeId, 0, 0)
        if (savedProgress) {
          setProgress(savedProgress)
        }
      } catch (error) {
        console.error('Error marking YouTube episode as started:', error)
      }
    }

    const markYouTubeCompleted = async () => {
      const currentUser = userRef.current
      if (!currentUser || !episodeId) return

      try {
        const savedProgress = await saveEpisodeProgress(episodeId, 100, 0)
        if (savedProgress) {
          setProgress(savedProgress)
          setWatchedPercent(100)
          
          // Award points via Edge Function
          try {
            const result = await completeEpisode(episodeId)
            if (result.ok) {
              console.log('Episode completed - points awarded:', {
                episode: result.gainedEpisodePoints,
                subject: result.gainedSubjectPoints,
                streak: result.gainedStreakPoints,
              })
              showPointsNotification(result)
              invalidateProgressQueries()
            } else {
              console.log('Episode completion result:', result.reason || result.error)
            }
          } catch (error) {
            console.error('Error calling complete-episode:', error)
          }
        }
      } catch (error) {
        console.error('Error marking YouTube episode as completed:', error)
      }
    }

    setLoadingMedia(true)
    setVideoError(null)

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !youtubeContainerRef.current) return

        if (youtubePlayerRef.current) {
          youtubePlayerRef.current.destroy()
          youtubePlayerRef.current = null
        }

        youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
          width: '100%',
          height: '100%',
          videoId: youtubeVideoId,
          playerVars: {
            controls: 1,
            disablekb: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              setLoadingMedia(false)
              const iframe = youtubeContainerRef.current?.querySelector('iframe')
              if (iframe) {
                iframe.style.width = '100%'
                iframe.style.height = '100%'
              }
              const player = event.target
              if (
                !player ||
                typeof player.getDuration !== 'function' ||
                typeof player.seekTo !== 'function'
              ) {
                return
              }
              const duration = player.getDuration()
              const resumeTime = lastPositionRef.current

              if (resumeTime > 0 && duration > 0) {
                seekGuardRef.current = true
                player.seekTo(resumeTime, true)
                setWatchedPercent((resumeTime / duration) * 100)
                maxWatchedRef.current = Math.max(maxWatchedRef.current, resumeTime)
                lastSaved.percent = Math.round((resumeTime / duration) * 100)
                lastSaved.time = Date.now()
                youtubeSeekedRef.current = true
              }
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                markYouTubeStarted()
                updateYouTubeProgress()
                if (!youtubeProgressInterval.current) {
                  youtubeProgressInterval.current = setInterval(updateYouTubeProgress, 1000)
                }
              }

              if (event.data === window.YT.PlayerState.PAUSED) {
                updateYouTubeProgress()
                if (youtubeProgressInterval.current) {
                  clearInterval(youtubeProgressInterval.current)
                  youtubeProgressInterval.current = null
                }
              }

              if (event.data === window.YT.PlayerState.ENDED) {
                if (youtubeProgressInterval.current) {
                  clearInterval(youtubeProgressInterval.current)
                  youtubeProgressInterval.current = null
                }
                markYouTubeCompleted()
              }
            },
          },
        })
      })
      .catch((error) => {
        console.error('YouTube API load error:', error)
        setVideoError('ไม่สามารถโหลดวิดีโอ YouTube ได้')
        setLoadingMedia(false)
      })

    return () => {
      cancelled = true
      if (youtubeProgressInterval.current) {
        clearInterval(youtubeProgressInterval.current)
        youtubeProgressInterval.current = null
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy()
        youtubePlayerRef.current = null
      }
    }
  }, [youtubeVideoId, episodeId])

  // Load user progress and award points if completed but no transaction exists
  useEffect(() => {
    async function loadProgress() {
      if (!user || !episodeId) {
        setProgress(null)
        setWatchedPercent(0)
        setLastPosition(0)
        return
      }

      const { data, error } = await supabase
        .from('user_episode_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('episode_id', episodeId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected, ignore it
        console.error('Error loading progress:', error)
      }

      if (data) {
        setProgress(data as UserProgress)
        setWatchedPercent((data as UserProgress).watched_percent || 0)
        setLastPosition((data as UserProgress).last_position_seconds || 0)
        
        // Check if episode is completed (watched >= 90% or completed_at is set)
        const isCompleted = (data as UserProgress).completed_at !== null || ((data as UserProgress).watched_percent ?? 0) >= 90
        
        if (isCompleted) {
          // Check if points were already awarded (check for transaction)
          const { data: transaction, error: txError } = await supabase
            .from('point_transactions')
            .select('id')
            .eq('user_id', user.id)
            .eq('rule_key', 'episode_complete')
            .eq('ref_type', 'episode')
            .eq('ref_id', episodeId)
            .maybeSingle()
          
          if (!transaction && !txError) {
            // Episode is completed but no points transaction exists - award points
            console.log('Episode completed but no points awarded yet. Awarding points now...')
            try {
              const result = await completeEpisode(episodeId)
              if (result.ok) {
                console.log('Points awarded for already completed episode:', {
                  episode: result.gainedEpisodePoints,
                  subject: result.gainedSubjectPoints,
                  streak: result.gainedStreakPoints,
                })
                showPointsNotification(result)
              } else {
                console.log('Failed to award points for completed episode:', result.reason || result.error)
              }
            } catch (error) {
              console.error('Error awarding points for completed episode:', error)
            }
          }
        }
      } else {
        // No progress found - reset to initial state
        setProgress(null)
        setWatchedPercent(0)
        setLastPosition(0)
      }
    }

    loadProgress()
  }, [user, episodeId])

  // Restore video position
  useEffect(() => {
    if (isYouTube) return
    if (videoRef.current && lastPosition > 0 && episode?.primary_media_type !== 'pdf') {
      videoRef.current.currentTime = lastPosition
    }
  }, [isYouTube, lastPosition, episode?.primary_media_type])

  useEffect(() => {
    if (!isYouTube || youtubeSeekedRef.current) return
    const player = youtubePlayerRef.current
    if (
      !player ||
      typeof player.getDuration !== 'function' ||
      typeof player.seekTo !== 'function'
    ) {
      return
    }
    const duration = player.getDuration()
    if (lastPosition > 0 && duration > 0) {
      seekGuardRef.current = true
      player.seekTo(lastPosition, true)
      setWatchedPercent((lastPosition / duration) * 100)
      maxWatchedRef.current = Math.max(maxWatchedRef.current, lastPosition)
      youtubeSeekedRef.current = true
    }
  }, [isYouTube, lastPosition])

  // Save progress periodically (HTML5 video)
  useEffect(() => {
    if (isYouTube) return
    if (!user || !episodeId || episode?.primary_media_type === 'pdf') return

    const video = videoRef.current
    if (!video) {
      return
    }

    let lastSavedPercent = 0
    let lastSavedTime = Date.now()
    let saveTimeout: ReturnType<typeof setTimeout> | null = null

    const updateProgress = async () => {
      if (!video || !video.duration || video.duration <= 0) {
        console.log('Video not ready:', { duration: video?.duration, currentTime: video?.currentTime })
        return
      }

      const currentTime = video.currentTime
      if (currentTime <= 0) return

      const percent = Math.min((currentTime / video.duration) * 100, 100)
      const percentToSave = Math.round(percent)
      const timeToSave = Math.floor(currentTime)

      // Update UI immediately
      setWatchedPercent(percent)
      setLastPosition(timeToSave)

      // Only save to database if progress changed significantly (more than 1%) or every 5 seconds
      const now = Date.now()
      const shouldSave =
        Math.abs(percentToSave - lastSavedPercent) > 1 ||
        (now - lastSavedTime) > 5000

      if (shouldSave && percentToSave > 0) {
        try {
          console.log('Saving progress:', { percent, currentTime, episodeId })
          const savedProgress = await saveEpisodeProgress(episodeId, percentToSave, timeToSave)
          if (savedProgress) {
            setProgress(savedProgress)
            lastSavedPercent = percentToSave
            lastSavedTime = now
            console.log('Progress saved successfully:', savedProgress)
            
            // Call complete-episode when >= 90% and not yet called
            if (percentToSave >= 90 && !completeEpisodeCalledRef.current) {
              completeEpisodeCalledRef.current = true
              try {
                const result = await completeEpisode(episodeId)
                if (result.ok) {
                  console.log('Episode completed (>=90%) - points awarded:', {
                    episode: result.gainedEpisodePoints,
                    subject: result.gainedSubjectPoints,
                    streak: result.gainedStreakPoints,
                  })
                  showPointsNotification(result)
                  invalidateProgressQueries()
                } else {
                  console.log('Episode completion result:', result.reason || result.error)
                  // Reset if failed so we can try again
                  completeEpisodeCalledRef.current = false
                }
              } catch (error) {
                console.error('Error calling complete-episode:', error)
                // Reset if error so we can try again
                completeEpisodeCalledRef.current = false
              }
            }
          }
        } catch (error) {
          console.error('Error saving progress:', error)
        }
      }
    }

    // Wait for video to be ready
    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded:', { duration: video.duration, readyState: video.readyState })
      // Save initial progress if video has been watched before
      if (lastPosition > 0 && video.duration > 0) {
        const percent = (lastPosition / video.duration) * 100
        setWatchedPercent(percent)
        maxWatchedRef.current = Math.max(maxWatchedRef.current, lastPosition)
      }
    }

    const handlePlay = async () => {
      console.log('Video started playing, currentTime:', video.currentTime)
      // Mark as started immediately when video starts (even if 0%)
      if (user && episodeId) {
        try {
          // Mark as started - this creates the progress record
          const savedProgress = await saveEpisodeProgress(episodeId, 0, 0)
          if (savedProgress) {
            setProgress(savedProgress)
            console.log('Episode marked as started')
          }
        } catch (error) {
          console.error('Error marking episode as started:', error)
        }
      }
      // Also update progress if video has duration
      if (video.duration > 0) {
        updateProgress()
      }
    }

    const handleTimeUpdate = () => {
      // Update UI immediately on every timeupdate
      if (video.duration && video.duration > 0 && video.currentTime > 0) {
        const percent = Math.min((video.currentTime / video.duration) * 100, 100)
        setWatchedPercent(percent)
        setLastPosition(video.currentTime)
        maxWatchedRef.current = Math.max(maxWatchedRef.current, video.currentTime)

        // Debounce save to database (save every 3 seconds max)
        if (saveTimeout) {
          clearTimeout(saveTimeout)
        }
        saveTimeout = setTimeout(() => {
          updateProgress()
        }, 3000)
      }
    }

    const handleSeeking = () => {
      if (seekGuardRef.current) {
        seekGuardRef.current = false
        return
      }

      const maxAllowed = maxWatchedRef.current + SEEK_BUFFER_SECONDS
      if (video.currentTime > maxAllowed) {
        seekGuardRef.current = true
        video.currentTime = maxWatchedRef.current
      }
    }

    // Save every 5 seconds as backup
    progressSaveInterval.current = setInterval(() => {
      if (video.duration > 0 && video.currentTime > 0) {
        updateProgress()
      }
    }, 5000)

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('seeking', handleSeeking)
    video.addEventListener('playing', () => console.log('Video is playing'))
    video.addEventListener('pause', () => console.log('Video paused'))

    // Initial check if video is already loaded
    if (video.readyState >= 2) {
      handleLoadedMetadata()
    }

    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current)
      }
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('seeking', handleSeeking)
    }
  }, [isYouTube, user, episodeId, episode?.primary_media_type, lastPosition, mediaUrl])

  // Mark PDF as viewed when opened
  useEffect(() => {
    if (episode?.primary_media_type === 'pdf' && user && episodeId && !progress && mediaUrl) {
      // Mark as 100% viewed when PDF is opened
      saveEpisodeProgress(episodeId, 100, 0)
        .then(async (savedProgress) => {
          if (savedProgress) {
            setProgress(savedProgress)
            setWatchedPercent(100)
            console.log('PDF marked as viewed')
            
            // Award points via Edge Function
            try {
              const result = await completeEpisode(episodeId)
              if (result.ok) {
                console.log('PDF completed - points awarded:', {
                  episode: result.gainedEpisodePoints,
                  subject: result.gainedSubjectPoints,
                  streak: result.gainedStreakPoints,
                })
                showPointsNotification(result)
              } else {
                console.log('PDF completion result:', result.reason || result.error)
              }
            } catch (error) {
              console.error('Error calling complete-episode for PDF:', error)
            }
          }
        })
        .catch(console.error)
    }
  }, [episode?.primary_media_type, user, episodeId, progress, mediaUrl])

  if (episodeLoading || episodesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!episode) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">ไม่พบบทเรียน</p>
        <Button onClick={() => navigate(`/subjects/${subjectId}`)}>กลับไปหน้าวิชา</Button>
      </div>
    )
  }

  // Only show completed if there's actual progress and it's completed
  const isCompleted = progress !== null && progress?.completed_at !== null && (progress?.watched_percent ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/subjects/${subjectId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับ
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{episode.title}</h1>
            {subject && (
              <p className="text-gray-500 mt-1">
                {subject.title}
                {subject.category_name && ` • ${subject.category_name}`}
              </p>
            )}
          </div>
        </div>
        {isCompleted && (
          <Badge variant="success" size="sm" className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            เรียนจบแล้ว
          </Badge>
        )}
      </div>

      {/* Media Player */}
      <Card variant="bordered" className="overflow-hidden">
        {loadingMedia && !isYouTube ? (
          <div className="flex items-center justify-center h-96 bg-gray-100">
            <Spinner size="lg" />
          </div>
        ) : !mediaUrl && !videoError ? (
          <div className="flex items-center justify-center h-96 bg-gray-100">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="text-gray-500 mt-4">กำลังโหลดสื่อ...</p>
            </div>
          </div>
        ) : episode.primary_media_type === 'pdf' && mediaUrl ? (
          <div className="w-full h-[600px]">
            <iframe
              src={mediaUrl}
              className="w-full h-full border-0"
              title={episode.title}
            />
          </div>
        ) : (episode.primary_media_type === 'video_url' || episode.primary_media_type === 'video_upload') && mediaUrl ? (
          <div className="w-full bg-black">
            {videoError ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center text-white">
                  <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-white/80">{videoError}</p>
                  <Button
                    variant="outline"
                    className="mt-4 bg-white"
                    onClick={() => {
                      setLoadingMedia(true)
                      setVideoError(null)
                      // Reload media
                      if (episode.primary_media_type === 'video_upload' && episode.video_path) {
                        getEpisodeMediaUrl(episode.video_path)
                          .then((url) => {
                            if (url) {
                              setMediaUrl(url)
                            } else {
                              setVideoError('ไม่สามารถโหลดวิดีโอได้')
                            }
                          })
                          .catch((err) => {
                            setVideoError('เกิดข้อผิดพลาด')
                            console.error(err)
                          })
                          .finally(() => setLoadingMedia(false))
                      }
                    }}
                  >
                    ลองใหม่อีกครั้ง
                  </Button>
                </div>
              </div>
            ) : isYouTube ? (
              <div className="w-full aspect-video bg-black relative">
                {loadingMedia && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Spinner size="lg" />
                  </div>
                )}
                <div
                  key={youtubeVideoId || 'youtube'}
                  ref={youtubeContainerRef}
                  className="absolute inset-0"
                />
              </div>
            ) : (
              <video
                ref={videoRef}
                src={mediaUrl}
                controls
                className="w-full h-auto max-h-[600px]"
                preload="metadata"
                crossOrigin="anonymous"
                onLoadStart={() => {
                  console.log('Video load started')
                }}
                onLoadedData={() => {
                  console.log('Video data loaded')
                }}
                onCanPlay={() => {
                  console.log('Video can play')
                }}
                onError={(e) => {
                  const video = e.currentTarget
                  console.error('Video error:', {
                    error: video.error,
                    code: video.error?.code,
                    message: video.error?.message,
                    networkState: video.networkState,
                    readyState: video.readyState,
                  })

                  let errorMsg = 'ไม่สามารถเล่นวิดีโอได้'
                  if (video.error) {
                    switch (video.error.code) {
                      case 1: // MEDIA_ERR_ABORTED
                        errorMsg = 'การโหลดวิดีโอถูกยกเลิก'
                        break
                      case 2: // MEDIA_ERR_NETWORK
                        errorMsg = 'เกิดข้อผิดพลาดในการโหลดวิดีโอ (Network)'
                        break
                      case 3: // MEDIA_ERR_DECODE
                        errorMsg = 'ไม่สามารถถอดรหัสวิดีโอได้'
                        break
                      case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                        errorMsg = 'รูปแบบวิดีโอไม่รองรับ'
                        break
                    }
                  }
                  setVideoError(errorMsg)
                }}
                onEnded={async () => {
                  if (user && episodeId) {
                    try {
                      console.log('Video ended - marking as completed')
                      // Mark as 100% completed
                      const savedProgress = await saveEpisodeProgress(episodeId, 100, 0)
                      if (savedProgress) {
                        setProgress(savedProgress)
                        setWatchedPercent(100)
                        console.log('Episode completed successfully:', savedProgress)
                        
                        // Award points via Edge Function
                        try {
                          const result = await completeEpisode(episodeId)
                          if (result.ok) {
                            console.log('Episode completed - points awarded:', {
                              episode: result.gainedEpisodePoints,
                              subject: result.gainedSubjectPoints,
                              streak: result.gainedStreakPoints,
                            })
                            showPointsNotification(result)
                          } else {
                            console.log('Episode completion result:', result.reason || result.error)
                          }
                        } catch (error) {
                          console.error('Error calling complete-episode:', error)
                        }
                      }
                    } catch (error) {
                      console.error('Error marking episode as completed:', error)
                    }
                  }
                }}
              />
            )}
          </div>
        ) : videoError ? (
          <div className="flex items-center justify-center h-96 bg-gray-100">
            <div className="text-center">
              <PlayCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">{videoError}</p>
              <Button
                variant="outline"
                onClick={() => {
                  // Reload page to retry
                  window.location.reload()
                }}
              >
                ลองใหม่อีกครั้ง
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-96 bg-gray-100">
            <div className="text-center">
              <PlayCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">ไม่พบสื่อการเรียน</p>
            </div>
          </div>
        )}
      </Card>

      {/* Episode Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {episode.description && (
            <Card variant="bordered" className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">คำอธิบาย</h2>
              <p className="text-gray-600 whitespace-pre-line">{episode.description}</p>
            </Card>
          )}

          {/* Progress Info - Only show if user has started watching */}
          {episode.primary_media_type !== 'pdf' && watchedPercent > 0 && (
            <Card variant="bordered" className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">ความคืบหน้า</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">เรียนแล้ว</span>
                  <span className="font-medium text-gray-900">{Math.round(watchedPercent)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${watchedPercent}%` }}
                  />
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Episode Info */}
          <Card variant="bordered" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ข้อมูลบทเรียน</h3>
            <div className="space-y-3">
              {episode.duration_seconds && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>ระยะเวลา: {formatDuration(episode.duration_seconds)}</span>
                </div>
              )}
              {episode.points_reward && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="w-4 h-4" />
                  <span>แต้มรางวัล: {episode.points_reward}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>
                  บทที่ {currentIndex + 1} จาก {episodes.length}
                </span>
              </div>
            </div>
          </Card>

          {/* Navigation */}
          <Card variant="bordered" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">บทเรียนอื่นๆ</h3>
            <div className="space-y-2">
              {prevEpisode ? (
                <Link
                  to={`/subjects/${subjectId}/episodes/${prevEpisode.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500">บทเรียนก่อนหน้า</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{prevEpisode.title}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                </Link>
              ) : (
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-400">ไม่มีบทเรียนก่อนหน้า</p>
                </div>
              )}

              {nextEpisode ? (
                isNextEpisodeLocked ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500">บทเรียนถัดไป</p>
                      <p className="text-sm font-medium text-gray-600 truncate">{nextEpisode.title}</p>
                      <p className="text-xs text-gray-400 mt-1">กรุณาเรียนบทเรียนนี้ให้จบก่อน</p>
                    </div>
                    <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                  </div>
                ) : (
                  <Link
                    to={`/subjects/${subjectId}/episodes/${nextEpisode.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-primary-200 bg-primary-50 hover:bg-primary-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary-600 font-medium">บทเรียนถัดไป</p>
                      <p className="text-sm font-semibold text-primary-900 truncate">{nextEpisode.title}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary-600 flex-shrink-0 ml-2" />
                  </Link>
                )
              ) : (
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-400">ไม่มีบทเรียนถัดไป</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
