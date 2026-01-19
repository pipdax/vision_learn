
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
2. **原子化拆解**：提取出的知识点不要总结成宏大的概论或大块的知识包。请轻微分解 these 概念，确保每个知识点都是“原子级”的、独立的专业学术概念，以便于后续针对性学习。
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
            text: `作为一名科学插画家，请为 ${age} 岁的孩子创作一张关于 "${topics.join(', ')}" 的极其生动形象的教学插图。要求：采用绝妙的比喻（如将电流比作奔跑的小鹿），风格温暖、细节丰富且高清，一眼就能激发孩子的探索欲。`
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
          <body style="margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#fff7ed; font-family:sans-serif; padding:20px; box-sizing:border-box; color:#7c2d12;">
            <div style="background:white; padding:15px; border-radius:30px; box-shadow:0 20px 50px rgba(124,45,18,0.1); display:flex; flex-direction:column; align-items:center; width:100%; max-width:900px;">
              <img src="${imageUrl}" style="width:100%; border-radius:20px; display:block;">
              <div style="margin-top:20px; font-weight:900; font-size:1.4rem; text-align:center;">
                ✨ 科学幻想画：${topics.join(' & ')}
              </div>
              <p style="margin-top:10px; font-size:0.9rem; opacity:0.8; text-align:center;">通过这幅画，你能发现隐藏在自然界里的秘密吗？</p>
            </div>
          </body>
        `;
      }
      return "<div>图片生成失败</div>";
    }

    let modeSpecific = "";
    if (type === LessonType.SVG) {
      modeSpecific = "使用高度互动的 SVG 动画，允许用户通过点击、拖拽或滑动来观察原理变化。包含明确的阶段性交互指引。";
    } else if (type === LessonType.HTML) {
      modeSpecific = "使用华丽的 HTML/CSS 排版，通过“长卷叙事”或“分步卡片”形式展现。加入精美的图表和色彩转场。";
    } else if (type === LessonType.TEXT) {
      modeSpecific = `作为一名世界顶级的金牌科普作家和排版设计师，请创作一篇“图解式科普专题”。
        要求：
        1. **文字叙事为主**：文字功底极深，逻辑如丝般顺滑。从孩子能触碰的生活常识切入，用绝妙的比喻（Metaphor）将知识点串联成一条完整的认知链路。
        2. **形象化点缀**：在纯文字讲述的过程中，偶尔利用 CSS 形状或简单的 inline SVG 绘制形象化的解释图（例如：用一个带动画的圆圈代表原子，或用简单的线条箭头展示力的方向），辅助文字理解。
        3. **极佳版式**：采用大字号、宽行距，优美的页边距设计。重要结论使用带有柔和背景色的“金句框”标注。
        4. **由浅入深**：严格遵循认知规律，先建立感性认识，再逐步推导理性原理。内容分段明确，加入适量的 Emoji 提升亲和力。`;
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `你是一位世界级的可视化教育专家和互动开发工程师。
请针对知识点：'${topics.join(', ')}'，为 ${age} 岁的学习者创作一个极具启发性的“认知旅程”页面。

**核心设计原则：**
1. **认知螺旋（由浅入深）**：不要一上来就讲原理。先从一个孩子能理解的生活常识或具体比喻（Metaphor）切入，通过互动或叙事逐步推导出深层的科学逻辑。
2. **知识链路化**：将所有选中的知识点串联成一个连贯的“故事线”或“逻辑链”。每一部分内容必须与前一部分有认知关联，确保知识链路不断裂。
3. **形象化与趣味性**：使用拟人、比喻或探险式的话术。视觉上要色彩明快、充满童趣，同时又不失科学的准确性。
4. **分步式/模块化结构**：如果内容涉及多个层面，请务必在页面内设计“展示模块切换”或“滚动叙事”，确保每个知识块都能被透彻讲解，不要全部堆叠在一起。
5. **技术实现**：
   - ${modeSpecific}
   - 代码必须包含在单一 HTML 结构中，包含所有 CSS 和 JS；
   - 页面背景要柔和，阅读体验要极致；
   - 只输出代码，严禁输出任何 Markdown 标记。`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    return response.text || "<div>生成内容失败</div>";
  }
}
