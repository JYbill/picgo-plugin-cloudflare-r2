# React DDT

React DDT 用来审查 React 组件、React hook 和 `.tsx` 文件里的职责放置错误。它和通用 DDT 同时生效：该抽离的纯逻辑要抽离，不该为了形式新增的薄包装要收回。

## 核心边界

React 组件文件只保留渲染、props 解构、React hook 调用、事件 handler、与当前组件 state / ref / effect 强绑定的逻辑，以及必要的 JSX 分支。

React hook 主文件只保留 hook 自身的 state、ref、memo、effect、callback 编排，以及必须读取 hook 内状态的闭包逻辑。

如果组件或 hook 里存在与 React state、ref、effect 生命周期无关的纯函数，先判断它是否真的值得抽离。值得抽离时，按项目文件命名规范放置：源文件专属工具函数放到 `{源文件}.util.ts`，目录级共享工具函数才放到 `util.ts`；只被调用一次、逻辑很薄、名字不能提供新语义时，内联回调用处。

React 前端 `util` 文件中存在明确主从调用关系的紧密相关方法，且这些方法都值得保留时，使用同一个静态 class 组织为静态方法，不要平铺为多个顶层函数。只服务于主方法的耦合子方法使用 `private static`；没有主从关系的独立工具方法不强行放进同一个 class。

```ts
export class DisplayMessageUtil {
  static buildDisplayMessages(messages: Message[]) {
    // ...
    return this.buildDisplayTurn(messages)
  }

  private static buildDisplayTurn(turnMessages: Message[]) {
    // ...
  }
}
```

如果耦合子方法只是很薄的单一调用方 helper，仍优先内联回主方法，不要为了组成静态 class 而保留无收益的拆分。

如果存在静态常量，先判断引用次数和语义收益。只有被多处稳定复用，或表达外部协议、复杂业务边界且抽离能降低阅读成本时，才抽到当前目录下的 `enum.ts`。只有一处引用的 enum、`const`、`as const` 对象、延迟时间、阈值、固定 key、状态值等，默认直接耦合在使用处。

如果存在类型定义，先判断它是否应该从 React 主文件中移出。确认值得剥离时，先按项目类型文件规则和现有目录模式决定落点；项目没有约束时，再使用同目录 `{源文件名}.d.ts`，例如 `ChatComponent.tsx` 对应 `ChatComponent.d.ts`。

## React 判断图

```text
看到 React 文件里的函数 / 常量 / 类型 / 兜底分支
        │
        ▼
它是否属于 React 主流程？
        ├─ 是 ──► 保留在组件或 hook 主文件
        │
        └─ 否
             │
             ▼
它是否有稳定复用、复杂逻辑、外部协议或测试边界？
        ├─ 否 ──► 内联、合并类型、保留局部字面量或删除重复兜底
        │
        └─ 是
             │
             ▼
按职责放置
        ├─ 源文件专属纯逻辑 ─► {源文件}.util.ts
        ├─ 目录级共享纯逻辑 ─► util.ts
        ├─ 可复用固定配置 ─► enum.ts
        ├─ 类型 ───────► 项目类型规范；无项目约束时用 {源文件名}.d.ts
        └─ 单次引用常量 ─► 使用处
```

## 纯函数

满足这些条件时，只能说明它是抽离候选；是否真的抽离，还要先判断收益：

- 不调用 React hook。
- 不读取组件或 hook 内部 state、ref、context、dispatch。
- 不调用 setState。
- 不依赖 DOM 实例、事件对象或组件生命周期。
- 输入由参数完整提供。
- 输出只由输入决定，或只做确定性的解析、构造、过滤、比较、格式化。

如果函数虽然写在组件里，但只是因为要读 `props` 或 `state`，且可以通过参数完整传入，通常应该抽离，让组件只负责把参数传进去。

抽离后必须降低阅读成本。抽离出来的方法要有值得命名的复杂逻辑、复用价值或明确业务边界。只被调用一次、函数体只是简单字段映射、`typeof` 判断、一次性 type guard、包装已有工具函数、类型转换或空值兜底的薄 helper，不应该为了满足“纯函数放 util”而新增函数。

如果函数必须直接操作 `setState`、读取 ref、处理事件对象、关闭弹窗、发起当前组件副作用，通常保留在组件或 hook 主文件里。

## 静态常量

满足这些条件，且存在多处引用、稳定复用或明确外部边界时，才抽到同目录 `enum.ts`：

- 文件顶层定义的 UI 宽高、间距、最大数量、延迟时间、阈值。
- 字符串 ID 前缀、storage key、metadata key、tool name、agent id。
- 正则表达式、静态白名单、静态状态集合。
- 多处分支复用的固定 label、mode、type、status。

`enum.ts` 可以承载语义化 `const`、`Set`、正则和真正的 `enum`，但只承载值得共享或表达明确边界的值。不要为了文件名叫 enum 就把所有值强行改成 TypeScript `enum`。

只在 JSX 里出现一次且读起来就是样式本身的 Tailwind className，不需要常量化。`setTimeout(..., 100)` 这类单次 UI 行为参数也不需要抽成 `chatCopyButtonCopiedResetDelayMs`。

## 类型放置

先读取项目规范、同目录既有文件和上层模块约定，再决定类型落点。类型剥离的目标是让 React 主文件更聚焦，不是强制制造额外文件。

项目明确规定组件 props、hook 参数、模块共享 view model、API DTO 或全局声明的类型文件位置 / 命名时，按项目规定处理。例如可以是组件目录 `types.ts`、模块级 `types.ts`、`<api-file>.types.ts`、`src/types/*.d.ts` 或其他项目约定位置。

项目没有类型文件约束时，才把从单个业务 `.ts` / `.tsx` 源文件剥离出的类型放到同目录 `{源文件名}.d.ts`，例如 `ExampleList.tsx` 对应 `ExampleList.d.ts`，`useExampleSelection.ts` 对应 `useExampleSelection.d.ts`。导入时使用 `import type`。

不要为了单个源文件新增或复用与项目规范冲突的泛化 `types.ts`、`type.ts`、`*.types.ts`、模块级类型收集文件。已经存在的历史类型文件只在处理范围外保持不动；本次 DDT 触碰到并需要剥离的类型，按项目规范或无约束 fallback 处理。

如果项目惯例允许很小的局部 props 类型贴在组件文件内，且该类型没有复用价值、不会压重主流程，可以保留在组件文件内。

API 请求参数、响应 DTO 和数据库结构不要放 React 组件目录的类型文件；如果当前任务触碰的是 API 或后台业务源文件，先遵守对应项目 API / 后台类型规范，项目无约束时才按对应源文件的 `{源文件名}.d.ts` fallback 处理。

跨模块稳定复用的类型不要放局部 `types.ts`，要进入项目既有公共类型位置。

## 执行步骤

审查当前改动时，先列出所有被改到的 React hook、React 组件和 `.tsx` 文件，再按文件逐个检查。

对每个文件先找顶层 `const`、`function`、`type`、`interface`。先判断它们是否属于 React 主流程，再判断拆分是否有真实收益。确认值得拆分后，源文件专属纯函数移到 `{源文件}.util.ts`，目录级共享纯函数移到 `util.ts`，可复用静态常量移到 `enum.ts`，类型按项目类型规范移动；项目无约束时使用 `{源文件名}.d.ts`。

移动后更新 import。`import` 和 `import type` 不能从同一路径拆成重复导入，必须合并。类型导入使用 `import type`。

移动后检查循环引用。`{源文件}.util.ts` 和 `util.ts` 可以 import 类型文件和 `enum.ts`，组件可以 import 工具文件、`enum.ts` 和项目规定的类型文件；项目无约束时可以 import 同名 `.d.ts` 类型文件。不要让类型文件反向 import 组件，也不要让 `enum.ts` import React 组件。

保留的方法需要简短 JSDoc；如果 JSDoc 只能复述函数名或表面行为，优先判断该方法是否过度封装并内联。复杂纯逻辑里的关键业务判断保留行内注释。

最后运行最小必要验证。默认至少对受影响文件跑 ESLint，再按任务影响补类型检查、i18n 验证或页面手动验证。

## 反模式

- `ExamplePanel.tsx` 顶层同时定义面板尺寸常量和 `buildSelectedSummary()`。
- `ExampleList.tsx` 顶层定义不读取组件 state、ref 或生命周期的 `buildInitialRange()`。
- `useExampleSelection.ts` 里定义不读取 hook state 的 `isSameSelection()`。
- `util.ts` 里新增只被调用一次、函数体只是包装已有工具函数的 helper。
- `index.tsx` 的专属纯函数被抽到目录级 `util.ts`，但项目规范要求源文件专属工具函数放到 `{源文件}.util.ts`；例如只服务 `BackendExecTool/index.tsx` 的工具函数应放到 `BackendExecTool/index.util.ts`，不是 `BackendExecTool/util.ts`。
- 组件文件里塞入很长的 props、映射结构或复用类型，而项目规范要求这类类型放到独立类型文件。
- hook 主文件里定义复杂参数 interface，而项目已有 hook 类型统一放置位置。
- TSX 里散落多处同语义 ID 前缀、storage key、mode 或 status。
- `enum.ts` 里新增只被一个地方 import 的 UI 延迟、阈值或 tool name。

## 示例

单次长度比较不需要抽成 util 函数：

```tsx
export function useExampleSelection(params: UseExampleSelectionParams) {
  const allSelected = useMemo(
    () => params.selectedIds.length === params.allIds.length,
    [params.selectedIds, params.allIds],
  )

  return { allSelected }
}
```

只有一个调用点的 UI 延迟时间直接放在使用处：

```tsx
const handleCopy = () => {
  setCopied(true)
  window.setTimeout(() => setCopied(false), 100)
}
```

确实值得抽离、且只服务 `ExampleList.tsx` 的纯构造逻辑放到 `ExampleList.util.ts`：

```ts
/** 根据外部传入值构造初始范围；空值不生成范围。 */
export function buildInitialRange(value?: string): { start: string; end: string } | null {
  const trimmedValue = value?.trim()

  if (!trimmedValue) return null

  return {
    start: `${trimmedValue}-start`,
    end: `${trimmedValue}-end`,
  }
}
```

## 输出

如果用户要求直接修，就完成文件移动和 import 更新后再回复结果。

如果用户要求 review，就按文件指出哪些纯函数、常量和类型放错了位置，并给出最小修改建议。不要泛泛评价组件复杂度。

回复里说明验证结果。没有跑浏览器手动验证时，要明确说没有跑。
