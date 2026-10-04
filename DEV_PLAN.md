# cuda-foundations 后续开发计划（供低成本模型执行版）

> 版本：2026-08-17
> 前置状态：P0 正确性修复已合并到工作区；`ctest --preset default` 在 sm_86 上 192/192 通过；
> 01 模块测试 52/52 通过；benchmark 全部 PASS。
>
> 本文档的目标读者是**未来的执行者（包括更便宜的模型）**。每项任务都写清楚了
> 文件路径、改动方式、验证命令和完成标准。执行原则只有一条：**没有跑通命令
> 就不算完成，不要因为“看起来对了”就跳过验证。**

---

## 0. 执行纪律（重要）

1. **一次只做一项任务**。改完一项，立即跑该项的验证命令。
2. **不要顺手重构**。计划外改动会造成 diff 难以审查。
3. **不要改性能数字**。任何性能数字必须先由脚本在真实 GPU 上测出来。
4. **不要提交未经测试的代码**。GitHub CI 只做 CPU 编译，GPU 测试需要本地跑。
5. **遇到环境错误先记录**，不要用 `GTEST_SKIP` 掩盖新的失败。

---

## 1. 现状与剩余问题清单

### 已完成（本阶段不用重做）

- 根 CMake 集成 01 模块：`cmake --preset default && cmake --build --preset default`
- `MemoryWrapper` 默认分配器修复
- 01 测试编译错误与容差修复
- `launch_flash_attention` 线程数修复 + 测试
- `launch_gemm_wmma` 非 16 倍数抛异常
- `InferenceEngine` 双缓冲 + 输入校验
- Python bindings 构建修复
- 文档去“工业级/生产级”，性能占位数字标注
- CI 增加 CUDA 编译 smoke job

### 2026-08-21 bug 排查修复（已完成，2026-08-22 全量回归通过）

以下修复 2026-08-22 在 GPU 恢复后完成全量验证：**`ctest` 261/261 通过**
（含 01-sgemm-tutorial 的 52 个测试，修复前从未被收集）。
验证中修正一处：`LoggerTest.SpecialCharacters` 原按旧语义用 `%%` 转义、
期望输出 `%`；logger 无参路径改为 verbatim 后，测试已按新语义更新
（原样输出特殊字符，断言 `%d %s %f` 逐字出现）。

- 根 CMake：`enable_testing()`/`include(CTest)` 移到所有 `add_subdirectory()` 之前，
  修复 01-sgemm-tutorial 的 ~52 个测试从未被 `ctest` 收集的问题（受控实验：209 → 261）。
- `04-inference-engine/include/stream_manager.h`：拆分 `init_locked()`，修复
  `get_stream()` 懒初始化时对非递归 `mutex_` 双重加锁导致的死锁（gdb 实锤）；修复
  `get_stream(int)` 负索引越界。
- `02-tensorcraft-core/include/tensorcraft/memory/memory_pool.hpp`：`clear()` 不再清空
  存活分配记录（修复泄漏）；`deallocate()` 移除 live 记录并防双重释放别名，外部指针
  直接 `cudaFree`。
- `04-inference-engine/include/memory_pool.h`：`allocate(0)` 直接返回 `nullptr`
  （原实现会经 `lower_bound(0)` 偷走缓存块）；`PooledMemory::copy_from_host/to_host`
  增加 `bytes <= size_` 校验。
- `04-inference-engine/include/logger.h`：无参 `format_string` 不再把运行期字符串
  当格式串传给 `snprintf`（消除 `-Wformat-security` 隐患）。
- `02-tensorcraft-core/include/tensorcraft/kernels/attention.hpp`：`launch_rope` 增加
  `max_cache_len` 参数并在越界时抛异常（更新 benchmark 调用点）。

### 下次待办（记录存档）

| 编号 | 问题 | 严重度 | 状态 |
|---|---:|---:|---:|
| D1 | WSL2 GPU 驱动栈崩溃（`nvidia-smi` 与最小 CUDA 程序均段错误，疑似宿主侧状态损坏，重启 WSL 即恢复） | 高 | ✅ 2026-08-22 恢复 |
| D2 | GPU 恢复后全量回归：`cmake --preset default && cmake --build --preset default && ctest`，预期 ~261 个测试全绿（含 01 模块 52 个） | 高 | ✅ 261/261 通过 |
| D3 | WSL2 链接 cuBLAS 的程序会经 `libcublasLt` 的 `RUNPATH=$ORIGIN` 解析到原生 `libcuda.so.580.173.02`（属 `libnvidia-compute-580` 包，WSL2 用不到）导致 `cudaGetDeviceCount` 失败；根治是移除该包，临时用 `export LD_LIBRARY_PATH=/usr/lib/wsl/lib` | 高 | 未复现（本次回归未见 cuBLAS 路径报错）；临时规避仍可用 |
| D4 | 复核修复后 `01-sgemm-tutorial` 模块用 nvcc 全量编译 + 跑完 52 个测试，确认无回归 | 中 | ✅ 随 261/261 一并验证 |

### 剩余问题（按优先级执行）

| 编号 | 问题 | 严重度 | 预估 |
|---|---:|---|---:|
| T1 | `01-sgemm-tutorial/src/utils/cuda_utils.cuh` 中 `initRandomMatrixGPU` 只生成 [0,1) 没有缩放到 [min,max]，且无人调用 | 低 | S |
| T2 | `02-tensorcraft-core/include/tensorcraft/kernels/attention.hpp` 中 MoE router 未校验 `num_experts`、`top_k` 边界 | 中 | S |
| T3 | 02 模块的 `conv2d.hpp` / `sparse.hpp` / `fusion.hpp` 测试覆盖不足 | 中 | M |
| T4 | 04 模块 `load_weights` 对损坏权重文件只检查 magic/version，未检查流读取失败和层数上限 | 中 | M |
| T5 | 04 模块 `Tensor::reshape` 未拒绝负数 dim；`matmul` 未校验 B 的 batch 形状 | 中 | S |
| T6 | 03 模块 CMake 不尊重根目录 `BUILD_TESTS` / `BUILD_BENCHMARKS` | 中 | S |
| T7 | 根 CMake 对 GoogleTest 的 FetchContent 重复声明（02/04 各一次） | 低 | S |
| T8 | 部分编译警告未清理（如 `-Wunused-parameter`） | 低 | S |
| T9 | WSL2 下 `ncu` 无性能计数器权限，尚未有真实 Nsight 报告 | 中 | M |
| T10 | 没有 `scripts/run_benchmarks.sh` 一键采集基准数据 | 中 | S |
| T11 | CI 没有 GPU runner，无法自动跑 `ctest` | 中 | M |
| T12 | 文档站 `docs/zh/benchmarks/index.md` 图表数据需保持与实测一致 | 低 | S |

---

## 2. 阶段一：剩余正确性修复（预计 1 周）

### T1 删除或修复 `initRandomMatrixGPU`

- 文件：`01-sgemm-tutorial/src/utils/cuda_utils.cuh` 约 L186
- 现状：函数体只生成 `[0,1)`，注释说要缩放但未缩放；全仓库无调用者。
- 方案 A（推荐）：删除整个函数。因为它不是测试路径，留着是误导。
- 方案 B：补一个 scale kernel，但会增加无用代码，不推荐。
- 验证：

  ```bash
  grep -R "initRandomMatrixGPU" 01-sgemm-tutorial/ || true
  cd 01-sgemm-tutorial && make benchmark && make test
  ```

- 完成标准：grep 无结果（方案 A），`make test` 仍 52/52 通过。

### T2 MoE router 输入校验

- 文件：`02-tensorcraft-core/include/tensorcraft/kernels/attention.hpp`
- 函数：`launch_moe_router<T>()`（约 L466）
- 现在：`moe_router_kernel<T, 8>` 固定 `MAX_EXPERTS=8`，`num_experts` 和 `top_k` 越界时行为未定义。
- 改动：
  1. 在 launch 前检查 `num_experts <= 8`，否则抛 `std::invalid_argument`。
  2. 检查 `top_k >= 1 && top_k <= num_experts`。
  3. 检查 `batch_size == 0` 时直接返回。
- 验证：在 `02-tensorcraft-core/tests/test_attention.cpp` 增加两个 `EXPECT_THROW` 用例；跑：

  ```bash
  cmake --build --preset default --target tensorcraft_tests
  LD_PRELOAD=/usr/lib/wsl/lib/libcuda.so.1 ./build/default/bin/tensorcraft_tests
  ```

### T5 Tensor 输入校验

- 文件：`04-inference-engine/include/tensor.h`
- 改动：
  1. `reshape` 中 `new_shape` 任一 dim `< 0` 抛 `std::invalid_argument`。
  2. `matmul` 增加 B 的 batch 形状校验（对 3D 以上，要求 B 的 batch dims 与 A 相同）。
- 验证：在 `04-inference-engine/tests/test_tensor.cpp` 加 2 个 `EXPECT_THROW` 用例；跑 `ctest --preset default`。

### T4 权重文件读取健壮性

- 文件：`04-inference-engine/src/inference_engine.cpp`，函数 `load_weights`
- 现在：只检查 `file.is_open()`，读取中途失败不会报错。
- 改动：
  1. 读取 header 后 `if (!file.good()) return false;`
  2. 每层读取 meta、weights、bias 后同样检查 `file.good()`，失败清空 `layers_` 并返回 `false`。
  3. `header.num_layers` 加一个合理上限（例如 1024）防止损坏文件导致 OOM。
- 验证：在 `tests/test_inference.cpp` 增加两个用例：
  - 写入半截文件（只写 header 不写 body）加载失败。
  - 写 `num_layers = 0xffffffff` 加载失败。
  跑：

  ```bash
  cmake --build --preset default --target mini_inference_tests
  LD_PRELOAD=/usr/lib/wsl/lib/libcuda.so.1 ./build/default/bin/mini_inference_tests
  ```

### 阶段一完成标准

- `ctest --preset default` 在 GPU 上 192/192 通过，新增测试也计入总数。
- 所有新增失败路径都有 `EXPECT_THROW` 或 `EXPECT_FALSE` 覆盖。

---

## 3. 阶段二：测试覆盖补齐（预计 1 周）

### T3.1 conv2d 基础正确性测试

- 文件：新建 `02-tensorcraft-core/tests/test_conv.cpp`
- 参考：`include/tensorcraft/kernels/conv2d.hpp` 的 API
- 测试内容：
  1. 单通道 4x4 输入，2x2 kernel，与 CPU 参考比较。
  2. 多通道 2x3x5x5 输入，与 CPU 参考比较。
  3. `padding=1, stride=1` 和 `padding=0, stride=2` 两种配置。
- 加入 `tests/CMakeLists.txt` 的 `tensorcraft_tests` 源文件列表。
- 完成标准：新测试全绿。

### T3.2 sparse 基础正确性测试

- 文件：新建 `02-tensorcraft-core/tests/test_sparse.cpp`
- 测试内容：
  1. `dense_to_csr` 与 `csr_to_dense` 往返。
  2. `spmv_csr` 与 CPU 参考比较。
  3. `spmm_csr` 与 CPU 参考比较。
- 注意：先只测 float，不测 half。
- 完成标准：新测试全绿。

### T3.3 fusion 基础正确性测试

- 文件：新建 `02-tensorcraft-core/tests/test_fusion.cpp`
- 测试内容：`launch_gemm_fused` 的 epilogue 与 CPU 参考比较。
- 完成标准：新测试全绿。

### 阶段二完成标准

- `tensorcraft_tests` 中覆盖 conv/sparse/fusion 的基础正确性。
- `ctest --preset default` 在 GPU 上全部通过，无新增 skip。

---

## 4. 阶段三：基准与性能证据（预计 1 周）

### T10 一键基准脚本

- 文件：新建 `scripts/run_benchmarks.sh`
- 脚本内容：

  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  echo "== GPU info =="
  nvidia-smi --query-gpu=name,driver_version,compute_cap --format=csv
  echo "== CUDA info =="
  nvcc --version | tail -2
  echo "== Build =="
  cmake --preset default
  cmake --build --preset default -j
  echo "== 01 benchmark =="
  (cd 01-sgemm-tutorial && make benchmark)
  LD_PRELOAD=/usr/lib/wsl/lib/libcuda.so.1 ./01-sgemm-tutorial/build/sgemm_benchmark -a
  echo "== 02 gemm benchmark =="
  LD_PRELOAD=/usr/lib/wsl/lib/libcuda.so.1 ./build/default/bin/gemm_benchmark \
    --benchmark_min_time=0.1s --benchmark_repetitions=3
  ```

- 说明：`LD_PRELOAD` 仅在 WSL2 下需要，普通 Linux 删除。
- 完成标准：脚本可重复执行，输出可复制粘贴到结果文档。

### T9 Nsight 运行手册

- 文件：新建 `docs/en/guides/profiling.md` 或更新 `docs/en/reference/troubleshooting.md`
- 内容：
  1. `nsys profile --stats=true -o /tmp/sgemm -f true ./01-sgemm-tutorial/build/sgemm_benchmark -s 1024`
  2. `ncu --set basic --kernel-name regex:tiled_sgemm_kernel --launch-count 1 ./01-sgemm-tutorial/build/sgemm_benchmark -s 1024`
  3. 每个指标如何读：occupancy、memory workload、stall reasons。
- 当前机器限制：WSL2 下 `ERR_NVGPUCTRPERM`，需在裸 Linux/云 GPU 执行。
- 完成标准：文档给出可复制的命令和解读步骤；如果后续拿到有权限机器，补充真实截图。

### 阶段三完成标准

- `scripts/run_benchmarks.sh` 一键生成基准输出。
- `docs/en/benchmarks/` 下新增对应 GPU 的实测结果文件。
- profiling 文档可执行。

---

## 5. 阶段四：工程化收尾（预计 3 天）

### T6 03 模块尊重根选项

- 文件：`03-hpc-advanced/CMakeLists.txt`
- 现在：无条件 `enable_testing()` 和 `add_subdirectory(tests)`
- 改动：
  1. 根 `CMakeLists.txt` 向 03 传递 `BUILD_TESTS` / `BUILD_BENCHMARKS`。
  2. 03 的 `if(BUILD_TESTS) enable_testing(); add_subdirectory(tests); endif()`
- 验证：

  ```bash
  cmake -S . -B build/min -G Ninja -DBUILD_HPC_ADVANCED=ON -DBUILD_TESTS=OFF
  cmake --build build/min -j4
  test ! -e build/min/03-hpc-advanced/tests
  ```

### T7 根 CMake 统一 GoogleTest FetchContent

- 文件：根 `CMakeLists.txt`
- 方案：
  1. 在根 CMake 的 `if(BUILD_TESTS)` 中统一 FetchContent GoogleTest。
  2. 02/04 子模块只保留 `find_package` 或检查 `TARGET GTest::gtest`。
- 注意：03 的 RapidCheck 仍自己拉取。
- 验证：删掉 `build/` 后重新 `cmake --preset default && cmake --build --preset default` 一次通过。

### T8 清理常见编译警告

- 文件：
  - `04-inference-engine/benchmarks/benchmark.cpp` 的未使用参数 `M,N,K`。
  - `04-inference-engine/benchmarks/mnist_demo.cpp` 的未使用 `argc,argv`。
  - `04-inference-engine/include/vectorized_gemm.cuh` 的 `A_STRIDE/B_STRIDE`。
- 改动：删除或 `(void)var;`。
- 验证：重新 build 后相关文件无 warning。

### T11 GPU CI（可选）

- 如果你有自托管 runner 或云 GPU runner：
  - 新建 `.github/workflows/gpu-tests.yml`
  - 触发：`workflow_dispatch` 或 tag `v*`
  - 步骤：checkout → 安装 CMake → `cmake --preset default` → build → `ctest --preset default`
- 如果没有，保持现有 `cuda-build-smoke` 编译检查即可。

### 阶段四完成标准

- 从零 configure + build + test 一次通过。
- 编译日志中关键源文件无 warning。

---

## 6. 阶段五：本仓库归档与后续项目转移

### 归档动作

- [ ] `ROADMAP.md` 中所有勾选项完成或显式标注 blocked。
- [ ] `README.md` / `README.zh-CN.md` 显示当前状态：教学仓库，维护模式。
- [ ] `CHANGELOG.md` 记录 `1.0.x` 的归档版本。
- [ ] 给仓库打 tag：`git tag v1.0.1 && git push origin v1.0.1`。

### 后续项目（按 LEARNING_PATH.md 顺序）

| 顺序 | 仓库 | 目标 | 完成证据 |
|---|---|---|---|
| 1 | `trifuse` | Triton 算子、在线 softmax、输入契约 | Triton vs PyTorch/NumPy 一致 |
| 2 | `cuflash` | FlashAttention 前后向、数值稳定性、性能分析 | 多精度与 causal 正确性测试 |
| 3 | `tiny-llm` | 模型加载、Tensor、算子编排、采样、token 生成 | 真实模型端到端生成 token |
| 4 | `paged-serving` | Paged KV、continuous batching、限流、取消、指标 | 并发请求资源守恒测试 |

### 模型推理部署加速岗位的额外清单（与仓库无关）

- [ ] TensorRT 或 ONNX Runtime 部署一个 HuggingFace 小模型，测 latency/throughput。
- [ ] vLLM / Triton Inference Server 各跑通一次 continuous batching 请求。
- [ ] 用一个 FP16/INT8 量化模型，测显存和吞吐变化。
- [ ] 用 CUDA Graph 减少小 batch 推理 launch 开销。
- [ ] 手写一个 KV cache 管理小 demo，解释 `used + free == total` 不变量。
- [ ] 用 `nsys` 分析一个真实推理请求，找到 CPU/GPU 空洞。

---

## 7. 总完成定义（Definition of Done）

本仓库可以宣布结束，当且仅当：

1. 一次干净构建与测试通过：

   ```bash
   cmake --preset default
   cmake --build --preset default
   ctest --preset default
   ```

2. 01 模块测试通过：`cd 01-sgemm-tutorial && make test`
3. `scripts/run_benchmarks.sh` 可一键采集基准。
4. `docs/en/benchmarks/` 中只有实测数据，无未标注的占位数字。
5. README/ROADMAP/CHANGELOG 明确说明仓库处于维护模式，不再新增模块。
6. 后续精力投入 `tiny-llm` 与 `paged-serving`，而不是继续扩写本仓库。

完成后，这个仓库在求职中的定位就是：**一个能证明你“能把 CUDA kernel 写对、测对、说清楚”的基础教学作品**，
而真正的“推理部署加速”项目证据由 `tiny-llm` 和 `paged-serving` 承担。
