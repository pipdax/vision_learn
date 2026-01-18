
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
            text: `你是一位严谨的学科知识架构师和计算机视觉分析专家。
请观察这张图片，并为 ${age} 岁的学习者提取其中的专业学术核心知识点。

**任务约束：**
1. **模式判定**：
   - 优先识别标注：如果图片中有红框、圈选或线条等标注，请精确分析标注区域。
   - 全局扫描：若无标注，请分析全图。
2. **原子化拆解**：提取出的知识点不要总结成宏大的概论或大块的知识包。请轻微分解这些概念，确保每个知识点都是“原子级”的、独立的专业学术概念，以便于后续针对性学习。
3. **理性表达**：必须使用标准的、理性的学术术语。严禁使用形象化或幼儿化的表述（例如：使用“光合作用”而非“植物吃阳光”）。
4. **学科归属**：识别结果应具有明确的学科边界。

请直接输出一个 JSON 数组，格式如下：["知识点1", "知识点2", ...]。
注意：只输出 JSON 数组，严禁包含 Markdown 代码块或任何解释性文字。`,
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
      contents: `你是一位深耕学科知识图谱的资深教育专家。
针对当前知识点：'${topics.join(', ')}'，请进行单层深度的认知下钻拆解。

**下钻拆解逻辑（思维链）：**
1. **单层回溯**：采用“从高年级向低年级”追溯的逻辑，仅拆解出理解当前知识点所必需的“直接下一层”基础依赖或先验知识。
2. **拒绝过度拆解**：不要试图一次性拆解到最底层的物理事实。一次只走一步，仅输出当前层级所依赖的紧邻基础概念。
3. **专业理性**：表述必须保持理性和学术性，不需要任何形象化的修饰。
4. **认知定位**：确保拆解出的知识点在认知难度上略低于当前选中的知识点，且逻辑严密。

**输出规范：**
- 仅返回一个 JSON 字符串数组。
- 严禁输出任何 JSON 以外的内容。`,
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
