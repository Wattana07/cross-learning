// src/types/youtube.d.ts
// YouTube IFrame API minimal typings (safe for React/Vite/TS)
// หากคุณติดตั้ง @types/youtube อยู่แล้ว ให้ลบไฟล์นี้ (เลือกอย่างใดอย่างหนึ่ง) เพื่อไม่ให้ชนกัน

export {};

declare global {
  namespace YT {
    interface PlayerEvent {
      target: Player;
    }

    interface OnStateChangeEvent {
      target: Player;
      data: PlayerState;
    }

    interface PlayerVars {
      autoplay?: 0 | 1;
      controls?: 0 | 1;
      disablekb?: 0 | 1;
      rel?: 0 | 1;
      modestbranding?: 0 | 1;

      // แนะนำเพิ่มเพื่อให้ IFrame API ทำงานเสถียรขึ้นในบางเคส
      enablejsapi?: 0 | 1;
      origin?: string;

      // เผื่อใช้งานบ่อย
      start?: number;
      end?: number;
    }

    interface PlayerOptions {
      height?: number | string;
      width?: number | string;
      videoId: string;
      playerVars?: PlayerVars;
      events?: {
        onReady?: (event: PlayerEvent) => void;
        onStateChange?: (event: OnStateChangeEvent) => void;
      };
    }

    interface Player {
      getCurrentTime(): number;
      getDuration(): number;
      getPlayerState(): PlayerState;
      destroy(): void;

      // เมธอดที่มักใช้จริง (ใส่ไว้เผื่อควบคุม player)
      playVideo(): void;
      pauseVideo(): void;
      stopVideo(): void;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
    }

    class Player {
      constructor(containerId: HTMLElement | string, options: PlayerOptions);
    }

    enum PlayerState {
      UNSTARTED = -1,
      ENDED = 0,
      PLAYING = 1,
      PAUSED = 2,
      BUFFERING = 3,
      CUED = 5,
    }
  }

  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}
