
import { GoogleGenAI, Type } from "@google/genai";
import { LessonType } from "../types";

export class GeminiService {
  private get ai(): GoogleGenAI {
    // 每次调用时重新实例化，以确保使用最新的 API Key
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeImage(base64Image: string, age: number): Promise<string[]> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image.split(',')[1],
            },
          },
          {
            text: `你是一位严谨的学科知识架构师。请为 ${age} 岁的学习者提取图片中的专业核心知识点。要求：1. 精确分析标注区域（如果有）。2. 提取原子化概念。3. 使用学术术语。
请直接输出一个 JSON 数组：["知识点1", "知识点2", ...]。`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      const text = response.text || "[]";
      return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
      console.error("Failed to parse AI response", e);
      return [];
    }
  }

  async subdivideTopics(topics: string[], age: number): Promise<string[]> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `针对知识点：'${topics.join(', ')}'，进行单层深度的基础概念拆解。仅输出紧邻的先验知识。
请直接输出一个 JSON 字符串数组。`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      return topics;
    }
  }

  async generateLesson(topics: string[], age: number, type: LessonType, isProMode: boolean, extraRequirements?: string): Promise<string> {
    const userInstruction = extraRequirements ? `\n**个性化要求：**\n${extraRequirements}\n` : "";

    let modeSpecificPrompt = "";
    
    // 共同要求：增加知识气泡/要点提示
    const bubbleRequirement = `
      **知识气泡（重点）：**
      在内容展示过程中，必须包含至少 3-5 个“知识气泡”或“划重点气泡”。
      这些气泡应具有：
      1. **视觉吸引力**：圆润的阴影效果、明亮的颜色（如明黄、浅绿）。
      2. **动效**：轻微的呼吸感或浮动动画。
      3. **互动性**：当用户查看或滚动到特定位置时，气泡应弹出显示该处的核心考点或理解难点。
    `;

    if (type === LessonType.IMAGE) {
      const modelName = isProMode ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      const imageConfig: any = { aspectRatio: "16:9" };
      if (isProMode) imageConfig.imageSize = "4K";

      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{
            text: `创作一张关于 "${topics.join(', ')}" 的教学插图。要求：手绘风格，视觉比喻精妙，适合 ${age} 岁孩子。${userInstruction}`
          }]
        },
        config: { imageConfig }
      });

      let imageUrl = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      return `
        <body style="margin:0; background:#fefce8; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; min-height:100vh; padding:40px;">
          <style>
            @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
            .bubble { position: absolute; background: white; padding: 12px 18px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); font-size: 13px; font-weight: bold; border: 2px solid #fde047; animation: float 3s ease-in-out infinite; max-width: 150px; z-index: 10; }
          </style>
          <div style="position:relative; width:100%; max-width:900px; background:white; padding:15px; border-radius:30px; box-shadow:0 20px 50px rgba(0,0,0,0.1);">
            <img src="${imageUrl}" style="width:100%; border-radius:20px; display:block;">
            <div class="bubble" style="top:10%; left:5%;">💡 观察这里！</div>
            <div class="bubble" style="bottom:20%; right:10%;">✨ 关键点</div>
          </div>
          <h1 style="color:#854d0e; margin-top:30px;">${topics.join(' & ')}</h1>
        </body>
      `;
    }

    if (type === LessonType.DIALOGUE) {
      modeSpecificPrompt = `
        **微信对话模式要求：**
        1. **结构**：模拟微信聊天。
        2. **消息流**：将长讲解拆成多个气泡（每个气泡不超过40字）。
        3. **交互**：默认只显示第一条消息。用户可以点击“继续”按钮或自动延时（如2秒）弹出下一条消息。
        4. **角色**：老师头像（左侧，绿色气泡或白色气泡）、学生头像（右侧）。
        5. **气泡动效**：消息弹出时有轻微的上升和缩放动画。
      `;
    } else if (type === LessonType.SVG) {
      modeSpecificPrompt = `**动画模式要求：** 制作一个高度互动的 SVG 动画，点击不同部位会弹出对应的“知识气泡”讲解。${bubbleRequirement}`;
    } else if (type === LessonType.HTML) {
      modeSpecificPrompt = `**图文模式要求：** 采用华丽的 CSS 长卷设计。随着滚动，两旁会浮现出“划重点”气泡。${bubbleRequirement}`;
    } else if (type === LessonType.TEXT) {
      modeSpecificPrompt = `**文字模式要求：** 顶级科普排版。文章中穿插着像“贴纸”一样的侧边知识气泡，标注金句。${bubbleRequirement}`;
    }

    const response = await this.ai.models.generateContent({
      model: isProMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
      contents: `你是一位顶级教育开发者。请针对知识点：'${topics.join(', ')}'，为 ${age} 岁的孩子创作一个网页页面。
      
      ${modeSpecificPrompt}
      ${userInstruction}
      
      **技术规范：**
      - 单一 HTML 文件，包含 CSS (Tailwind 可用 CDN) 和 JS。
      - 背景色要舒适。
      - 只输出代码，不要 Markdown。`,
      config: {
        thinkingConfig: { thinkingBudget: isProMode ? 8000 : 4000 }
      }
    });

    return response.text || "<div>内容生成失败</div>";
  }
}
