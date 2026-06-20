// Web Speech API ASR 客户端
//
// 使用浏览器原生 SpeechRecognition，无需额外密钥。
// MVP 默认实现：支持中 / 英 / 中英混杂三种语言模式（§5.5）。
// 降级策略：识别文本为空 / 置信度 < 0.3 → 触发兜底提示，不计入题数。

import type { ASRClient, ASRStartOpts } from "../contracts";
import type { LanguageMode } from "@/agent/interview/types";

// 低置信度阈值：低于此值视为无效识别
const CONFIDENCE_THRESHOLD = 0.3;

function langToBCP47(mode: LanguageMode): string {
  if (mode.primary === "en") return "en-US";
  if (mode.mixing === "heavy") return "zh-CN"; // 重混杂：主语言中文，但 SR 仍选中文
  return "zh-CN";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any;

export class WebSpeechASRClient implements ASRClient {
  private sr: SpeechRecognitionType | null = null;
  private muted = false;
  private opts: ASRStartOpts | null = null;

  async start(opts: ASRStartOpts): Promise<void> {
    this.opts = opts;
    const w = window as Window &
      typeof globalThis & {
        SpeechRecognition?: SpeechRecognitionType;
        webkitSpeechRecognition?: SpeechRecognitionType;
      };
    const SpeechRecognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error(
        "当前浏览器不支持 Web Speech API（SpeechRecognition），请使用 Chrome / Edge。",
      );
    }

    const sr: SpeechRecognitionType = new SpeechRecognition();
    this.sr = sr;

    sr.lang = langToBCP47(opts.language);
    sr.continuous = true; // 持续监听，不在一段话后自动停止
    sr.interimResults = !!opts.onPartial;

    sr.onresult = (event: SpeechRecognitionType) => {
      if (this.muted) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (!text) continue;

        if (result.isFinal) {
          const confidence: number = result[0].confidence ?? 1;
          if (confidence < CONFIDENCE_THRESHOLD) {
            // 低置信度：触发兜底（调用方决定如何展示）
            opts.onFinal("", confidence);
          } else {
            opts.onFinal(text, confidence);
          }
        } else {
          opts.onPartial?.(text);
        }
      }
    };

    sr.onerror = (event: SpeechRecognitionType) => {
      // network / not-allowed / audio-capture 等错误不崩溃，静默记录
      console.warn("[asr] SpeechRecognition 错误:", event.error);
      if (event.error === "not-allowed") {
        opts.onFinal("", 0); // 麦克风被拒，触发兜底提示
      }
    };

    sr.onend = () => {
      // 持续监听时 onend 后自动 restart（除非主动 stop）
      if (this.sr === sr && !this.muted) {
        try {
          sr.start();
        } catch {
          /* 已停止则忽略 */
        }
      }
    };

    sr.start();
  }

  async stop(): Promise<void> {
    const sr = this.sr;
    this.sr = null;
    this.opts = null;
    if (sr) {
      try {
        sr.stop();
      } catch {
        /* 忽略 */
      }
    }
  }

  mute(muted: boolean): void {
    this.muted = muted;
    if (!this.sr) return;
    if (muted) {
      try {
        this.sr.stop();
      } catch {
        /* 忽略 */
      }
    } else {
      try {
        this.sr.start();
      } catch {
        /* 已在运行则忽略 */
      }
    }
  }
}
