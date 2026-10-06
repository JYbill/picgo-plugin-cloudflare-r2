---
name: test-optimize
description: 优化单元测试、集成测试和端到端测试的类型选择、断言、mock、测试数据与评审质量。用户要求新增、修复、重构或评审测试，处理无意义断言、mock、覆盖率、spec、integration 或 e2e 边界时使用。
---

# test-optimize

## 目标

用能提供有效信心的最小测试类型，证明调用方真正依赖的行为。测试代码要聚焦规则、转换、边界和错误，不要验证测试准备代码或语言本身。

## 执行流程

```text
[收到测试任务]
        |
        v
[定位真实风险与可观察行为]
        |
        | 完成：能说明删除哪条规则会使测试失败
        v
[按真实依赖边界选择测试类型]
        |
        | 完成：测试类型与实际触达边界一致
        v
[按读取规则加载 reference]
        |
        v
[删除或改写无意义测试]
        |
        | 完成：每个断言都会在目标行为回归时失败
        v
[运行最小相关测试、文件级 lint 和类型检查]
        |
        | 完成：所有命令无错误、无警告，且未放宽断言
        v
[报告修改、保护行为与验证结果]
```

## 读取规则

- 选择或调整测试类型时，读取 [references/test-types.md](references/test-types.md)。
- 新增、修改或评审单元测试的断言、命名、测试数据和注释时，读取 [references/assertions-and-comments.md](references/assertions-and-comments.md)。
- 测试使用 mock、stub、spy 或涉及真实依赖边界时，读取 [references/mocking.md](references/mocking.md)。
- 新增、修改或评审任何测试时，必须读取 [references/anti-patterns.md](references/anti-patterns.md)，对照其中的反面例子清理无意义测试逻辑。

## 完成标准

- 测试只保留真实行为、边界、错误或对外契约断言。
- expected 由规则独立定义，不是从 setup 对象原样复制。
- mock 只隔离与当前风险无关的协作者，不代替正在验证的行为。
- 单元测试块和断言注释符合项目规范，注释说明目的、总结和期待。
- 完成最小相关验证；只在影响共享行为时扩大范围。

## 回复要求

只报告选择的测试类型及原因、删除或改写的无意义逻辑、当前保护的行为，以及实际执行的验证命令和结果。
