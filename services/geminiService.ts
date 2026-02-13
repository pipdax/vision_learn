
import { GoogleGenAI, Type } from "@google/genai";
import { LessonType } from "../types";

export interface RequestOptions {
  signal?: AbortSignal;
}

export class GeminiService {
  private customApiKey?: string;

  /**
   * 设置手动输入的 API Key
   */
  setApiKey(key?: string) {
    this.customApiKey = key;
  }

  private get ai(): GoogleGenAI {
    // 优先使用手动输入的 Key，否则使用环境注入的 Key
    const apiKey = this.customApiKey || process.env.API_KEY;
    return new GoogleGenAI({ apiKey: apiKey || "" });
  }

  /**
   * 验证当前 Key 是否支持 Pro 模式模型
   */
  async validateProKey(): Promise<boolean> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: 'Hi',
        config: { maxOutputTokens: 1 }
      });
      return !!response;
    } catch (e) {
      console.error("Pro Key Validation Failed:", e);
      return false;
    }
  }

  /**
   * 鲁棒地清理并提取 AI 返回的 HTML 内容
   */
  private cleanResponse(text: string): string {
    if (!text) return "";
    let cleaned = text.trim();
    const htmlBlockRegex = /```html([\s\S]*?)```/i;
    const genericBlockRegex = /```([\s\S]*?)```/;
    
    const match = cleaned.match(htmlBlockRegex) || cleaned.match(genericBlockRegex);
    if (match) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    return cleaned;
  }

  async analyzeText(text: string, age: number, options?: RequestOptions): Promise<string[]> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位严谨的学科知识架构师。针对以下文本内容，请为 ${age} 岁的学习者提取其中的专业核心知识点。
      
      文本内容：
      "${text}"

      要求：
      1. 必须提取出背后的原子化概念。
      2. 使用规范的学术或学科术语。
      3. 直接输出 JSON 数组格式。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      requestOptions: options
    });

    try {
      return JSON.parse(this.cleanResponse(response.text || "[]"));
    } catch (e) {
      return [];
    }
  }

  async analyzeImage(base64Image: string, age: number, options?: RequestOptions): Promise<string[]> {
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
            text: `你是一位严谨的学科知识架构师。请为 ${age} 岁的学习者提取图片中的专业核心知识点。
            要求：
            1. 形象化描述仅作为辅助，必须提取出其背后的原子化概念。
            2. 使用规范的学术或学科术语。
            3. 直接输出 JSON 数组格式。`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      requestOptions: options
    });

    try {
      return JSON.parse(this.cleanResponse(response.text || "[]"));
    } catch (e) {
      return [];
    }
  }

  async subdivideTopics(topics: string[], age: number, options?: RequestOptions): Promise<string[]> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `针对知识点：'${topics.join(', ')}'，进行单层深度的学科逻辑拆解。仅输出紧邻的、必须掌握的先验知识。
      要求：专业、严谨，避免过度形象化。请直接输出一个 JSON 字符串数组。`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      requestOptions: options
    });

    try {
      return JSON.parse(this.cleanResponse(response.text || "[]"));
    } catch (e) {
      return topics;
    }
  }

  async generateLesson(topics: string[], age: number, type: LessonType, isProMode: boolean, extraRequirements?: string, options?: RequestOptions): Promise<string> {
    const userInstruction = extraRequirements ? `\n**个性化补充要求：**\n${extraRequirements}\n` : "";

    const pedagogyPhilosophy = `
      **教育设计原则（必须遵守）：**
      1. **内容为王**：讲解必须基于真实的科学逻辑或学科知识。形象化比喻必须精准、克制，严禁为了追求趣味性而产生误导。
      2. **形式服务内容**：视觉设计必须引导学生关注关键结构。
      3. **侧边避让标注系统**：所有的知识气泡必须内置在页面中，通过长连接线指向具体锚点，且排列在内容左右两侧，严禁遮挡核心插图或文字。
    `;

    const commonModel = isProMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    if (type === LessonType.IMAGE) {
      const modelName = isProMode ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      const imageConfig: any = { aspectRatio: "16:9" };
      if (isProMode) imageConfig.imageSize = "2K";

      const imageResponse = await this.ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{
            text: `创作一张关于 "${topics.join(', ')}" 的专业教学插图。要求：结构精确，学科逻辑清晰，绘图风格严谨且高质，适合 ${age} 岁教育场景。${userInstruction}`
          }]
        },
        config: { imageConfig },
        requestOptions: options
      });

      let imageUrl = '';
      if (imageResponse.candidates && imageResponse.candidates[0]) {
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      const htmlResponse = await this.ai.models.generateContent({
        model: commonModel,
        contents: `你是一位殿堂级数字化教育专家。请针对图片中的知识点：'${topics.join(', ')}'，生成一段完整的 HTML 代码。
        
        ${pedagogyPhilosophy}
        
        **功能要求：**
        1. 页面中心展示图片（使用占位符 [IMAGE_URL]）。
        2. 实现“侧边避让式标注系统”：通过 JS 在图片两旁生成 3-5 个专业知识点气泡。
        3. 每个气泡用精细的 SVG 虚线连接到图片中对应的准确位置。
        
        **代码交付：**
        仅输出纯 HTML 代码，包含 CSS 和 JS，不要 Markdown 包裹。`,
        config: { thinkingConfig: { thinkingBudget: isProMode ? 8000 : 4000 } },
        requestOptions: options
      });

      const rawHtml = this.cleanResponse(htmlResponse.text || "");
      return rawHtml.replace(/\[IMAGE_URL\]/g, imageUrl);
    }

    let modeConstraint = "";
    switch (type) {
      case LessonType.DIALOGUE: modeConstraint = "采用专业、启发式的导师对话风格。"; break;
      case LessonType.SVG: modeConstraint = "创作展示学科运行逻辑的精细 SVG 动画。"; break;
      case LessonType.HTML: modeConstraint = "采用长轴叙事风格，气泡随滚动自然在侧边出现。"; break;
      case LessonType.TEXT: modeConstraint = "学术杂志级排版，利用页边距进行专业注记。"; break;
    }

    const response = await this.ai.models.generateContent({
      model: commonModel,
      contents: `你是一位数字化教育专家。请针对知识点：'${topics.join(', ')}'，为 ${age} 岁的学习者创作一个网页页面。
      
      ${pedagogyPhilosophy}
      **特定模式：** ${modeConstraint}
      ${userInstruction}
      
      **技术规范：**
      - 仅输出完整的、自包含的 HTML 源代码。
      - 背景色专业、沉稳。`,
      config: {
        thinkingConfig: { thinkingBudget: isProMode ? 8000 : 4000 }
      },
      requestOptions: options
    });

    return this.cleanResponse(response.text || "<div>生成失败，请重试。</div>");
  }
}
