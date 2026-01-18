
import { GoogleGenAI, Type } from "@google/genai";
import { LessonType } from "../types";

export class GeminiService {
  private get ai(): GoogleGenAI {
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
            text: `你是一个深耕由简入繁教学法的教育专家。
请观察这张图片并提取核心知识点，以供 ${age} 岁的学习者进行探索：
1. **优先识别标注**：如果图片中存在红框、线条或其他明显的视觉标记，请重点分析这些标记所指示的对象、现象或科学原理。
2. **全局分析模式**：如果图片中没有任何标注，请自动识别整张图片中最重要的 3-5 个具有教育意义的核心知识点。
3. **认知匹配**：知识点的命名要符合 ${age} 岁孩子的语言习惯，既要准确又要生动。

请直接输出一个 JSON 列表，格式为 ["知识点1", "知识点2", ...]。
注意：只输出 JSON 数组，严禁输出任何 Markdown 标记或多余的解释性文字。`,
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
      // 清理可能出现的 markdown 块包裹
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response", e);
      return [];
    }
  }

  async subdivideTopics(topics: string[], age: number): Promise<string[]> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一个教育心理学专家。针对以下知识点：'${topics.join(', ')}'，为 ${age} 岁的学习者进行深度拆解。
      目标：将这些概念分解为更底层、认知负担更轻的 3-5 个基础组成要素。
      要求：
      1. 返回一个 JSON 字符串数组；
      2. 每个拆解后的概念要足够简单具体；
      3. 只返回 JSON，不要任何其他文字。`,
      config: {
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
      console.error("Failed to subdivide topics", e);
      return topics;
    }
  }

  async generateLesson(topics: string[], age: number, type: LessonType): Promise<string> {
    if (type === LessonType.IMAGE) {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{
            text: `作为一名科学插画家，请为 ${age} 岁的孩子创作一张关于 "${topics.join(', ')}" 的形象化教学插图。画面要直观、艺术化，能够一眼看出科学原理。风格偏向可爱且高清。`
          }]
        },
        config: {
          imageConfig: { aspectRatio: "16:9" }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        return `
          <body style="margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#f8fafc; font-family:sans-serif; padding:20px; box-sizing:border-box;">
            <img src="${imageUrl}" style="max-width:100%; max-height:85%; border-radius:20px; shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);">
            <div style="margin-top:20px; color:#1e293b; font-weight:bold; font-size:1.2rem; text-align:center;">
              🎨 形象化讲解：${topics.join(' & ')}
            </div>
          </body>
        `;
      }
      return "<div>图片生成失败</div>";
    }

    const instruction = type === LessonType.SVG 
      ? "使用复杂的交互式 SVG 动画，包含 JS 逻辑让用户可以点击或拖拽来理解原理。"
      : "使用精美的 HTML 布局，侧重于直观的文字排版、静态图表和色彩搭配。";

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `你是一个可视化编程和教育专家。用户年龄 ${age} 岁。请针对知识点 '${topics.join(', ')}' 生成一个独立的 HTML 片段。
      要求：
      1. ${instruction}
      2. 代码必须包含在单一 HTML 结构中，包含 CSS 和必要的 JS；
      3. 风格可爱、直观、色彩明快；
      4. 只输出纯代码，不要输出 Markdown 标记。`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    return response.text || "<div>生成内容失败</div>";
  }
}
