# Node.js 后台 DDT

Node.js 后台 DDT 用来审查 service、logic、query、controller、repository、job、tool、API DTO、数据库类型和枚举常量里的过度包装与职责放置错误。

## 项目规范优先

先读取仓库的 `CLAUDE.md`、`AGENTS.md` 和相关模块说明，再检查这些常见规范是否被破坏：

- service 查询和变更职责是否拆分清楚。
- 复杂业务是否进入 `logic/`。
- 类型是否按项目类型文件规则放置；项目没有约束时，业务 TS 源文件剥离出的类型才放到同目录 `{源文件名}.d.ts`。
- 业务数字、状态值、类型值、开关值、任务值是否按项目要求进入 `enum/**`。
- 数据库读写是否优先使用 Kysely。
- SQL 别名是否具备可读性。
- static 方法内是否显式用类名调用同类 static 方法。
- 导入是否合并。
- 导出函数和 class static 方法是否有简短 JSDoc。

注意：状态值、类型值、开关值、任务值必须先抽到 `enum/**` 或项目约定的枚举位置。不要把单次 UI 延迟、尺寸、展示阈值这类非业务字面量误判成业务枚举。

## 后台判断图

```text
看到后台文件里的函数 / 类型 / enum / query / service / logic 层
        │
        ▼
它是否承载明确分层职责？
        ├─ 是 ──► 保留，并检查命名、JSDoc 和依赖方向
        │
        └─ 否
             │
             ▼
它是否只是透传、改名、薄包装或单点字面量搬家？
        ├─ 是 ──► 收回到调用处或更直接的边界
        │
        └─ 否
             │
             ▼
它是否被多处复用、需要独立测试或表达外部协议？
        ├─ 是 ──► 保留，并放到项目约定位置
        └─ 否 ──► 合并，缩短阅读路径
```

## service / logic / query

service 层负责用例编排和事务边界，不要只做一层透传。如果某个 service 方法只是把参数原样传给 query 或 logic，且没有权限、事务、缓存、审计、组合多个依赖或稳定业务语义，默认属于无收益中间层。

logic 层适合承载复杂业务规则、状态流转、跨实体计算和需要独立测试的流程。只有几行字段映射、一次简单判断、一次字符串解析或一次 Kysely 查询，不要为了“复杂业务放 logic”机械新增 logic 文件。

query / repository 层适合承载数据库读写边界。单个简单查询是否保留独立方法，要看它是否被复用、是否表达稳定业务查询、是否隐藏了必要的数据库细节。只服务一个调用方且方法名只是复述 SQL 的薄 query，可以考虑收回到更直接的位置，但不能破坏项目强制的数据访问规范。

controller / route handler 不应该塞复杂业务计算；但也不必把两三行参数读取和响应构造拆成 helper。只有解析、校验、鉴权、业务处理或响应构造开始压重主流程时，才拆到合适层。

## 函数与方法

下面这些默认倾向内联：

- 只有一个调用方的 2 到 5 行 helper。
- 只做字段拷贝、取值改名、一次 `map`、一次字符串判断、一次 `parseInt()` 的方法。
- 名字只是 `parseX`、`buildX`、`normalizeX`、`rememberX`、`toX`，调用者仍要点进去看细节。
- getter、selector、mapper、convert 风格的方法，本质上只包一层取值或透传。

下面这些倾向保留：

- 被多个后台入口稳定复用。
- 承载明确业务动作、状态流转或外部协议解析。
- 逻辑长到会压坏调用方主流程。
- 需要独立测试、独立注释或独立错误处理。

class 内部如果只是把 `this.db`、`this.model`、`this.flashModel`、`this.config` 等实例属性读出来再沿私有方法传下去，默认让目标方法直接读取实例属性。只有参数来自当前调用现场、每次调用按分支变化，或方法需要脱离实例复用时才保留参数。

static 方法内部调用同类 static 方法时，按项目规范显式使用类名，例如 `AgentQuery.getList()`，不要用 `this.getList()` 制造继承语义。

## 类型与 DTO

API 请求参数、响应 DTO、数据库行结构、事件载荷、消息体和外部 SDK 数据结构属于边界类型，应该按项目约定放到类型文件或接口层位置。

业务 `.ts` 源文件如果需要剥离类型，先读取项目类型文件规则、同目录既有模式和上层模块约定。项目有规定时按项目规定，例如 `types.ts`、`<api-file>.types.ts`、`src/types/*.d.ts` 或其他约定位置；项目没有规定时，才使用同目录 `{源文件名}.d.ts`，例如 `agent.service.ts` 对应 `agent.service.d.ts`，`agent.query.ts` 对应 `agent.query.d.ts`。不要为单个业务源文件新建和项目规则冲突的泛化类型收集文件。

只服务一个父类型、只是一层别名、摘字段、改名或内部中间形态的薄类型，默认合并。不要让读者为了理解一个数据库返回体跳转三四个类型。

跨模块稳定复用的类型不要偷放到局部文件；只在一个 service 内部使用的很小中间结构也不要机械提升到全局类型目录。

绝对禁止使用 `any`、`unknown`、`as any`、`as unknown as ...` 处理类型问题。类型修复必须通过补齐参数类型、返回值类型、表结构类型、请求 / 响应类型、类型守卫或更准确的类型定义完成。

## enum、常量和业务数字

业务状态值、类型值、开关值、任务值、外部协议 mode、跨多处分支复用的固定 key，必须进入项目约定的 `enum/**` 或常量位置。

只有一处引用，且上下文能清楚表达含义的非业务字面量，默认直接留在使用处。比如 UI 延迟、尺寸、展示阈值、局部循环上限，如果不属于状态值、类型值、开关值或任务值，就不要为了形式新增 enum。

只有一处引用且不属于业务语义的延迟时间、阈值、固定 key、tool name、mode、status，不要新增顶层常量或 enum 文件。常量抽离是为了消除散落配置或表达共享边界，不是把单点字面量变成间接引用。

## 兜底和错误处理

外部输入来自用户、网络、数据库、外部 SDK、历史脏数据或异步边界时，保留必要校验和兜底。

状态已经由生命周期、事件顺序、状态变量或类型定义保证时，删除重复兜底。重复防御会让读者误以为存在未说明的异常路径。

缺少兜底会造成明确错误或数据损坏时，保留并用简短注释说明原因。不要用“更稳”作为保留无路径兜底的理由。

## Kysely 与 SQL

优先使用项目既有 Kysely 表类型和查询模式。不要为了 DDT 把项目要求放在 query 层的 SQL 移到任意 service 文件里。

SQL 别名要可读。别名如果只为绕过类型问题或缩短几字符，反而降低理解成本，应调整为能表达业务含义的名字。

查询 builder 链路里只出现一次的短条件，不必强行抽成 helper。多处重复的复杂 where、join 或字段集合，可以抽成有业务名的构造函数或 query 方法。

## 示例

单次小 helper 应内联：

```ts
const labels = toolList.map((tool) => tool.label)
```

薄类型应合并成直接边界：

```ts
export type AgentMessageData = {
  id: string
  parent_id: string | null
  label: string
  status: string
  title?: string
  outputs?: {
    structured_output?: Record<string, string>
    answer_text?: string
  }
}

export type DifyMsgSSERes = {
  event: string
  data: AgentMessageData
}
```

单点非业务字面量不必机械新增 enum：

```ts
window.setTimeout(() => {
  retry()
}, 100)
```

如果 `0` / `1` 表达 `doDelete`、状态、类型、开关或任务含义，则不要内联，要按项目规范抽到 `enum/**`。

实例属性不要沿私有方法绕传：

```ts
async streamEvents() {
  const workflow = await this.createGraph();
  return await workflow.streamEvents();
}

private async createGraph() {
  const defaultAgent = await this.createDefaultAgent();
  return new StateGraph().addNode("default", defaultAgent.graph).compile();
}

private async createDefaultAgent() {
  const model = await this.flashModel;
  return createAgent({ model });
}
```

## 输出

直接修代码时，完成分层调整、类型移动、import 合并和最小验证后再回复。

做 review 时，按文件列出 DDT 问题、原因和最小修法。不要把项目规范允许或强制的分层误判成过度封装。
