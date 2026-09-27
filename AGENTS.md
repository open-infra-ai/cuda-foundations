# cuda-foundations · Agent 约定

## 重要改动必须留笔记

本仓使用 [write-notes-like-deepseek](.agents/skills/write-notes-like-deepseek/SKILL.md)
决策笔记体系（方法提炼自 DeepSeek Harness 工程实践）。

1. 非平凡改动（改了行为、架构、跨文件契约、流程与工具链、测试策略、落盘/网络/配置格式）前，遵循
   `.agents/skills/write-notes-like-deepseek/SKILL.md` 写或更新笔记；机械性小改
   （样式、格式化、打标、不改行为的补丁）直接提交。
2. 写之前先检索 `.agents/notes/` 里的同主题旧笔记：有归属就地更新；新想法先放
   `proposed/`，落地随同代码改动转 `implemented/`；新方案彻底取代旧决策时，
   同批归档旧篇并标明被谁取代。
3. 被放弃的方案先写它最强的理由，再解释为什么不用。
4. 提交前跑 `npm run verify-notes`，红了先修再交。

笔记路径即状态：`.agents/notes/{proposed,implemented,rejected,archived}/{feature,bug-fix,simplification,architecture,process,testing}/yyyy-mm-dd-topic.md`。

## 写文档

- 写/改 agent 可见文档（本文件、skill、指针文档）：先读
  `.agents/skills/writing-for-agents/SKILL.md`
- 写/改用户可见技术文档（README、docs/）：遵循
  `.agents/skills/documentation-writer/SKILL.md`（Diátaxis 四象限）
