# cuda-foundations 路线图

> 仓库名：[`cuda-foundations`](https://github.com/open-infra-ai/cuda-foundations)
> 定位：GPU 学习主线（五主仓）的 **CUDA 系统教学仓**，`phase-2-e` 面试就绪冻结。
> 可执行的分步开发计划见 [DEV_PLAN.md](DEV_PLAN.md)。
> 旗舰开发投入在 [tiny-llm](https://github.com/open-infra-ai/tiny-llm)（运行时）与
> [cuflash](https://github.com/open-infra-ai/cuflash)（kernel 深度）。
>
> 归档状态：DEV_PLAN.md 的 T1–T12 已全部落地。
> 2026-08-23 在 RTX 3060 Laptop（sm_86、CUDA 12.0）执行
> `ctest --preset default`：261/261 通过。组织 landing 页：<https://github.com/open-infra-ai/open-infra-ai>

## 面试前必做（数据可信度）

- [x] **复核 SGEMM 优化阶梯的全部 TFLOPS 数字** ~~(2026-08-17, RTX 3060 Laptop; see docs/en/benchmarks/)~~（01-sgemm-tutorial 与 03-hpc-advanced 文档）：
      在自己可支配的 GPU 上重跑每一步并记录硬件与复现命令；凡是引自教学材料而非自测的数字，
      要么重测覆盖，要么在文档中明确标注来源
- [x] 为优化阶梯补一份 nsys/ncu 实操示例（真实 trace 截图 + 瓶颈解读）`WSL2 GPUCTRPERM 不可用，已提供可复制命令的 runbook：docs/en/guides/profiling.md`
- [x] 检查 docs 站点构建无死链（Pages workflow 为绿色） ~~(CI pages job 一直通过)~~

## 结构维护

- [x] 保持 LEARNING_PATH.md 作为 GPU 学习主线（五主仓）导航的唯一权威入口（2026-08-21 起迁至 meta 仓 `open-infra-ai/open-infra-ai`），新增仓库或改名时同步更新
- [x] 保持 04-inference-engine 与 tiny-llm 的边界说明 ~~(README/ROADMAP 已明确)~~：前者是"kernel/内存/流如何组装进小系统"的教学演示，
      后者是面向真实模型权重的运行时（避免面试官问"这两个什么关系"时答不清）
- [x] 每个模块保持"一个教学角色只留一份实现"的既有收敛原则 ~~(本次归档已按此原则清理)~~

## 明确不做

- 不再新增模块或扩大范围；新想法优先进入对应专项仓库
- [x] 不在文档中写入未经本机测量的性能数字 ~~(2026-08-17 已清理，仅保留实测数据)~~
