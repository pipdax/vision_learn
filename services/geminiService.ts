
import { GoogleGenAI, Type } from "@google/genai";
import { LessonType } from "../types";

export class GeminiService {
  private get ai(): GoogleGenAI {
    // 每次调用时重新实例化，以确保使用最新的 API Key（适配 Pro/Veo 模型的 Key 选择机制）
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

  async generateLesson(topics: string[], age: number, type: LessonType, isProMode: boolean, extraRequirements?: string): Promise<string> {
    const userInstruction = extraRequirements ? `\n**用户的额外个性化要求（请务必最高优先级满足）：**\n${extraRequirements}\n` : "";

    if (type === LessonType.IMAGE) {
      const modelName = isProMode ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      const imageSize = isProMode ? '4K' : '1K';
      const promptTitle = isProMode ? '4K 高清手绘风格教学插图' : '教学插图';
      const extraStyle = isProMode ? `
            **艺术风格指南：**
            1. **手绘感**：画面应展现出细腻的水彩、色粉或素描笔触质感，避免冷冰冰的 3D 或纯矢量感，要具有温暖的人文艺术气息。
            2. **4K 高清细节**：利用极致的分辨率表现丰富的自然纹理和光影层次。
            3. **巧妙比喻**：采用绝妙的视觉比喻（如将复杂的系统比作童话里的工厂或奇幻森林），一眼就能激发孩子的探索欲和好奇心。` : '';

      const imageConfig: any = {
        aspectRatio: "16:9"
      };
      if (isProMode) {
        imageConfig.imageSize = "4K";
      }

      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{
            text: `作为一名享誉世界的顶级手绘艺术大师和科学插画家，请为 ${age} 岁的孩子创作一张关于 "${topics.join(', ')}" 的 ${promptTitle}。
            ${extraStyle}
            ${userInstruction}`
          }]
        },
        config: {
          imageConfig: imageConfig
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
        const titleLabel = isProMode ? '🎨 4K 艺术手绘专题' : '🎨 形象绘图专题';
        return `
          <body style="margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#fff7ed; font-family:sans-serif; padding:20px; box-sizing:border-box; color:#7c2d12;">
            <div style="background:white; padding:15px; border-radius:30px; box-shadow:0 20px 50px rgba(124,45,18,0.1); display:flex; flex-direction:column; align-items:center; width:100%; max-width:900px;">
              <img src="${imageUrl}" style="width:100%; border-radius:20px; display:block; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              <div style="margin-top:20px; font-weight:900; font-size:1.4rem; text-align:center;">
                ${titleLabel}：${topics.join(' & ')}
              </div>
              <p style="margin-top:10px; font-size:0.9rem; opacity:0.8; text-align:center; max-width: 600px;">
                ${isProMode ? '这张充满艺术感的手绘图展示了科学之美。精细的笔触下，隐藏着关于自然界的绝妙奥秘。' : '这张精美的绘图展示了相关的科学原理，帮助你更直观地理解这些知识点。'}
              </p>
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
      modeSpecific = `作为一名世界顶级的金牌科普作家 and 排版设计师，请创作一篇“图解式科普专题”。文字叙事为主，逻辑如丝般顺滑，多用形象比喻。`;
    } else if (type === LessonType.DIALOGUE) {
      modeSpecific = `
        作为一名富有幽默感和教学技巧的“老师”，请以**微信对话**的形式讲解知识。
        
        **交互与风格要求：**
        1. **消息流设计**：将讲解内容拆解为多条短消息（每条消息建议不超过50字）。
        2. **对话感**：包含“老师”讲解和“学生”偶尔的感叹或追问（如：哇！真的吗？）。
        3. **微信UI**：生成一个模拟微信聊天界面的 HTML。
        4. **播放逻辑**：页面加载后，消息应像聊天一样逐条“弹出”（带有轻微的时间间隔，或者点击按钮显示下一条）。
        5. **视觉元素**：使用Emoji，设计典型的老师头像（如知性形象）和学生头像（如活泼形象）。
      `;
    }

    const response = await this.ai.models.generateContent({
      model: isProMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
      contents: `你是一位可视化教育专家。请针对知识点：'${topics.join(', ')}'，为 ${age} 岁的学习者创作一个讲解页面。

**核心逻辑：**
1. **认知引导**：由浅入深，比喻生动。
2. **场景化**：将知识点代入具体场景。
3. **技术实现**：
   - ${modeSpecific}
   ${userInstruction}
   - 代码必须包含在单一 HTML 结构中，包含所有 CSS 和 JS；
   - 只输出代码，严禁输出任何 Markdown 标记。`,
      config: {
        thinkingConfig: { thinkingBudget: isProMode ? 8000 : 4000 }
      }
    });

    // Special logic for Dialogue mode to ensure it handles message flow
    let content = response.text || "<div>生成内容失败</div>";
    
    // If it's a dialogue, we want to make sure the AI included the sequence logic.
    // The prompt already asks for it, but if it returned raw text, we wrap it in a default chat container.
    return content;
  }
}
