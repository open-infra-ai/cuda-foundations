# Agent Note: 笔记工具只暴露完整交付的命令

Status: implemented

## Problem

看板入口依赖未入仓的 HTML 模板，部分仓连脚本也未入仓；本地忽略文件会掩盖
干净检出的失败。只通过笔记格式校验不能证明命令可运行。

## Decision

package 与 skill 只暴露已交付的笔记校验、归档和锚点检查入口。缺少模板的看板
入口和已跟踪的生成脚本撤下，不删除本地未跟踪副本或生成结果。归档行为由
[归档预检](../bug-fix/2026-10-04-archive-preflight.md)定义，CLI 回归接入 notes 门禁。

## Alternatives considered

补齐 HTML 模板可保留看板功能，但当前整改目标是可验证的工具链；没有评审和
回归覆盖的可视化资产不作为交付条件。

仅加缺模板警告能解释失败，但仍向用户暴露必然失败的命令。选择收窄公开入口。

## Verification

所有保留的 package 命令目标均须进入 git tree；`npm run verify-notes` 同时执行
结构、格式、封印和临时目录中的真实归档 CLI 回归，不移动实际笔记。

文档站回归允许根 AGENTS.md 承载已交付的本地笔记约定，并校验三个 skill 指针与
四项 notes gate 的真实文件。旧 OpenSpec、Copilot setup 和其他已撤下的框架文件
仍被拒绝；不删除新增治理约定，也不关闭原有简化回归。初版 CI 的 7 项文档测试
中该旧期望失败，修正契约后 8 项通过。

## Consequences

干净检出不依赖隐藏资产；代价是没有内置看板。若恢复可视化，模板、生成器和
干净检出回归必须同批交付。既有笔记、归档封印和历史实验不受影响。
